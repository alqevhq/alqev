import { DocumentClassification, DocumentType } from "./types";

const PHOTO_WORDS = [
  "biyometrik fotoğraf",
  "biometric photo",
  "passport photo",
  "vesikalık",
  "vesikalik",
];

const EXPECTED_TYPE_RULES: Array<{
  words: string[];
  type: DocumentType;
}> = [
  {
    words: ["pasaport", "passport", "reisepass"],
    type: "passport",
  },
  {
    words: ["kimlik", "ausweis", "identity card", "national id"],
    type: "national_id",
  },
  {
    words: ["oturum", "residence permit", "aufenthaltstitel"],
    type: "residence_permit",
  },
  {
    words: PHOTO_WORDS,
    type: "biometric_photo",
  },
  {
    words: ["sağlık sigortası", "health insurance", "krankenversicherung"],
    type: "health_insurance",
  },
  {
    words: ["adres", "address proof", "meldebescheinigung"],
    type: "address_proof",
  },
  {
    words: ["maaş", "payslip", "lohnabrechnung", "gehaltsabrechnung"],
    type: "payslip",
  },
  {
    words: ["iş sözleşmesi", "employment contract", "arbeitsvertrag"],
  type: "employment_contract",
},
{
  words: [
    "banka",
    "bank",
    "kontoauszug",
    "bank statement",
  ],
  type: "bank_statement",
},
{
  words: [
    "doğum belgesi",
    "birth certificate",
    "geburtsurkunde",
  ],
  type: "birth_certificate",
},
{
  words: [
    "evlilik cüzdanı",
    "marriage certificate",
    "heiratsurkunde",
  ],
  type: "marriage_certificate",
},
];

export function inferExpectedDocumentType(
  expectedDocumentTitle?: string,
): DocumentClassification | null {
  const normalized = expectedDocumentTitle?.trim().toLocaleLowerCase("tr-TR");

  if (!normalized) {
    return null;
  }

  for (const rule of EXPECTED_TYPE_RULES) {
    if (rule.words.some((word) => normalized.includes(word))) {
      return {
        documentType: rule.type,
        confidence: 0.9,
        reason: `Belge başlığı "${expectedDocumentTitle}" olarak tanımlandı.`,
      };
    }
  }

  return null;
}

export function shouldSkipTextOcr(documentType: DocumentType): boolean {
  return documentType === "biometric_photo";
}