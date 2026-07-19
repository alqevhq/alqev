import type {
  DocumentComparisonIssue,
  ExtractedDocumentData,
} from "./types";

function normalizeValue(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ");
}

export function compareDocuments(
  documents: ExtractedDocumentData[],
): DocumentComparisonIssue[] {
  const valuesByField = new Map<
    string,
    {
      label: string;
      documentKey: string;
      documentTitle: string;
      value: string;
    }[]
  >();

  for (const document of documents) {
    for (const field of document.fields) {
      const currentValues =
        valuesByField.get(field.key) ?? [];

      currentValues.push({
        label: field.label,
        documentKey: document.documentKey,
        documentTitle: document.documentTitle,
        value: field.value,
      });

      valuesByField.set(
        field.key,
        currentValues,
      );
    }
  }

  const issues: DocumentComparisonIssue[] = [];

  for (const [fieldKey, values] of valuesByField) {
    if (values.length < 2) {
      continue;
    }

    const uniqueValues = new Set(
      values.map((item) =>
        normalizeValue(item.value),
      ),
    );

    if (uniqueValues.size <= 1) {
      continue;
    }

    issues.push({
      id: `mismatch-${fieldKey}`,

      fieldKey,

      label: values[0].label,

      values: values.map((item) => ({
        documentKey: item.documentKey,
        documentTitle: item.documentTitle,
        value: item.value,
      })),

      severity: "warning",

      message: `${values[0].label} bilgisi belgeler arasında uyuşmuyor.`,
    });
  }

  return issues;
}

export function hasDocumentMismatch(
  documents: ExtractedDocumentData[],
): boolean {
  return compareDocuments(documents).length > 0;
}

export function compareSingleField(
  documents: ExtractedDocumentData[],
  fieldKey: string,
): DocumentComparisonIssue | null {
  const issue = compareDocuments(
    documents,
  ).find(
    (item) => item.fieldKey === fieldKey,
  );

  return issue ?? null;
}