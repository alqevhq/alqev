import {
  DocumentField,
  DocumentType,
  DocumentValidation,
  DocumentWarning,
} from "./types";
import { getExpectedFieldKeys } from "./extractor";

const REQUIRED_FIELDS: Partial<Record<DocumentType, string[]>> = {
  passport: ["surname", "givenNames", "passportNumber", "expiryDate"],
  national_id: ["surname", "givenNames", "documentNumber"],
  residence_permit: ["surname", "givenNames", "documentNumber", "expiryDate"],
  address_proof: ["fullName", "address"],
  payslip: ["employeeName", "period"],
};

export function validateDocument(
  documentType: DocumentType,
  fields: DocumentField[],
  existingWarnings: DocumentWarning[] = [],
): DocumentValidation {
  const warnings = [...existingWarnings];

  if (documentType === "unknown") {
    warnings.push({
      code: "UNSUPPORTED_DOCUMENT",
      severity: "warning",
      message: "Belge türü güvenilir şekilde belirlenemedi.",
    });
  }

  if (documentType === "biometric_photo") {
    warnings.push({
      code: "NO_TEXT_EXPECTED",
      severity: "info",
      message: "Biyometrik fotoğraf için metin OCR analizi gerekli değildir.",
    });

    return {
      isValid: !warnings.some((warning) => warning.severity === "error"),
      warnings: deduplicateWarnings(warnings),
    };
  }

  const fieldMap = new Map(fields.map((field) => [field.key, field]));
  const required = REQUIRED_FIELDS[documentType] ?? [];

  for (const key of required) {
    if (!fieldMap.has(key)) {
      warnings.push({
        code: "MISSING_REQUIRED_FIELD",
        severity: "warning",
        fieldKey: key,
        message: `Beklenen "${key}" alanı belgede okunamadı.`,
      });
    }
  }

  const expiryDate = fieldMap.get("expiryDate")?.value;

  if (typeof expiryDate === "string") {
    const expiryWarning = validateExpiryDate(expiryDate);
    if (expiryWarning) {
      warnings.push(expiryWarning);
    }
  }

  const expectedFields = getExpectedFieldKeys(documentType);

  if (expectedFields.length > 0 && fields.length === 0) {
    warnings.push({
      code: "UNREADABLE_TEXT",
      severity: "error",
      message: "Belgeden okunabilir alan çıkarılamadı.",
    });
  }

  return {
    isValid: !warnings.some((warning) => warning.severity === "error"),
    warnings: deduplicateWarnings(warnings),
  };
}

function validateExpiryDate(value: string): DocumentWarning | null {
  const date = parseDate(value);

  if (!date) {
    return null;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const daysUntilExpiry = Math.ceil(
    (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysUntilExpiry < 0) {
    return {
      code: "EXPIRED_DOCUMENT",
      severity: "error",
      fieldKey: "expiryDate",
      message: "Belgenin geçerlilik süresi dolmuş.",
    };
  }

  if (daysUntilExpiry <= 180) {
    return {
      code: "EXPIRING_SOON",
      severity: "warning",
      fieldKey: "expiryDate",
      message: `Belgenin geçerlilik süresi yaklaşık ${daysUntilExpiry} gün içinde dolacak.`,
    };
  }

  return null;
}

function parseDate(value: string): Date | null {
  const normalized = value.trim();

  const dayFirst = normalized.match(
    /^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/,
  );

  if (dayFirst) {
    const [, day, month, year] = dayFirst;

    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
    );

    return Number.isNaN(date.getTime()) ? null : date;
  }

  const iso = normalized.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
  );

  if (iso) {
    const [, year, month, day] = iso;

    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
    );

    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function deduplicateWarnings(
  warnings: DocumentWarning[],
): DocumentWarning[] {
  const seen = new Set<string>();

  return warnings.filter((warning) => {
    const id = `${warning.code}:${warning.fieldKey ?? ""}:${warning.message}`;

    if (seen.has(id)) {
      return false;
    }

    seen.add(id);

    return true;
  });
}