/**
 * ALQEV Process Advisor
 *
 * Deterministic process and document analysis engine.
 *
 * Important:
 * - This file does not call Gemini or another AI model.
 * - It calculates scores, risks and next actions from stored process data.
 * - The result can be used by ProcessAiPanel, Copilot, Dashboard,
 *   notifications and future mobile applications.
 */

export type AdvisorSeverity =
  | "success"
  | "info"
  | "warning"
  | "critical";

export type AdvisorCategory =
  | "missing_document"
  | "document_quality"
  | "document_readability"
  | "document_match"
  | "document_expiry"
  | "ocr_error"
  | "deadline"
  | "process_status"
  | "document_warning"
  | "document_risk"
  | "process_complete";

export type AdvisorDocumentMatch =
  | "match"
  | "possible_match"
  | "mismatch"
  | "unknown";

export type AdvisorExpiryStatus =
  | "valid"
  | "expiring_soon"
  | "expired"
  | "not_applicable"
  | "unknown";

export type AdvisorIssue = {
  code?: string;
  severity?: "info" | "warning" | "critical";
  message?: string;
};

export type AdvisorDocumentIntelligence = {
  documentType?: string;
  documentMatch?: AdvisorDocumentMatch;
  qualityScore?: number;
  isReadable?: boolean;
  mrzDetected?: boolean;
  expiryStatus?: AdvisorExpiryStatus;
  summary?: string;
  nextAction?: string;
  warnings?: AdvisorIssue[];
  risks?: AdvisorIssue[];
};

export type AdvisorOcrResult = {
  rawText?: string;
  documentType?: string;
  analyzedAt?: string;
  fields?: Array<{
    key?: string;
    label?: string;
    value?: string;
    confidence?: number;
  }>;
  intelligence?: AdvisorDocumentIntelligence;
};

export type AdvisorDocument = {
  key: string;
  title: string;
  description?: string;
  required?: boolean;
  status?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  contentType?: string;
  uploadedAt?: unknown;
  ocr?: AdvisorOcrResult | null;
  ocrError?: string;
};

export type AdvisorProcess = {
  id: string;
  templateKey?: string;
  title: string;
  description?: string;
  category?: string;
  country?: string;
  status?: string;
  progress?: number;
  deadline?: string | null;
  notes?: string;
  requiredDocuments: AdvisorDocument[];
  completedDocumentCount?: number;
  totalDocumentCount?: number;
};

export type AdvisorRecommendation = {
  id: string;
  processId: string;
  documentKey?: string;
  category: AdvisorCategory;
  severity: AdvisorSeverity;
  priority: number;

  /**
   * Stable translation keys for the UI.
   * The UI can translate these values into the selected language.
   */
  titleKey: string;
  messageKey: string;

  /**
   * Safe fallback text when no translation is available.
   */
  title: string;
  message: string;

  variables?: Record<string, string | number>;
  suggestedAction?: string;
};

export type AdvisorDocumentAnalysis = {
  key: string;
  title: string;
  required: boolean;
  status: string;
  uploaded: boolean;

  completionScore: number;
  qualityScore: number | null;
  healthScore: number;
  confidenceScore: number;

  readable: boolean | null;
  documentMatch: AdvisorDocumentMatch;
  expiryStatus: AdvisorExpiryStatus;
  mrzDetected: boolean | null;

  warningCount: number;
  riskCount: number;
  criticalIssueCount: number;

  summary: string;
  nextAction: string;
  recommendations: AdvisorRecommendation[];
};

export type AdvisorReadiness = {
  score: number;
  label:
    | "very_high"
    | "high"
    | "medium"
    | "low"
    | "critical";

  completedItems: number;
  totalItems: number;

  completedRequiredItems: number;
  requiredItems: number;

  missingRequiredItems: number;
  missingOptionalItems: number;
};

export type AdvisorDeadlineAnalysis = {
  deadline: string | null;
  daysRemaining: number | null;
  status:
    | "none"
    | "invalid"
    | "safe"
    | "approaching"
    | "urgent"
    | "today"
    | "expired";
};

export type ProcessAdvisorResult = {
  processId: string;
  generatedAt: string;

  readiness: AdvisorReadiness;
  processHealthScore: number;
  documentHealthScore: number;
  ocrQualityScore: number | null;
  confidenceScore: number;

  deadline: AdvisorDeadlineAnalysis;

  documents: AdvisorDocumentAnalysis[];
  recommendations: AdvisorRecommendation[];

  nextBestAction: AdvisorRecommendation | null;

  criticalCount: number;
  warningCount: number;
  infoCount: number;
  successCount: number;

  estimatedPreparationDays: number;
  hasBlockingIssues: boolean;
};

const COMPLETED_STATUSES = new Set([
  "uploaded",
  "approved",
  "completed",
  "verified",
]);

const REJECTED_STATUSES = new Set([
  "rejected",
  "invalid",
  "failed",
]);

const PROCESS_INACTIVE_STATUSES = new Set([
  "cancelled",
  "rejected",
]);

const LOW_QUALITY_THRESHOLD = 50;
const MEDIUM_QUALITY_THRESHOLD = 70;

function clamp(
  value: number,
  minimum = 0,
  maximum = 100,
): number {
  if (!Number.isFinite(value)) {
    return minimum;
  }

  return Math.min(
    maximum,
    Math.max(minimum, Math.round(value)),
  );
}

function normalizeText(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizeStatus(status: unknown): string {
  return normalizeText(status).toLowerCase();
}

function isDocumentCompleted(
  document: AdvisorDocument,
): boolean {
  return COMPLETED_STATUSES.has(
    normalizeStatus(document.status),
  );
}

function isDocumentRejected(
  document: AdvisorDocument,
): boolean {
  return REJECTED_STATUSES.has(
    normalizeStatus(document.status),
  );
}

function isRequiredDocument(
  document: AdvisorDocument,
): boolean {
  return document.required !== false;
}

function normalizeSeverity(
  value: unknown,
): AdvisorSeverity {
  switch (value) {
    case "critical":
      return "critical";
    case "warning":
      return "warning";
    case "info":
      return "info";
    default:
      return "warning";
  }
}

function severityPriority(
  severity: AdvisorSeverity,
): number {
  switch (severity) {
    case "critical":
      return 100;
    case "warning":
      return 70;
    case "info":
      return 40;
    case "success":
      return 10;
  }
}

function buildRecommendationId(
  processId: string,
  category: AdvisorCategory,
  documentKey?: string,
  suffix?: string,
): string {
  return [
    processId,
    documentKey || "process",
    category,
    suffix || "general",
  ]
    .filter(Boolean)
    .join(":");
}

function createRecommendation({
  processId,
  documentKey,
  category,
  severity,
  titleKey,
  messageKey,
  title,
  message,
  variables,
  suggestedAction,
  priorityBoost = 0,
  suffix,
}: {
  processId: string;
  documentKey?: string;
  category: AdvisorCategory;
  severity: AdvisorSeverity;
  titleKey: string;
  messageKey: string;
  title: string;
  message: string;
  variables?: Record<string, string | number>;
  suggestedAction?: string;
  priorityBoost?: number;
  suffix?: string;
}): AdvisorRecommendation {
  return {
    id: buildRecommendationId(
      processId,
      category,
      documentKey,
      suffix,
    ),
    processId,
    documentKey,
    category,
    severity,
    priority:
      severityPriority(severity) +
      priorityBoost,
    titleKey,
    messageKey,
    title,
    message,
    variables,
    suggestedAction,
  };
}

function getDaysUntil(
  deadline?: string | null,
): number | null {
  if (!deadline) {
    return null;
  }

  const target = new Date(
    `${deadline}T00:00:00`,
  );

  if (Number.isNaN(target.getTime())) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  return Math.ceil(
    (target.getTime() - today.getTime()) /
      86_400_000,
  );
}

function analyzeDeadline(
  deadline?: string | null,
): AdvisorDeadlineAnalysis {
  if (!deadline) {
    return {
      deadline: null,
      daysRemaining: null,
      status: "none",
    };
  }

  const daysRemaining =
    getDaysUntil(deadline);

  if (daysRemaining === null) {
    return {
      deadline,
      daysRemaining: null,
      status: "invalid",
    };
  }

  if (daysRemaining < 0) {
    return {
      deadline,
      daysRemaining,
      status: "expired",
    };
  }

  if (daysRemaining === 0) {
    return {
      deadline,
      daysRemaining,
      status: "today",
    };
  }

  if (daysRemaining <= 3) {
    return {
      deadline,
      daysRemaining,
      status: "urgent",
    };
  }

  if (daysRemaining <= 14) {
    return {
      deadline,
      daysRemaining,
      status: "approaching",
    };
  }

  return {
    deadline,
    daysRemaining,
    status: "safe",
  };
}

function getIssuePenalty(
  severity: AdvisorSeverity,
): number {
  switch (severity) {
    case "critical":
      return 30;
    case "warning":
      return 12;
    case "info":
      return 3;
    case "success":
      return 0;
  }
}

function getDocumentConfidenceScore(
  document: AdvisorDocument,
): number {
  if (!document.ocr) {
    return isDocumentCompleted(document)
      ? 45
      : 0;
  }

  const fields =
    document.ocr.fields || [];

  const confidenceValues = fields
    .map((field) => field.confidence)
    .filter(
      (value): value is number =>
        typeof value === "number" &&
        Number.isFinite(value),
    )
    .map((value) =>
      value <= 1 ? value * 100 : value,
    );

  if (confidenceValues.length > 0) {
    const average =
      confidenceValues.reduce(
        (sum, value) => sum + value,
        0,
      ) / confidenceValues.length;

    return clamp(average);
  }

  const intelligence =
    document.ocr.intelligence;

  if (intelligence?.isReadable === true) {
    return 80;
  }

  if (
    normalizeText(document.ocr.rawText)
      .length > 20
  ) {
    return 65;
  }

  return 40;
}

function getDocumentQualityScore(
  document: AdvisorDocument,
): number | null {
  const quality =
    document.ocr?.intelligence
      ?.qualityScore;

  if (
    typeof quality !== "number" ||
    !Number.isFinite(quality)
  ) {
    return null;
  }

  return clamp(quality);
}

function getDocumentMatch(
  document: AdvisorDocument,
): AdvisorDocumentMatch {
  const value =
    document.ocr?.intelligence
      ?.documentMatch;

  switch (value) {
    case "match":
    case "possible_match":
    case "mismatch":
    case "unknown":
      return value;
    default:
      return "unknown";
  }
}

function getExpiryStatus(
  document: AdvisorDocument,
): AdvisorExpiryStatus {
  const value =
    document.ocr?.intelligence
      ?.expiryStatus;

  switch (value) {
    case "valid":
    case "expiring_soon":
    case "expired":
    case "not_applicable":
    case "unknown":
      return value;
    default:
      return "unknown";
  }
}

function calculateDocumentHealthScore({
  document,
  qualityScore,
  readable,
  documentMatch,
  expiryStatus,
  issuePenalty,
}: {
  document: AdvisorDocument;
  qualityScore: number | null;
  readable: boolean | null;
  documentMatch: AdvisorDocumentMatch;
  expiryStatus: AdvisorExpiryStatus;
  issuePenalty: number;
}): number {
  if (!isDocumentCompleted(document)) {
    return 0;
  }

  let score = 100;

  if (isDocumentRejected(document)) {
    score -= 60;
  }

  if (qualityScore !== null) {
    if (qualityScore < LOW_QUALITY_THRESHOLD) {
      score -= 30;
    } else if (
      qualityScore <
      MEDIUM_QUALITY_THRESHOLD
    ) {
      score -= 15;
    }
  } else if (document.ocr) {
    score -= 5;
  }

  if (readable === false) {
    score -= 45;
  }

  if (documentMatch === "mismatch") {
    score -= 50;
  } else if (
    documentMatch === "possible_match"
  ) {
    score -= 12;
  } else if (
    documentMatch === "unknown" &&
    document.ocr
  ) {
    score -= 5;
  }

  if (expiryStatus === "expired") {
    score -= 55;
  } else if (
    expiryStatus === "expiring_soon"
  ) {
    score -= 22;
  }

  if (document.ocrError) {
    score -= 25;
  }

  score -= issuePenalty;

  return clamp(score);
}

function analyzeDocument(
  process: AdvisorProcess,
  document: AdvisorDocument,
): AdvisorDocumentAnalysis {
  const recommendations: AdvisorRecommendation[] =
    [];

  const required =
    isRequiredDocument(document);

  const uploaded =
    isDocumentCompleted(document);

  const intelligence =
    document.ocr?.intelligence;

  const qualityScore =
    getDocumentQualityScore(document);

  const readable =
    typeof intelligence?.isReadable ===
    "boolean"
      ? intelligence.isReadable
      : document.ocr
        ? normalizeText(
            document.ocr.rawText,
          ).length > 0
        : null;

  const documentMatch =
    getDocumentMatch(document);

  const expiryStatus =
    getExpiryStatus(document);

  const mrzDetected =
    typeof intelligence?.mrzDetected ===
    "boolean"
      ? intelligence.mrzDetected
      : null;

  const warnings =
    intelligence?.warnings || [];

  const risks =
    intelligence?.risks || [];

  let issuePenalty = 0;
  let criticalIssueCount = 0;

  if (!uploaded) {
    recommendations.push(
      createRecommendation({
        processId: process.id,
        documentKey: document.key,
        category: "missing_document",
        severity: required
          ? "critical"
          : "warning",
        titleKey: "missingDocument",
        messageKey:
          "uploadMissingDocument",
        title: "Missing document",
        message: `Upload “${document.title}”.`,
        variables: {
          document: document.title,
        },
        suggestedAction:
          "Upload the missing document.",
        priorityBoost: required ? 15 : 0,
      }),
    );
  }

  if (document.ocrError) {
    recommendations.push(
      createRecommendation({
        processId: process.id,
        documentKey: document.key,
        category: "ocr_error",
        severity: "warning",
        titleKey: "ocrAnalysisFailed",
        messageKey: "ocrAnalysisFailedMessage",
        title: "Document analysis failed",
        message:
          document.ocrError ||
          `The document “${document.title}” could not be analyzed.`,
        variables: {
          document: document.title,
        },
        suggestedAction:
          "Retry the document analysis or upload a clearer file.",
      }),
    );
  }

  if (
    uploaded &&
    qualityScore !== null &&
    qualityScore < LOW_QUALITY_THRESHOLD
  ) {
    recommendations.push(
      createRecommendation({
        processId: process.id,
        documentKey: document.key,
        category: "document_quality",
        severity: "critical",
        titleKey: "documentQualityCritical",
        messageKey:
          "documentQualityCriticalMessage",
        title: "Document quality is too low",
        message: `The quality score of “${document.title}” is ${qualityScore}/100.`,
        variables: {
          document: document.title,
          score: qualityScore,
        },
        suggestedAction:
          intelligence?.nextAction ||
          "Upload a clearer scan or original PDF.",
        priorityBoost: 10,
      }),
    );
  } else if (
    uploaded &&
    qualityScore !== null &&
    qualityScore <
      MEDIUM_QUALITY_THRESHOLD
  ) {
    recommendations.push(
      createRecommendation({
        processId: process.id,
        documentKey: document.key,
        category: "document_quality",
        severity: "warning",
        titleKey: "documentQualityLow",
        messageKey:
          "documentQualityLowMessage",
        title: "Document quality should be improved",
        message: `The quality score of “${document.title}” is ${qualityScore}/100.`,
        variables: {
          document: document.title,
          score: qualityScore,
        },
        suggestedAction:
          intelligence?.nextAction ||
          "Consider uploading a higher-quality file.",
      }),
    );
  }

  if (uploaded && readable === false) {
    recommendations.push(
      createRecommendation({
        processId: process.id,
        documentKey: document.key,
        category:
          "document_readability",
        severity: "critical",
        titleKey: "documentNotReadable",
        messageKey:
          "documentNotReadableMessage",
        title: "Document is not readable",
        message: `The content of “${document.title}” could not be read reliably.`,
        variables: {
          document: document.title,
        },
        suggestedAction:
          intelligence?.nextAction ||
          "Upload a sharper and complete scan.",
        priorityBoost: 12,
      }),
    );
  }

  if (
    uploaded &&
    documentMatch === "mismatch"
  ) {
    recommendations.push(
      createRecommendation({
        processId: process.id,
        documentKey: document.key,
        category: "document_match",
        severity: "critical",
        titleKey: "documentMismatch",
        messageKey:
          "documentMismatchMessage",
        title: "The uploaded document does not match",
        message: `“${document.title}” appears not to match the requested document type.`,
        variables: {
          document: document.title,
        },
        suggestedAction:
          intelligence?.nextAction ||
          "Check the document and upload the correct file.",
        priorityBoost: 15,
      }),
    );
  } else if (
    uploaded &&
    documentMatch ===
      "possible_match"
  ) {
    recommendations.push(
      createRecommendation({
        processId: process.id,
        documentKey: document.key,
        category: "document_match",
        severity: "warning",
        titleKey:
          "documentPossibleMismatch",
        messageKey:
          "documentPossibleMismatchMessage",
        title: "Document match is uncertain",
        message: `ALQEV could not confirm with certainty that “${document.title}” is the requested document.`,
        variables: {
          document: document.title,
        },
        suggestedAction:
          intelligence?.nextAction ||
          "Review the document before submitting it.",
      }),
    );
  }

  if (
    uploaded &&
    expiryStatus === "expired"
  ) {
    recommendations.push(
      createRecommendation({
        processId: process.id,
        documentKey: document.key,
        category: "document_expiry",
        severity: "critical",
        titleKey: "documentExpired",
        messageKey:
          "documentExpiredMessage",
        title: "Document has expired",
        message: `“${document.title}” appears to have expired.`,
        variables: {
          document: document.title,
        },
        suggestedAction:
          intelligence?.nextAction ||
          "Renew the document and upload the current version.",
        priorityBoost: 15,
      }),
    );
  } else if (
    uploaded &&
    expiryStatus === "expiring_soon"
  ) {
    recommendations.push(
      createRecommendation({
        processId: process.id,
        documentKey: document.key,
        category: "document_expiry",
        severity: "warning",
        titleKey:
          "documentExpiringSoon",
        messageKey:
          "documentExpiringSoonMessage",
        title:
          "Document expires soon",
        message: `“${document.title}” appears to expire soon.`,
        variables: {
          document: document.title,
        },
        suggestedAction:
          intelligence?.nextAction ||
          "Check whether the document should be renewed before the application.",
        priorityBoost: 5,
      }),
    );
  }

  warnings.forEach((warning, index) => {
    const severity =
      normalizeSeverity(
        warning.severity,
      );

    issuePenalty +=
      getIssuePenalty(severity);

    if (severity === "critical") {
      criticalIssueCount += 1;
    }

    const message =
      normalizeText(warning.message);

    if (!message) {
      return;
    }

    recommendations.push(
      createRecommendation({
        processId: process.id,
        documentKey: document.key,
        category: "document_warning",
        severity,
        titleKey: "documentWarning",
        messageKey:
          "documentWarningMessage",
        title: "Document warning",
        message,
        variables: {
          document: document.title,
        },
        suggestedAction:
          intelligence?.nextAction ||
          undefined,
        suffix:
          warning.code ||
          `warning-${index}`,
      }),
    );
  });

  risks.forEach((risk, index) => {
    const severity =
      normalizeSeverity(risk.severity);

    issuePenalty +=
      getIssuePenalty(severity);

    if (severity === "critical") {
      criticalIssueCount += 1;
    }

    const message =
      normalizeText(risk.message);

    if (!message) {
      return;
    }

    recommendations.push(
      createRecommendation({
        processId: process.id,
        documentKey: document.key,
        category: "document_risk",
        severity,
        titleKey: "documentRisk",
        messageKey:
          "documentRiskMessage",
        title: "Document risk",
        message,
        variables: {
          document: document.title,
        },
        suggestedAction:
          intelligence?.nextAction ||
          undefined,
        priorityBoost:
          severity === "critical"
            ? 5
            : 0,
        suffix:
          risk.code ||
          `risk-${index}`,
      }),
    );
  });

  const healthScore =
    calculateDocumentHealthScore({
      document,
      qualityScore,
      readable,
      documentMatch,
      expiryStatus,
      issuePenalty,
    });

  const confidenceScore =
    getDocumentConfidenceScore(
      document,
    );

  return {
    key: document.key,
    title: document.title,
    required,
    status:
      normalizeStatus(document.status) ||
      "missing",
    uploaded,

    completionScore: uploaded
      ? 100
      : 0,
    qualityScore,
    healthScore,
    confidenceScore,

    readable,
    documentMatch,
    expiryStatus,
    mrzDetected,

    warningCount: warnings.length,
    riskCount: risks.length,
    criticalIssueCount,

    summary:
      normalizeText(
        intelligence?.summary,
      ),
    nextAction:
      normalizeText(
        intelligence?.nextAction,
      ),

    recommendations,
  };
}

function calculateReadiness(
  documents: AdvisorDocumentAnalysis[],
): AdvisorReadiness {
  const requiredDocuments =
    documents.filter(
      (document) => document.required,
    );

  const optionalDocuments =
    documents.filter(
      (document) => !document.required,
    );

  const completedRequiredItems =
    requiredDocuments.filter(
      (document) => document.uploaded,
    ).length;

  const completedOptionalItems =
    optionalDocuments.filter(
      (document) => document.uploaded,
    ).length;

  const completedItems =
    completedRequiredItems +
    completedOptionalItems;

  const totalItems = documents.length;

  const requiredWeight =
    requiredDocuments.length * 2;

  const optionalWeight =
    optionalDocuments.length;

  const totalWeight =
    requiredWeight + optionalWeight;

  const completedWeight =
    completedRequiredItems * 2 +
    completedOptionalItems;

  const score =
    totalWeight > 0
      ? clamp(
          (completedWeight /
            totalWeight) *
            100,
        )
      : 0;

  let label:
    AdvisorReadiness["label"];

  if (score >= 90) {
    label = "very_high";
  } else if (score >= 70) {
    label = "high";
  } else if (score >= 40) {
    label = "medium";
  } else if (score >= 20) {
    label = "low";
  } else {
    label = "critical";
  }

  return {
    score,
    label,
    completedItems,
    totalItems,
    completedRequiredItems,
    requiredItems:
      requiredDocuments.length,
    missingRequiredItems:
      requiredDocuments.length -
      completedRequiredItems,
    missingOptionalItems:
      optionalDocuments.length -
      completedOptionalItems,
  };
}

function average(
  values: number[],
): number | null {
  if (values.length === 0) {
    return null;
  }

  return clamp(
    values.reduce(
      (sum, value) => sum + value,
      0,
    ) / values.length,
  );
}

function calculateEstimatedPreparationDays(
  readiness: AdvisorReadiness,
  recommendations: AdvisorRecommendation[],
): number {
  const criticalCount =
    recommendations.filter(
      (item) =>
        item.severity === "critical",
    ).length;

  const warningCount =
    recommendations.filter(
      (item) =>
        item.severity === "warning",
    ).length;

  if (
    readiness.missingRequiredItems === 0 &&
    criticalCount === 0 &&
    warningCount === 0
  ) {
    return 0;
  }

  return Math.max(
    1,
    readiness.missingRequiredItems * 3 +
      readiness.missingOptionalItems +
      criticalCount * 2 +
      Math.ceil(warningCount / 2),
  );
}

function sortRecommendations(
  recommendations: AdvisorRecommendation[],
): AdvisorRecommendation[] {
  const severityOrder:
    Record<AdvisorSeverity, number> = {
      critical: 4,
      warning: 3,
      info: 2,
      success: 1,
    };

  return [...recommendations].sort(
    (first, second) => {
      const severityDifference =
        severityOrder[second.severity] -
        severityOrder[first.severity];

      if (severityDifference !== 0) {
        return severityDifference;
      }

      return (
        second.priority -
        first.priority
      );
    },
  );
}

function buildDeadlineRecommendations(
  process: AdvisorProcess,
  deadline: AdvisorDeadlineAnalysis,
): AdvisorRecommendation[] {
  if (
    deadline.status === "none" ||
    deadline.status === "safe"
  ) {
    return [];
  }

  if (deadline.status === "invalid") {
    return [
      createRecommendation({
        processId: process.id,
        category: "deadline",
        severity: "warning",
        titleKey: "invalidDeadline",
        messageKey:
          "invalidDeadlineMessage",
        title: "Invalid target date",
        message:
          "The saved target date could not be interpreted.",
        suggestedAction:
          "Check and update the process target date.",
      }),
    ];
  }

  if (deadline.status === "expired") {
    return [
      createRecommendation({
        processId: process.id,
        category: "deadline",
        severity: "critical",
        titleKey: "deadlineExpired",
        messageKey:
          "deadlineExpiredMessage",
        title: "Deadline expired",
        message:
          "The target date of this process has passed.",
        suggestedAction:
          "Review the process deadline and contact the responsible authority when necessary.",
        priorityBoost: 20,
      }),
    ];
  }

  if (deadline.status === "today") {
    return [
      createRecommendation({
        processId: process.id,
        category: "deadline",
        severity: "critical",
        titleKey: "deadlineToday",
        messageKey:
          "deadlineTodayMessage",
        title: "Deadline is today",
        message:
          "The target date of this process is today.",
        suggestedAction:
          "Prioritize all remaining critical steps today.",
        priorityBoost: 20,
      }),
    ];
  }

  const days =
    deadline.daysRemaining || 0;

  if (deadline.status === "urgent") {
    return [
      createRecommendation({
        processId: process.id,
        category: "deadline",
        severity: "critical",
        titleKey: "deadlineUrgent",
        messageKey:
          "deadlineUrgentMessage",
        title: "Deadline is very close",
        message: `Only ${days} day(s) remain until the target date.`,
        variables: {
          count: days,
        },
        suggestedAction:
          "Complete critical missing steps immediately.",
        priorityBoost: 15,
      }),
    ];
  }

  return [
    createRecommendation({
      processId: process.id,
      category: "deadline",
      severity: "warning",
      titleKey:
        "deadlineApproaching",
      messageKey:
        "deadlineApproachingMessage",
      title: "Deadline is approaching",
      message: `${days} day(s) remain until the target date.`,
      variables: {
        count: days,
      },
      suggestedAction:
        "Review missing documents and plan the remaining steps.",
      priorityBoost: 5,
    }),
  ];
}

function buildProcessStatusRecommendations(
  process: AdvisorProcess,
): AdvisorRecommendation[] {
  const status =
    normalizeStatus(process.status);

  if (
    PROCESS_INACTIVE_STATUSES.has(
      status,
    )
  ) {
    return [
      createRecommendation({
        processId: process.id,
        category: "process_status",
        severity: "critical",
        titleKey:
          "processNotActive",
        messageKey:
          "processNotActiveMessage",
        title:
          "Process is not active",
        message: `The current process status is “${status}”.`,
        variables: {
          status,
        },
        suggestedAction:
          "Review the process status before continuing.",
        priorityBoost: 20,
      }),
    ];
  }

  if (status === "paused") {
    return [
      createRecommendation({
        processId: process.id,
        category: "process_status",
        severity: "warning",
        titleKey: "processPaused",
        messageKey:
          "processPausedMessage",
        title: "Process is paused",
        message:
          "This process is currently paused.",
        suggestedAction:
          "Resume the process when preparation continues.",
      }),
    ];
  }

  return [];
}

export function analyzeProcess(
  process: AdvisorProcess,
): ProcessAdvisorResult {
  const safeDocuments =
    Array.isArray(
      process.requiredDocuments,
    )
      ? process.requiredDocuments
      : [];

  const documents =
    safeDocuments.map((document) =>
      analyzeDocument(
        process,
        document,
      ),
    );

  const readiness =
    calculateReadiness(documents);

  const deadline =
    analyzeDeadline(
      process.deadline,
    );

  const documentRecommendations =
    documents.flatMap(
      (document) =>
        document.recommendations,
    );

  const deadlineRecommendations =
    buildDeadlineRecommendations(
      process,
      deadline,
    );

  const statusRecommendations =
    buildProcessStatusRecommendations(
      process,
    );

  let recommendations = [
    ...documentRecommendations,
    ...deadlineRecommendations,
    ...statusRecommendations,
  ];

  const healthValues =
    documents.map(
      (document) =>
        document.healthScore,
    );

  const documentHealthScore =
    average(healthValues) || 0;

  const qualityValues =
    documents
      .map(
        (document) =>
          document.qualityScore,
      )
      .filter(
        (value): value is number =>
          value !== null,
      );

  const ocrQualityScore =
    average(qualityValues);

  const confidenceValues =
    documents
      .filter(
        (document) =>
          document.uploaded,
      )
      .map(
        (document) =>
          document.confidenceScore,
      );

  const confidenceScore =
    average(confidenceValues) || 0;

  const criticalDocumentCount =
    documents.filter(
      (document) =>
        document.required &&
        !document.uploaded,
    ).length;

  const unhealthyDocumentCount =
    documents.filter(
      (document) =>
        document.uploaded &&
        document.healthScore < 50,
    ).length;

  let processHealthScore =
    readiness.score * 0.55 +
    documentHealthScore * 0.3 +
    confidenceScore * 0.15;

  processHealthScore -=
    criticalDocumentCount * 8;

  processHealthScore -=
    unhealthyDocumentCount * 6;

  if (
    deadline.status === "expired"
  ) {
    processHealthScore -= 25;
  } else if (
    deadline.status === "today" ||
    deadline.status === "urgent"
  ) {
    processHealthScore -= 15;
  } else if (
    deadline.status ===
    "approaching"
  ) {
    processHealthScore -= 6;
  }

  processHealthScore =
    clamp(processHealthScore);

  const hasBlockingIssues =
    recommendations.some(
      (item) =>
        item.severity === "critical",
    );

  if (
    readiness.missingRequiredItems === 0 &&
    !hasBlockingIssues
  ) {
    recommendations.push(
      createRecommendation({
        processId: process.id,
        category:
          "process_complete",
        severity: "success",
        titleKey: "allComplete",
        messageKey:
          "allCompleteMessage",
        title:
          "Required documents are ready",
        message:
          "All required documents appear to be uploaded and no blocking issue was detected.",
        suggestedAction:
          "Review all information once more before continuing with the official application.",
      }),
    );
  }

  recommendations =
    sortRecommendations(
      recommendations,
    );

  const nextBestAction =
    recommendations.find(
      (item) =>
        item.severity === "critical",
    ) ??
    recommendations.find(
      (item) =>
        item.severity === "warning",
    ) ??
    recommendations.find(
      (item) =>
        item.severity === "info",
    ) ??
    recommendations[0] ??
    null;

  const criticalCount =
    recommendations.filter(
      (item) =>
        item.severity === "critical",
    ).length;

  const warningCount =
    recommendations.filter(
      (item) =>
        item.severity === "warning",
    ).length;

  const infoCount =
    recommendations.filter(
      (item) =>
        item.severity === "info",
    ).length;

  const successCount =
    recommendations.filter(
      (item) =>
        item.severity === "success",
    ).length;

  return {
    processId: process.id,
    generatedAt:
      new Date().toISOString(),

    readiness,
    processHealthScore,
    documentHealthScore,
    ocrQualityScore,
    confidenceScore,

    deadline,
    documents,
    recommendations,
    nextBestAction,

    criticalCount,
    warningCount,
    infoCount,
    successCount,

    estimatedPreparationDays:
      calculateEstimatedPreparationDays(
        readiness,
        recommendations,
      ),

    hasBlockingIssues:
      criticalCount > 0,
  };
}

export function analyzeMultipleProcesses(
  processes: AdvisorProcess[],
): ProcessAdvisorResult[] {
  if (!Array.isArray(processes)) {
    return [];
  }

  return processes.map(
    analyzeProcess,
  );
}

export function getHighestPriorityRecommendation(
  result: ProcessAdvisorResult,
): AdvisorRecommendation | null {
  return (
    result.nextBestAction ||
    result.recommendations[0] ||
    null
  );
}

export function getProcessAdvisorSummary(
  result: ProcessAdvisorResult,
) {
  return {
    processId: result.processId,
    healthScore:
      result.processHealthScore,
    readinessScore:
      result.readiness.score,
    completedItems:
      result.readiness.completedItems,
    totalItems:
      result.readiness.totalItems,
    missingRequiredItems:
      result.readiness
        .missingRequiredItems,
    criticalCount:
      result.criticalCount,
    warningCount:
      result.warningCount,
    estimatedPreparationDays:
      result.estimatedPreparationDays,
    hasBlockingIssues:
      result.hasBlockingIssues,
    nextBestAction:
      result.nextBestAction,
  };
}