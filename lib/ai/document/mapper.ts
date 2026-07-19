import {
  DOCUMENT_TYPES,
  DocumentField,
  DocumentFieldValue,
  DocumentType,
  DocumentWarning,
  ProviderDocumentResponse,
} from "./types";

const DEFAULT_CONFIDENCE = 0.5;

export function normalizeProviderResponse(
  value: ProviderDocumentResponse,
): {
  documentType: DocumentType;
  classificationConfidence: number;
  classificationReason: string;
  rawText: string;
  fields: DocumentField[];
  warnings: DocumentWarning[];
} {
  return {
    documentType: normalizeDocumentType(value.documentType),
    classificationConfidence: normalizeConfidence(
      value.classificationConfidence,
    ),
    classificationReason: normalizeString(
      value.classificationReason,
    ),
    rawText: normalizeString(value.rawText),
    fields: normalizeFields(value.fields),
    warnings: normalizeWarnings(value.warnings),
  };
}

export function fieldsToRecord(
  fields: DocumentField[],
): Record<string, DocumentFieldValue> {
  return Object.fromEntries(
    fields
      .filter(
        (field) =>
          Boolean(field.key) &&
          field.value !== null,
      )
      .map((field) => [field.key, field.value]),
  );
}

function normalizeDocumentType(value: unknown): DocumentType {
  if (typeof value !== "string") {
    return "unknown";
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  return DOCUMENT_TYPES.includes(normalized as DocumentType)
    ? (normalized as DocumentType)
    : "unknown";
}

function normalizeConfidence(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_CONFIDENCE;
  }

  return Math.min(1, Math.max(0, value));
}

function normalizeFields(value: unknown): DocumentField[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const result: DocumentField[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const field = item as Record<string, unknown>;

    const key = normalizeKey(field.key);
    const fieldValue = normalizeFieldValue(field.value);

    if (!key || fieldValue === null || seen.has(key)) {
      continue;
    }

    const label =
      normalizeString(field.label) ||
      createLabelFromKey(key);

    seen.add(key);

    result.push({
      key,
      label,
      value: fieldValue,
      confidence: normalizeConfidence(field.confidence),
    });
  }

  return result;
}

function normalizeWarnings(value: unknown): DocumentWarning[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object",
    )
    .map((item) => {
      const severity =
        item.severity === "info" ||
        item.severity === "warning" ||
        item.severity === "error"
          ? item.severity
          : "warning";

      return {
        code:
          typeof item.code === "string" &&
          item.code.trim().length > 0
            ? (item.code.trim() as DocumentWarning["code"])
            : "UNKNOWN",
        message:
          normalizeString(item.message) ||
          "Belge için bir uyarı oluştu.",
        severity,
        fieldKey:
          normalizeString(item.fieldKey) || undefined,
      };
    });
}

function normalizeFieldValue(
  value: unknown,
): DocumentFieldValue {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  return null;
}

function normalizeString(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizeKey(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const normalizedValue = value
    .trim()
    .replace(/ß/g, "ss")
    .replace(/ẞ/g, "SS")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return normalizedValue
    .replace(/[^a-zA-Z0-9_-]/g, " ")
    .trim()
    .replace(/[\s_-]+(.)?/g, (
      _,
      character: string | undefined,
    ) =>
      character ? character.toUpperCase() : "",
    )
    .replace(/^./, (character) =>
      character.toLowerCase(),
    );
}

function createLabelFromKey(key: string): string {
  const label = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();

  if (!label) {
    return "Field";
  }

  return label
    .split(/\s+/)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1),
    )
    .join(" ");
}