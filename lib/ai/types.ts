import type { Timestamp } from "firebase/firestore";

export type AiSeverity =
  | "info"
  | "warning"
  | "critical"
  | "success";

export interface AiRecommendation {
  id: string;
  title: string;
  message: string;
  severity: AiSeverity;

  processId?: string;
  documentKey?: string;

  createdAt?: Timestamp | null;
}

export interface ExtractedField {
  key: string;
  label: string;
  value: string;

  confidence: number;

  sourceDocumentKey?: string;
}

export interface ExtractedDocumentData {
  processId: string;
  documentKey: string;
  documentTitle: string;

  fileName?: string;

  rawText?: string;

  fields: ExtractedField[];

  analyzedAt?: Timestamp | null;
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