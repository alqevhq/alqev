import type {
  DocumentExpiryStatus,
  DocumentIntelligence,
  DocumentIntelligenceWarning,
  DocumentMatchStatus,
  ExtractedDocumentData,
  ExtractedField,
} from "./types";

export interface OcrInput {
  processId: string;
  documentKey: string;
  documentTitle: string;
  fileName?: string;
  fileUrl: string;
  contentType?: string;
}

export interface OcrProviderResult {
  rawText: string;
  documentType?: string;
  fields?: ExtractedField[];
  intelligence?: Partial<DocumentIntelligence>;
}

export interface OcrProvider {
  extract(input: OcrInput): Promise<OcrProviderResult>;
}

type FieldCandidate = {
  key: string;
  label: string;
  value: string;
  confidence: number;
};

type MrzPassportData = {
  surname?: string;
  givenNames?: string;
  passportNumber?: string;
  nationality?: string;
  birthDate?: string;
  sex?: string;
  expiryDate?: string;
};

export async function runOcr(
  provider: OcrProvider,
  input: OcrInput,
): Promise<ExtractedDocumentData> {
  validateOcrInput(input);

  const result = await provider.extract(input);

  if (!result || typeof result.rawText !== "string") {
    throw new Error(
      "OCR sağlayıcısı geçerli bir metin sonucu döndürmedi.",
    );
  }

  const rawText = normalizeRawText(result.rawText);

  if (!rawText.trim()) {
    throw new Error(
      "Belgeden okunabilir bir metin çıkarılamadı.",
    );
  }

  const detectedFields =
    result.fields && result.fields.length > 0
      ? normalizeExtractedFields(result.fields)
      : extractCommonFields(rawText);

  const intelligence = normalizeIntelligence(
    result.intelligence,
    {
      rawText,
      documentTitle: input.documentTitle,
      documentType:
        result.documentType?.trim() || "unknown",
      fields: detectedFields,
    },
  );

  return {
    processId: input.processId,
    documentKey: input.documentKey,
    documentTitle: input.documentTitle,
    fileName: input.fileName,
    fileUrl: input.fileUrl,
    contentType: input.contentType,
    rawText,
    fields: detectedFields,
    intelligence,
  };
}

export function extractCommonFields(
  rawText: string,
): ExtractedField[] {
  const normalizedText = normalizeRawText(rawText);
  const candidates: FieldCandidate[] = [];

  candidates.push(
    ...extractLabelBasedFields(normalizedText),
  );
  candidates.push(...extractMrzFields(normalizedText));

  return removeDuplicateFields(candidates).map(
    (field) => ({
      key: field.key,
      label: field.label,
      value: field.value,
      confidence: field.confidence,
    }),
  );
}

function normalizeIntelligence(
  intelligence: Partial<DocumentIntelligence> | undefined,
  fallback: {
    rawText: string;
    documentTitle: string;
    documentType: string;
    fields: ExtractedField[];
  },
): DocumentIntelligence {
  const mrzDetected =
    typeof intelligence?.mrzDetected === "boolean"
      ? intelligence.mrzDetected
      : /P<[A-Z0-9<]{2,}/.test(
          fallback.rawText.toUpperCase(),
        );

  const qualityScore = normalizeScore(
    intelligence?.qualityScore,
    calculateFallbackQuality(
      fallback.rawText,
      fallback.fields,
    ),
  );

  const isReadable =
    typeof intelligence?.isReadable === "boolean"
      ? intelligence.isReadable
      : qualityScore >= 40 &&
        fallback.rawText.length >= 20;

  const documentMatch =
    normalizeDocumentMatch(
      intelligence?.documentMatch,
    ) ||
    inferDocumentMatch(
      fallback.documentTitle,
      fallback.documentType,
    );

  const expiryStatus =
    normalizeExpiryStatus(
      intelligence?.expiryStatus,
    ) ||
    inferExpiryStatus(fallback.fields);

  const warnings = normalizeWarnings(
    intelligence?.warnings,
  );

  const risks = normalizeWarnings(
    intelligence?.risks,
  );

  if (!isReadable && warnings.length === 0) {
    warnings.push({
      code: "LOW_READABILITY",
      severity: "warning",
      message:
        "Belge yeterince okunaklı görünmüyor. Daha net bir kopya yükleyin.",
    });
  }

  if (
    documentMatch === "mismatch" &&
    risks.length === 0
  ) {
    risks.push({
      code: "DOCUMENT_MISMATCH",
      severity: "critical",
      message:
        "Yüklenen belge, beklenen belge türüyle eşleşmiyor olabilir.",
    });
  }

  if (
    expiryStatus === "expired" &&
    risks.every(
      (item) => item.code !== "DOCUMENT_EXPIRED",
    )
  ) {
    risks.push({
      code: "DOCUMENT_EXPIRED",
      severity: "critical",
      message: "Belgenin geçerlilik tarihi geçmiş.",
    });
  }

  return {
    documentType:
      intelligence?.documentType?.trim() ||
      fallback.documentType,
    documentMatch,
    qualityScore,
    isReadable,
    mrzDetected,
    expiryStatus,
    summary:
      intelligence?.summary?.trim() ||
      buildFallbackSummary({
        documentType: fallback.documentType,
        documentMatch,
        qualityScore,
        expiryStatus,
      }),
    nextAction:
      intelligence?.nextAction?.trim() ||
      buildFallbackNextAction({
        isReadable,
        documentMatch,
        expiryStatus,
      }),
    warnings,
    risks,
  };
}

function normalizeWarnings(
  value:
    | DocumentIntelligenceWarning[]
    | undefined,
): DocumentIntelligenceWarning[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (
        item,
      ): item is DocumentIntelligenceWarning =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof item.code === "string" &&
        typeof item.message === "string" &&
        (item.severity === "info" ||
          item.severity === "warning" ||
          item.severity === "critical"),
    )
    .map((item) => ({
      code: item.code.trim().slice(0, 80),
      severity: item.severity,
      message: item.message.trim().slice(0, 500),
    }))
    .filter(
      (item) =>
        item.code.length > 0 &&
        item.message.length > 0,
    )
    .slice(0, 10);
}

function normalizeDocumentMatch(
  value: unknown,
): DocumentMatchStatus | null {
  return value === "match" ||
    value === "possible_match" ||
    value === "mismatch" ||
    value === "unknown"
    ? value
    : null;
}

function normalizeExpiryStatus(
  value: unknown,
): DocumentExpiryStatus | null {
  return value === "valid" ||
    value === "expiring_soon" ||
    value === "expired" ||
    value === "not_applicable" ||
    value === "unknown"
    ? value
    : null;
}

function normalizeScore(
  value: unknown,
  fallback: number,
): number {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? Math.min(100, Math.max(0, Math.round(value)))
    : fallback;
}

function calculateFallbackQuality(
  rawText: string,
  fields: ExtractedField[],
): number {
  let score = 20;

  if (rawText.length >= 50) score += 20;
  if (rawText.length >= 200) score += 20;
  if (fields.length >= 2) score += 20;
  if (fields.length >= 5) score += 10;
  if (/P<[A-Z0-9<]{2,}/.test(rawText.toUpperCase())) {
    score += 10;
  }

  return Math.min(100, score);
}

function inferDocumentMatch(
  documentTitle: string,
  documentType: string,
): DocumentMatchStatus {
  const expected = normalizeComparableText(
    documentTitle,
  );
  const detected = normalizeComparableText(
    documentType,
  );

  if (!detected || detected === "unknown") {
    return "unknown";
  }

  const aliases: Record<string, string[]> = {
    passport: ["passport", "pasaport", "reisepass"],
    identity_card: [
      "identity",
      "identitycard",
      "kimlik",
      "personalausweis",
    ],
    residence_permit: [
      "residencepermit",
      "oturum",
      "aufenthaltstitel",
      "aufenthaltserlaubnis",
    ],
    insurance: [
      "insurance",
      "sigorta",
      "versicherung",
    ],
    bank_statement: [
      "bankstatement",
      "bank",
      "kontoauszug",
      "hesapdokumu",
    ],
  };

  const detectedAliases =
    aliases[detected] || [detected];

  return detectedAliases.some(
    (alias) =>
      expected.includes(
        normalizeComparableText(alias),
      ),
  )
    ? "match"
    : "possible_match";
}

function inferExpiryStatus(
  fields: ExtractedField[],
): DocumentExpiryStatus {
  const expiryField = fields.find(
    (field) => field.key === "expiryDate",
  );

  if (!expiryField) {
    return "unknown";
  }

  const expiryDate = parseDate(
    expiryField.value,
  );

  if (!expiryDate) {
    return "unknown";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const warningDate = new Date(today);
  warningDate.setDate(
    warningDate.getDate() + 180,
  );

  if (expiryDate < today) {
    return "expired";
  }

  if (expiryDate <= warningDate) {
    return "expiring_soon";
  }

  return "valid";
}

function parseDate(
  value: string,
): Date | null {
  const match = value
    .trim()
    .match(
      /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/,
    );

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(
    year,
    month - 1,
    day,
  );

  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : null;
}

function buildFallbackSummary(input: {
  documentType: string;
  documentMatch: DocumentMatchStatus;
  qualityScore: number;
  expiryStatus: DocumentExpiryStatus;
}): string {
  return `Belge türü: ${input.documentType}. Eşleşme: ${input.documentMatch}. Okunabilirlik puanı: ${input.qualityScore}/100. Geçerlilik durumu: ${input.expiryStatus}.`;
}

function buildFallbackNextAction(input: {
  isReadable: boolean;
  documentMatch: DocumentMatchStatus;
  expiryStatus: DocumentExpiryStatus;
}): string {
  if (!input.isReadable) {
    return "Belgenin daha net ve eksiksiz bir kopyasını yükleyin.";
  }

  if (input.documentMatch === "mismatch") {
    return "Doğru belge türünü seçtiğinizi ve doğru dosyayı yüklediğinizi kontrol edin.";
  }

  if (input.expiryStatus === "expired") {
    return "Geçerli ve güncel bir belge yükleyin.";
  }

  if (input.expiryStatus === "expiring_soon") {
    return "Belgenin yakında sona ereceğini dikkate alın ve yenileme gerekip gerekmediğini kontrol edin.";
  }

  return "Çıkarılan bilgileri kontrol edin ve doğruysa belgeyi süreçte onaylayın.";
}

function normalizeComparableText(
  value: string,
): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]/g, "");
}

function validateOcrInput(
  input: OcrInput,
): void {
  if (!input.processId.trim()) {
    throw new Error(
      "OCR için geçerli bir süreç kimliği gerekli.",
    );
  }

  if (!input.documentKey.trim()) {
    throw new Error(
      "OCR için geçerli bir belge anahtarı gerekli.",
    );
  }

  if (!input.documentTitle.trim()) {
    throw new Error(
      "OCR için belge başlığı gerekli.",
    );
  }

  if (!input.fileUrl.trim()) {
    throw new Error(
      "OCR için geçerli bir dosya adresi gerekli.",
    );
  }

  try {
    const url = new URL(input.fileUrl);

    if (
      url.protocol !== "https:" &&
      url.protocol !== "http:"
    ) {
      throw new Error();
    }
  } catch {
    throw new Error(
      "OCR dosya adresi geçerli bir URL değil.",
    );
  }
}

function normalizeRawText(
  rawText: string,
): string {
  return rawText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeExtractedFields(
  fields: ExtractedField[],
): ExtractedField[] {
  return fields
    .filter(
      (field) =>
        Boolean(field) &&
        typeof field.key === "string" &&
        typeof field.label === "string" &&
        typeof field.value === "string" &&
        field.value.trim().length > 0,
    )
    .map((field) => ({
      ...field,
      key: field.key.trim(),
      label: field.label.trim(),
      value: field.value.trim(),
      confidence: normalizeConfidence(
        field.confidence,
      ),
    }));
}

function extractLabelBasedFields(
  text: string,
): FieldCandidate[] {
  const fields: FieldCandidate[] = [];

  const patterns: Array<{
    key: string;
    label: string;
    regex: RegExp;
    confidence: number;
    transform?: (value: string) => string;
  }> = [
    {
      key: "passportNumber",
      label: "Pasaport Numarası",
      regex:
        /(?:passport\s*(?:no|number)|document\s*(?:no|number)|pasaport\s*(?:no|numarası)|belge\s*(?:no|numarası))\s*[:#-]?\s*([A-Z0-9]{5,15})/i,
      confidence: 0.82,
      transform: normalizeDocumentNumber,
    },
    {
      key: "surname",
      label: "Soyadı",
      regex:
        /(?:surname|last\s*name|family\s*name|soyadı|soyad)\s*[:#-]?\s*([A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜa-zçğıöşü' -]{1,50})/i,
      confidence: 0.78,
      transform: normalizePersonName,
    },
    {
      key: "givenNames",
      label: "Adı",
      regex:
        /(?:given\s*names?|first\s*name|name|adı|ad)\s*[:#-]?\s*([A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜa-zçğıöşü' -]{1,70})/i,
      confidence: 0.74,
      transform: normalizePersonName,
    },
    {
      key: "birthDate",
      label: "Doğum Tarihi",
      regex:
        /(?:date\s*of\s*birth|birth\s*date|geburtsdatum|doğum\s*tarihi)\s*[:#-]?\s*(\d{1,4}[./-]\d{1,2}[./-]\d{1,4})/i,
      confidence: 0.82,
      transform: normalizeDateValue,
    },
    {
      key: "expiryDate",
      label: "Geçerlilik Tarihi",
      regex:
        /(?:date\s*of\s*expiry|expiry\s*date|valid\s*until|gültig\s*bis|ablaufdatum|geçerlilik\s*tarihi|son\s*geçerlilik)\s*[:#-]?\s*(\d{1,4}[./-]\d{1,2}[./-]\d{1,4})/i,
      confidence: 0.82,
      transform: normalizeDateValue,
    },
    {
      key: "issueDate",
      label: "Düzenlenme Tarihi",
      regex:
        /(?:date\s*of\s*issue|issue\s*date|ausstellungsdatum|veriliş\s*tarihi|düzenlenme\s*tarihi)\s*[:#-]?\s*(\d{1,4}[./-]\d{1,2}[./-]\d{1,4})/i,
      confidence: 0.76,
      transform: normalizeDateValue,
    },
    {
      key: "nationality",
      label: "Uyruk",
      regex:
        /(?:nationality|staatsangehörigkeit|uyruk)\s*[:#-]?\s*([A-ZÇĞİÖŞÜa-zçğıöşü]{2,40}(?:[ -][A-ZÇĞİÖŞÜa-zçğıöşü]{2,40})?)/i,
      confidence: 0.78,
      transform: normalizeTextValue,
    },
    {
      key: "issuingCountry",
      label: "Düzenleyen Ülke",
      regex:
        /(?:issuing\s*(?:country|state)|country\s*of\s*issue|ausstellender\s*staat|düzenleyen\s*ülke)\s*[:#-]?\s*([A-ZÇĞİÖŞÜa-zçğıöşü]{2,40}(?:[ -][A-ZÇĞİÖŞÜa-zçğıöşü]{2,40})?)/i,
      confidence: 0.72,
      transform: normalizeTextValue,
    },
    {
      key: "sex",
      label: "Cinsiyet",
      regex:
        /(?:sex|gender|geschlecht|cinsiyet)\s*[:#-]?\s*(M|F|X|MALE|FEMALE|ERKEK|KADIN)/i,
      confidence: 0.78,
      transform: normalizeSex,
    },
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern.regex);

    if (!match?.[1]) {
      continue;
    }

    const transformedValue = pattern.transform
      ? pattern.transform(match[1])
      : match[1].trim();

    if (!transformedValue) {
      continue;
    }

    fields.push({
      key: pattern.key,
      label: pattern.label,
      value: transformedValue,
      confidence: pattern.confidence,
    });
  }

  return fields;
}

function extractMrzFields(
  text: string,
): FieldCandidate[] {
  const mrzData = parsePassportMrz(text);

  if (!mrzData) {
    return [];
  }

  const fields: FieldCandidate[] = [];

  addMrzCandidate(
    fields,
    "surname",
    "Soyadı",
    mrzData.surname,
    0.92,
  );
  addMrzCandidate(
    fields,
    "givenNames",
    "Adı",
    mrzData.givenNames,
    0.92,
  );
  addMrzCandidate(
    fields,
    "passportNumber",
    "Pasaport Numarası",
    mrzData.passportNumber,
    0.94,
  );
  addMrzCandidate(
    fields,
    "nationality",
    "Uyruk",
    mrzData.nationality,
    0.9,
  );
  addMrzCandidate(
    fields,
    "birthDate",
    "Doğum Tarihi",
    mrzData.birthDate,
    0.88,
  );
  addMrzCandidate(
    fields,
    "sex",
    "Cinsiyet",
    mrzData.sex,
    0.88,
  );
  addMrzCandidate(
    fields,
    "expiryDate",
    "Geçerlilik Tarihi",
    mrzData.expiryDate,
    0.9,
  );

  return fields;
}

function parsePassportMrz(
  text: string,
): MrzPassportData | null {
  const lines = text
    .split("\n")
    .map((line) =>
      line
        .toUpperCase()
        .replace(/\s/g, "")
        .replace(/[^A-Z0-9<]/g, ""),
    )
    .filter((line) => line.length >= 35);

  for (
    let index = 0;
    index < lines.length - 1;
    index += 1
  ) {
    const firstLine = lines[index];
    const secondLine = lines[index + 1];

    if (!firstLine.startsWith("P<")) {
      continue;
    }

    if (
      firstLine.length < 40 ||
      secondLine.length < 40
    ) {
      continue;
    }

    const paddedFirstLine = firstLine
      .padEnd(44, "<")
      .slice(0, 44);
    const paddedSecondLine = secondLine
      .padEnd(44, "<")
      .slice(0, 44);

    const nameSection =
      paddedFirstLine.slice(5);
    const [
      rawSurname = "",
      rawGivenNames = "",
    ] = nameSection.split("<<");

    return {
      surname: normalizeMrzName(rawSurname),
      givenNames:
        normalizeMrzName(rawGivenNames),
      passportNumber: cleanMrzValue(
        paddedSecondLine.slice(0, 9),
      ),
      nationality: cleanMrzValue(
        paddedSecondLine.slice(10, 13),
      ),
      birthDate: parseMrzDate(
        paddedSecondLine.slice(13, 19),
        "birth",
      ),
      sex: normalizeSex(
        paddedSecondLine.slice(20, 21),
      ),
      expiryDate: parseMrzDate(
        paddedSecondLine.slice(21, 27),
        "expiry",
      ),
    };
  }

  return null;
}

function parseMrzDate(
  value: string,
  type: "birth" | "expiry",
): string | undefined {
  if (!/^\d{6}$/.test(value)) {
    return undefined;
  }

  const shortYear = Number(value.slice(0, 2));
  const month = Number(value.slice(2, 4));
  const day = Number(value.slice(4, 6));

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return undefined;
  }

  const currentYear = new Date().getFullYear();
  const currentCentury =
    Math.floor(currentYear / 100) * 100;

  let fullYear: number;

  if (type === "expiry") {
    fullYear = currentCentury + shortYear;

    if (fullYear < currentYear - 20) {
      fullYear += 100;
    }
  } else {
    fullYear = currentCentury + shortYear;

    if (fullYear > currentYear) {
      fullYear -= 100;
    }
  }

  return `${String(day).padStart(
    2,
    "0",
  )}.${String(month).padStart(
    2,
    "0",
  )}.${fullYear}`;
}

function addMrzCandidate(
  fields: FieldCandidate[],
  key: string,
  label: string,
  value: string | undefined,
  confidence: number,
): void {
  if (!value?.trim()) {
    return;
  }

  fields.push({
    key,
    label,
    value: value.trim(),
    confidence,
  });
}

function removeDuplicateFields(
  candidates: FieldCandidate[],
): FieldCandidate[] {
  const fieldsByKey =
    new Map<string, FieldCandidate>();

  for (const candidate of candidates) {
    const normalizedCandidate = {
      ...candidate,
      value: candidate.value.trim(),
      confidence: normalizeConfidence(
        candidate.confidence,
      ),
    };

    if (!normalizedCandidate.value) {
      continue;
    }

    const existing = fieldsByKey.get(
      normalizedCandidate.key,
    );

    if (
      !existing ||
      normalizedCandidate.confidence >
        existing.confidence
    ) {
      fieldsByKey.set(
        normalizedCandidate.key,
        normalizedCandidate,
      );
    }
  }

  return Array.from(fieldsByKey.values());
}

function normalizeConfidence(
  value: number | undefined,
): number {
  if (
    typeof value !== "number" ||
    Number.isNaN(value)
  ) {
    return 0.5;
  }

  return Math.min(1, Math.max(0, value));
}

function normalizeDocumentNumber(
  value: string,
): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();
}

function normalizePersonName(
  value: string,
): string {
  return value
    .replace(/[<]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleUpperCase("tr-TR");
}

function normalizeMrzName(
  value: string,
): string | undefined {
  const normalized = value
    .replace(/</g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized
    ? normalized.toLocaleUpperCase("tr-TR")
    : undefined;
}

function normalizeTextValue(
  value: string,
): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeSex(
  value: string,
): string {
  const normalized =
    value.trim().toUpperCase();

  if (
    normalized === "M" ||
    normalized === "MALE" ||
    normalized === "ERKEK"
  ) {
    return "Erkek";
  }

  if (
    normalized === "F" ||
    normalized === "FEMALE" ||
    normalized === "KADIN"
  ) {
    return "Kadın";
  }

  if (
    normalized === "X" ||
    normalized === "<"
  ) {
    return "Belirtilmemiş";
  }

  return value.trim();
}

function normalizeDateValue(
  value: string,
): string {
  const parts =
    value.trim().split(/[./-]/);

  if (parts.length !== 3) {
    return value.trim();
  }

  let year: string;
  let month: string;
  let day: string;

  if (parts[0].length === 4) {
    year = parts[0];
    month = parts[1];
    day = parts[2];
  } else {
    day = parts[0];
    month = parts[1];
    year = parts[2];
  }

  if (year.length === 2) {
    const shortYear = Number(year);
    const currentShortYear =
      new Date().getFullYear() % 100;

    year = String(
      shortYear > currentShortYear
        ? 1900 + shortYear
        : 2000 + shortYear,
    );
  }

  return `${day.padStart(
    2,
    "0",
  )}.${month.padStart(
    2,
    "0",
  )}.${year}`;
}

function cleanMrzValue(
  value: string,
): string | undefined {
  const cleaned =
    value.replace(/</g, "").trim();

  return cleaned || undefined;
}