import {
  AiDocumentResult,
  AnalyzeDocumentInput,
  DocumentAiProvider,
} from "./types";
import {
  inferExpectedDocumentType,
  shouldSkipTextOcr,
} from "./classifier";
import { keepRelevantFields } from "./extractor";
import {
  fieldsToRecord,
  normalizeProviderResponse,
} from "./mapper";
import { validateDocument } from "./validator";

export async function analyzeDocument(
  provider: DocumentAiProvider,
  input: AnalyzeDocumentInput,
): Promise<AiDocumentResult> {
  const expected = inferExpectedDocumentType(
    input.expectedDocumentTitle,
  );

  // Biyometrik fotoğraf ise OCR yapma
  if (
    expected &&
    shouldSkipTextOcr(expected.documentType)
  ) {
    return {
      version: 2,
      documentType: expected.documentType,
      classificationConfidence: expected.confidence,
      classificationReason: expected.reason,
      rawText: "",
      fields: [],
      extractedFields: {},
      warnings: [
        {
          code: "NO_TEXT_EXPECTED",
          severity: "info",
          message:
            "Biyometrik fotoğraf yüklendi. OCR analizi atlandı.",
        },
      ],
      isValid: true,
      analyzedAt: new Date().toISOString(),
      provider: provider.name,
      model: provider.model,
    };
  }

  // AI sağlayıcısından analiz al
  const providerResponse = await provider.analyze(input);

  const normalized = normalizeProviderResponse(
    providerResponse,
  );

  // AI belge tipini bulamadıysa beklenen belge tipini kullan
  const documentType =
    normalized.documentType === "unknown" && expected
      ? expected.documentType
      : normalized.documentType;

  const confidence =
    normalized.documentType === "unknown" && expected
      ? expected.confidence
      : normalized.classificationConfidence;

  const reason =
    normalized.classificationReason ||
    expected?.reason ||
    "Belge AI tarafından analiz edildi.";

  const fields = keepRelevantFields(
    documentType,
    normalized.fields,
  );

  const validation = validateDocument(
    documentType,
    fields,
    normalized.warnings,
  );

  return {
    version: 2,
    documentType,
    classificationConfidence: confidence,
    classificationReason: reason,
    rawText: normalized.rawText,
    fields,
    extractedFields: fieldsToRecord(fields),
    warnings: validation.warnings,
    isValid: validation.isValid,
    analyzedAt: new Date().toISOString(),
    provider: provider.name,
    model: provider.model,
  };
}