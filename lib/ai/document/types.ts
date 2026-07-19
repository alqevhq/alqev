export const DOCUMENT_TYPES = [
  "passport",
  "national_id",
  "residence_permit",
  "biometric_photo",
  "health_insurance",
  "address_proof",
  "payslip",
  "employment_contract",
  "bank_statement",
  "birth_certificate",
  "marriage_certificate",
  "unknown",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export type DocumentFieldValue = string | number | boolean | null;

export type DocumentField = {
  key: string;
  label: string;
  value: DocumentFieldValue;
  confidence: number;
};

export type DocumentWarningCode =
  | "LOW_IMAGE_QUALITY"
  | "UNREADABLE_TEXT"
  | "MISSING_REQUIRED_FIELD"
  | "EXPIRED_DOCUMENT"
  | "EXPIRING_SOON"
  | "DOCUMENT_TYPE_MISMATCH"
  | "POSSIBLE_TAMPERING"
  | "UNSUPPORTED_DOCUMENT"
  | "NO_TEXT_EXPECTED"
  | "UNKNOWN";

export type DocumentWarning = {
  code: DocumentWarningCode;
  message: string;
  severity: "info" | "warning" | "error";
  fieldKey?: string;
};

export type DocumentClassification = {
  documentType: DocumentType;
  confidence: number;
  reason: string;
};

export type DocumentExtraction = {
  rawText: string;
  fields: DocumentField[];
};

export type DocumentValidation = {
  isValid: boolean;
  warnings: DocumentWarning[];
};

export type AiDocumentResult = {
  version: 2;
  documentType: DocumentType;
  classificationConfidence: number;
  classificationReason: string;
  rawText: string;
  fields: DocumentField[];
  extractedFields: Record<string, DocumentFieldValue>;
  warnings: DocumentWarning[];
  isValid: boolean;
  analyzedAt: string;
  provider: string;
  model: string;
};

export type AnalyzeDocumentInput = {
  expectedDocumentTitle?: string;
  fileName?: string;
  contentType: string;
  base64Data: string;
};

export type ProviderDocumentResponse = {
  documentType?: unknown;
  classificationConfidence?: unknown;
  classificationReason?: unknown;
  rawText?: unknown;
  fields?: unknown;
  warnings?: unknown;
};

export interface DocumentAiProvider {
  readonly name: string;
  readonly model: string;

  analyze(input: AnalyzeDocumentInput): Promise<ProviderDocumentResponse>;
}