import type { Timestamp } from "firebase/firestore";

export type AiSeverity =
  | "info"
  | "warning"
  | "critical"
  | "success";

export type AiRecommendationTextKey =
  | "missingDocument"
  | "uploadMissingDocument"
  | "deadlineExpired"
  | "deadlineExpiredMessage"
  | "deadlineApproaching"
  | "deadlineApproachingMessage"
  | "allComplete"
  | "allCompleteMessage"
  | "readinessScore"
  | "readinessScoreMessage";

export interface AiRecommendation {
  id: string;
  title: string;
  message: string;
  titleKey?: AiRecommendationTextKey;
  messageKey?: AiRecommendationTextKey;
  variables?: Record<string, string | number>;
  severity: AiSeverity;
  processId?: string;
  documentKey?: string;
  createdAt?: Timestamp | null;
}

export type AiRoadmapStepStatus =
  | "completed"
  | "current"
  | "upcoming";

export interface AiRoadmapStep {
  id: string;
  order: number;
  title: string;
  description: string;
  status: AiRoadmapStepStatus;
  required: boolean;
  estimatedDays: number;
  processId?: string;
  documentKey?: string;
}

export interface AiRoadmapResult {
  steps: AiRoadmapStep[];
  completedSteps: number;
  totalSteps: number;
  estimatedDaysRemaining: number;
  nextStep: AiRoadmapStep | null;
}

export interface ExtractedField {
  key: string;
  label: string;
  value: string;
  confidence: number;
  sourceDocumentKey?: string;
}

export type DocumentMatchStatus =
  | "match"
  | "possible_match"
  | "mismatch"
  | "unknown";

export type DocumentExpiryStatus =
  | "valid"
  | "expiring_soon"
  | "expired"
  | "not_applicable"
  | "unknown";

export interface DocumentIntelligenceWarning {
  code: string;
  severity: "info" | "warning" | "critical";
  message: string;
}

export interface DocumentIntelligence {
  documentType: string;
  documentMatch: DocumentMatchStatus;
  qualityScore: number;
  isReadable: boolean;
  mrzDetected: boolean;
  expiryStatus: DocumentExpiryStatus;
  summary: string;
  nextAction: string;
  warnings: DocumentIntelligenceWarning[];
  risks: DocumentIntelligenceWarning[];
}

export interface ExtractedDocumentData {
  processId: string;
  documentKey: string;
  documentTitle: string;
  fileName?: string;
  fileUrl?: string;
  contentType?: string;
  rawText?: string;
  fields: ExtractedField[];
  intelligence?: DocumentIntelligence;
  analyzedAt?: Timestamp | string | null;
}

export interface AiReadinessItem {
  key: string;
  label: string;
  completed: boolean;
  required: boolean;
  weight: number;
  processId?: string;
  documentKey?: string;
}

export interface AiReadinessResult {
  score: number;
  completedWeight: number;
  totalWeight: number;
  completedItems: number;
  totalItems: number;
  items: AiReadinessItem[];
  calculatedAt?: Timestamp | null;
}

export type AiChatRole =
  | "user"
  | "assistant";

export interface AiChatMessage {
  id: string;
  role: AiChatRole;
  content: string;
  createdAt?: Timestamp | null;
}

export interface AiProcessDocument {
  key: string;
  title: string;
  description?: string;
  required?: boolean;
  status?: string;
  fileName?: string;
  fileUrl?: string;
  storagePath?: string;
  fileSize?: number;
  contentType?: string;
  uploadedAt?: Timestamp | null;
}

export interface AiProcess {
  id: string;
  title: string;
  description?: string;
  country?: string;
  category?: string;
  status?: string;
  progress?: number;
  deadline?: string | null;
  requiredDocuments: AiProcessDocument[];
}

export interface SmartFormField {
  key: string;
  label: string;
  value: string;
  confidence: number;
  source?: string;
}

export interface DocumentComparisonIssue {
  id: string;
  fieldKey: string;
  label: string;
  values: {
    documentKey: string;
    documentTitle: string;
    value: string;
  }[];
  severity: "info" | "warning" | "critical";
  message: string;
}