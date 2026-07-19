import type {
  ExtractedDocumentData,
  SmartFormField,
} from "./types";

export function buildSmartFormFields(
  documents: ExtractedDocumentData[],
): SmartFormField[] {
  const fieldMap = new Map<
    string,
    SmartFormField
  >();

  for (const document of documents) {
    for (const field of document.fields) {
      const current = fieldMap.get(field.key);

      if (
        !current ||
        field.confidence > current.confidence
      ) {
        fieldMap.set(field.key, {
          key: field.key,

          label: field.label,

          value: field.value,

          confidence: field.confidence,

          source: document.documentTitle,
        });
      }
    }
  }

  return Array.from(fieldMap.values()).sort(
    (a, b) => b.confidence - a.confidence,
  );
}

export function applySmartFormFields<
  T extends Record<string, string>,
>(
  currentValues: T,
  suggestions: SmartFormField[],
): T {
  const result = {
    ...currentValues,
  };

  for (const suggestion of suggestions) {
    if (
      suggestion.key in result &&
      !result[suggestion.key]
    ) {
      result[
        suggestion.key as keyof T
      ] = suggestion.value as T[keyof T];
    }
  }

  return result;
}

export function findField(
  fields: SmartFormField[],
  key: string,
): SmartFormField | undefined {
  return fields.find(
    (field) => field.key === key,
  );
}

export function hasSuggestion(
  fields: SmartFormField[],
  key: string,
): boolean {
  return fields.some(
    (field) => field.key === key,
  );
}

export function getConfidenceColor(
  confidence: number,
): "high" | "medium" | "low" {
  if (confidence >= 0.9) {
    return "high";
  }

  if (confidence >= 0.7) {
    return "medium";
  }

  return "low";
}