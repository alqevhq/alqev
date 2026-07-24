/**
 * ALQEV Dashboard Advisor
 *
 * Aggregates multiple process analyses into one deterministic
 * account-level dashboard intelligence result.
 *
 * Important:
 * - This file does not call Gemini or another AI model.
 * - It reuses the Process Advisor as the single source of truth.
 * - The result can be consumed by Dashboard, Copilot, notifications,
 *   mobile clients and future reports.
 */

import {
  analyzeProcess,
  type AdvisorProcess,
  type AdvisorRecommendation,
  type AdvisorSeverity,
  type ProcessAdvisorResult,
} from "@/lib/ai/process-advisor";

export type DashboardHealthLabel =
  | "excellent"
  | "good"
  | "attention"
  | "critical";

export type DashboardProcessStatus =
  | "healthy"
  | "attention"
  | "critical"
  | "complete";

export type DashboardMetricTrend =
  | "up"
  | "down"
  | "stable"
  | "unknown";

export type DashboardRecommendationCategory =
  | "process"
  | "document"
  | "deadline"
  | "account"
  | "complete";

export type DashboardProcessSummary = {
  processId: string;
  title: string;
  category?: string;
  country?: string;
  status?: string;

  readinessScore: number;
  processHealthScore: number;
  documentHealthScore: number;
  confidenceScore: number;
  ocrQualityScore: number | null;

  completedItems: number;
  totalItems: number;
  missingRequiredItems: number;

  criticalCount: number;
  warningCount: number;

  estimatedPreparationDays: number;
  hasBlockingIssues: boolean;

  deadlineStatus: ProcessAdvisorResult["deadline"]["status"];
  daysRemaining: number | null;

  dashboardStatus: DashboardProcessStatus;
  nextBestAction: AdvisorRecommendation | null;
};

export type DashboardRecommendation = {
  id: string;
  processId?: string;
  processTitle?: string;
  documentKey?: string;

  category: DashboardRecommendationCategory;
  severity: AdvisorSeverity;
  priority: number;

  titleKey: string;
  messageKey: string;

  title: string;
  message: string;

  variables?: Record<string, string | number>;
  suggestedAction?: string;
};

export type DashboardMetrics = {
  totalProcesses: number;
  activeProcesses: number;
  completedProcesses: number;
  pausedProcesses: number;
  blockedProcesses: number;

  totalDocuments: number;
  completedDocuments: number;
  missingRequiredDocuments: number;

  criticalIssues: number;
  warnings: number;

  averageReadinessScore: number;
  averageProcessHealthScore: number;
  averageDocumentHealthScore: number;
  averageConfidenceScore: number;
  averageOcrQualityScore: number | null;

  nearestDeadlineDays: number | null;
  totalEstimatedPreparationDays: number;
};

export type DashboardAdvisorResult = {
  generatedAt: string;

  overallHealthScore: number;
  overallHealthLabel: DashboardHealthLabel;

  metrics: DashboardMetrics;

  processes: DashboardProcessSummary[];

  recommendations: DashboardRecommendation[];
  priorityQueue: DashboardRecommendation[];
  nextBestAction: DashboardRecommendation | null;

  criticalProcesses: DashboardProcessSummary[];
  attentionProcesses: DashboardProcessSummary[];
  healthyProcesses: DashboardProcessSummary[];
  completedProcesses: DashboardProcessSummary[];

  hasBlockingIssues: boolean;
  isReadyForSubmission: boolean;
};

const COMPLETED_PROCESS_STATUSES = new Set([
  "completed",
  "approved",
  "submitted",
  "finished",
]);

const PAUSED_PROCESS_STATUSES = new Set([
  "paused",
  "on_hold",
]);

const INACTIVE_PROCESS_STATUSES = new Set([
  "cancelled",
  "rejected",
]);

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

function normalizeStatus(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return clamp(
    values.reduce(
      (sum, value) => sum + value,
      0,
    ) / values.length,
  );
}

function nullableAverage(
  values: Array<number | null>,
): number | null {
  const validValues = values.filter(
    (value): value is number =>
      typeof value === "number" &&
      Number.isFinite(value),
  );

  if (validValues.length === 0) {
    return null;
  }

  return average(validValues);
}

function severityWeight(
  severity: AdvisorSeverity,
): number {
  switch (severity) {
    case "critical":
      return 400;
    case "warning":
      return 300;
    case "info":
      return 200;
    case "success":
      return 100;
  }
}

function getDashboardHealthLabel(
  score: number,
): DashboardHealthLabel {
  if (score >= 85) {
    return "excellent";
  }

  if (score >= 70) {
    return "good";
  }

  if (score >= 45) {
    return "attention";
  }

  return "critical";
}

function getDashboardProcessStatus(
  result: ProcessAdvisorResult,
  processStatus?: string,
): DashboardProcessStatus {
  const normalizedStatus =
    normalizeStatus(processStatus);

  if (
    COMPLETED_PROCESS_STATUSES.has(
      normalizedStatus,
    ) ||
    (
      result.readiness.missingRequiredItems === 0 &&
      result.criticalCount === 0 &&
      result.processHealthScore >= 85
    )
  ) {
    return "complete";
  }

  if (
    result.hasBlockingIssues ||
    result.processHealthScore < 40 ||
    result.deadline.status === "expired" ||
    result.deadline.status === "today"
  ) {
    return "critical";
  }

  if (
    result.warningCount > 0 ||
    result.processHealthScore < 75 ||
    result.deadline.status === "urgent" ||
    result.deadline.status === "approaching"
  ) {
    return "attention";
  }

  return "healthy";
}

function mapRecommendationCategory(
  recommendation: AdvisorRecommendation,
): DashboardRecommendationCategory {
  switch (recommendation.category) {
    case "missing_document":
    case "document_quality":
    case "document_readability":
    case "document_match":
    case "document_expiry":
    case "ocr_error":
    case "document_warning":
    case "document_risk":
      return "document";

    case "deadline":
      return "deadline";

    case "process_complete":
      return "complete";

    case "process_status":
    default:
      return "process";
  }
}

function createDashboardRecommendation(
  process: AdvisorProcess,
  recommendation: AdvisorRecommendation,
): DashboardRecommendation {
  return {
    id: recommendation.id,
    processId: process.id,
    processTitle: process.title,
    documentKey: recommendation.documentKey,

    category:
      mapRecommendationCategory(
        recommendation,
      ),

    severity: recommendation.severity,
    priority:
      severityWeight(
        recommendation.severity,
      ) + recommendation.priority,

    titleKey: recommendation.titleKey,
    messageKey: recommendation.messageKey,

    title: recommendation.title,
    message: recommendation.message,

    variables: {
      ...(recommendation.variables || {}),
      process: process.title,
    },

    suggestedAction:
      recommendation.suggestedAction,
  };
}

function sortDashboardRecommendations(
  recommendations: DashboardRecommendation[],
): DashboardRecommendation[] {
  return [...recommendations].sort(
    (first, second) => {
      if (
        second.priority !== first.priority
      ) {
        return second.priority - first.priority;
      }

      return first.title.localeCompare(
        second.title,
      );
    },
  );
}

function buildProcessSummary(
  process: AdvisorProcess,
  result: ProcessAdvisorResult,
): DashboardProcessSummary {
  return {
    processId: process.id,
    title: process.title,
    category: process.category,
    country: process.country,
    status: process.status,

    readinessScore:
      result.readiness.score,
    processHealthScore:
      result.processHealthScore,
    documentHealthScore:
      result.documentHealthScore,
    confidenceScore:
      result.confidenceScore,
    ocrQualityScore:
      result.ocrQualityScore,

    completedItems:
      result.readiness.completedItems,
    totalItems:
      result.readiness.totalItems,
    missingRequiredItems:
      result.readiness.missingRequiredItems,

    criticalCount:
      result.criticalCount,
    warningCount:
      result.warningCount,

    estimatedPreparationDays:
      result.estimatedPreparationDays,
    hasBlockingIssues:
      result.hasBlockingIssues,

    deadlineStatus:
      result.deadline.status,
    daysRemaining:
      result.deadline.daysRemaining,

    dashboardStatus:
      getDashboardProcessStatus(
        result,
        process.status,
      ),

    nextBestAction:
      result.nextBestAction,
  };
}

function calculateNearestDeadlineDays(
  results: ProcessAdvisorResult[],
): number | null {
  const futureDeadlineDays = results
    .map(
      (result) =>
        result.deadline.daysRemaining,
    )
    .filter(
      (value): value is number =>
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0,
    );

  if (futureDeadlineDays.length === 0) {
    return null;
  }

  return Math.min(
    ...futureDeadlineDays,
  );
}

function calculateOverallHealthScore(
  metrics: DashboardMetrics,
): number {
  if (metrics.totalProcesses === 0) {
    return 0;
  }

  let score =
    metrics.averageReadinessScore * 0.4 +
    metrics.averageProcessHealthScore * 0.35 +
    metrics.averageDocumentHealthScore * 0.15 +
    metrics.averageConfidenceScore * 0.1;

  score -=
    metrics.blockedProcesses * 7;

  score -=
    metrics.criticalIssues * 3;

  score -=
    metrics.missingRequiredDocuments * 2;

  if (
    metrics.nearestDeadlineDays !== null
  ) {
    if (metrics.nearestDeadlineDays === 0) {
      score -= 20;
    } else if (
      metrics.nearestDeadlineDays <= 3
    ) {
      score -= 12;
    } else if (
      metrics.nearestDeadlineDays <= 7
    ) {
      score -= 6;
    }
  }

  return clamp(score);
}

function buildAccountRecommendations(
  metrics: DashboardMetrics,
): DashboardRecommendation[] {
  const recommendations:
    DashboardRecommendation[] = [];

  if (metrics.totalProcesses === 0) {
    recommendations.push({
      id: "dashboard:account:no-process",
      category: "account",
      severity: "info",
      priority: 220,
      titleKey: "noProcesses",
      messageKey: "noProcessesMessage",
      title: "No active process",
      message:
        "Create your first process to start receiving readiness and document guidance.",
      suggestedAction:
        "Create a new process.",
    });

    return recommendations;
  }

  if (
    metrics.missingRequiredDocuments > 0
  ) {
    recommendations.push({
      id:
        "dashboard:account:missing-required-documents",
      category: "account",
      severity: "critical",
      priority:
        420 +
        metrics.missingRequiredDocuments,
      titleKey:
        "missingRequiredDocuments",
      messageKey:
        "missingRequiredDocumentsMessage",
      title:
        "Required documents are missing",
      message: `${metrics.missingRequiredDocuments} required document(s) are still missing across your processes.`,
      variables: {
        count:
          metrics.missingRequiredDocuments,
      },
      suggestedAction:
        "Upload the missing required documents.",
    });
  }

  if (metrics.criticalIssues > 0) {
    recommendations.push({
      id:
        "dashboard:account:critical-issues",
      category: "account",
      severity: "critical",
      priority:
        430 + metrics.criticalIssues,
      titleKey: "criticalIssues",
      messageKey:
        "criticalIssuesMessage",
      title:
        "Critical issues need attention",
      message: `${metrics.criticalIssues} critical issue(s) were detected across your processes.`,
      variables: {
        count: metrics.criticalIssues,
      },
      suggestedAction:
        "Review the highest-priority critical issue.",
    });
  }

  if (
    metrics.nearestDeadlineDays !== null &&
    metrics.nearestDeadlineDays <= 7
  ) {
    const severity: AdvisorSeverity =
      metrics.nearestDeadlineDays <= 3
        ? "critical"
        : "warning";

    recommendations.push({
      id:
        "dashboard:account:nearest-deadline",
      category: "deadline",
      severity,
      priority:
        severityWeight(severity) +
        50,
      titleKey: "nearestDeadline",
      messageKey:
        "nearestDeadlineMessage",
      title:
        "A deadline is approaching",
      message:
        metrics.nearestDeadlineDays === 0
          ? "One of your process deadlines is today."
          : `The nearest deadline is in ${metrics.nearestDeadlineDays} day(s).`,
      variables: {
        count:
          metrics.nearestDeadlineDays,
      },
      suggestedAction:
        "Prioritize the process with the nearest deadline.",
    });
  }

  if (
    metrics.missingRequiredDocuments === 0 &&
    metrics.criticalIssues === 0 &&
    metrics.averageReadinessScore >= 90
  ) {
    recommendations.push({
      id:
        "dashboard:account:ready",
      category: "complete",
      severity: "success",
      priority: 110,
      titleKey: "accountReady",
      messageKey:
        "accountReadyMessage",
      title:
        "Your processes are in strong condition",
      message:
        "No blocking issue was detected and your overall readiness is high.",
      suggestedAction:
        "Review the information once more before submission.",
    });
  }

  return recommendations;
}

export function analyzeDashboard(
  processes: AdvisorProcess[],
): DashboardAdvisorResult {
  const safeProcesses =
    Array.isArray(processes)
      ? processes
      : [];

  const analyzed = safeProcesses.map(
    (process) => ({
      process,
      result: analyzeProcess(process),
    }),
  );

  const processSummaries = analyzed.map(
    ({ process, result }) =>
      buildProcessSummary(
        process,
        result,
      ),
  );

  const processRecommendations =
    analyzed.flatMap(
      ({ process, result }) =>
        result.recommendations.map(
          (recommendation) =>
            createDashboardRecommendation(
              process,
              recommendation,
            ),
        ),
    );

  const totalDocuments =
    processSummaries.reduce(
      (sum, process) =>
        sum + process.totalItems,
      0,
    );

  const completedDocuments =
    processSummaries.reduce(
      (sum, process) =>
        sum + process.completedItems,
      0,
    );

  const missingRequiredDocuments =
    processSummaries.reduce(
      (sum, process) =>
        sum +
        process.missingRequiredItems,
      0,
    );

  const criticalIssues =
    processSummaries.reduce(
      (sum, process) =>
        sum + process.criticalCount,
      0,
    );

  const warnings =
    processSummaries.reduce(
      (sum, process) =>
        sum + process.warningCount,
      0,
    );

  const blockedProcesses =
    processSummaries.filter(
      (process) =>
        process.hasBlockingIssues,
    ).length;

  const completedProcesses =
    safeProcesses.filter((process) =>
      COMPLETED_PROCESS_STATUSES.has(
        normalizeStatus(process.status),
      ),
    ).length;

  const pausedProcesses =
    safeProcesses.filter((process) =>
      PAUSED_PROCESS_STATUSES.has(
        normalizeStatus(process.status),
      ),
    ).length;

  const inactiveProcesses =
    safeProcesses.filter((process) =>
      INACTIVE_PROCESS_STATUSES.has(
        normalizeStatus(process.status),
      ),
    ).length;

  const activeProcesses =
    Math.max(
      0,
      safeProcesses.length -
        completedProcesses -
        pausedProcesses -
        inactiveProcesses,
    );

  const metrics: DashboardMetrics = {
    totalProcesses:
      safeProcesses.length,
    activeProcesses,
    completedProcesses,
    pausedProcesses,
    blockedProcesses,

    totalDocuments,
    completedDocuments,
    missingRequiredDocuments,

    criticalIssues,
    warnings,

    averageReadinessScore: average(
      processSummaries.map(
        (process) =>
          process.readinessScore,
      ),
    ),

    averageProcessHealthScore: average(
      processSummaries.map(
        (process) =>
          process.processHealthScore,
      ),
    ),

    averageDocumentHealthScore: average(
      processSummaries.map(
        (process) =>
          process.documentHealthScore,
      ),
    ),

    averageConfidenceScore: average(
      processSummaries.map(
        (process) =>
          process.confidenceScore,
      ),
    ),

    averageOcrQualityScore:
      nullableAverage(
        processSummaries.map(
          (process) =>
            process.ocrQualityScore,
        ),
      ),

    nearestDeadlineDays:
      calculateNearestDeadlineDays(
        analyzed.map(
          ({ result }) => result,
        ),
      ),

    totalEstimatedPreparationDays:
      processSummaries.reduce(
        (sum, process) =>
          sum +
          process.estimatedPreparationDays,
        0,
      ),
  };

  const accountRecommendations =
    buildAccountRecommendations(metrics);

  const recommendations =
    sortDashboardRecommendations([
      ...processRecommendations,
      ...accountRecommendations,
    ]);

  const overallHealthScore =
    calculateOverallHealthScore(
      metrics,
    );

  const criticalProcesses =
    processSummaries.filter(
      (process) =>
        process.dashboardStatus ===
        "critical",
    );

  const attentionProcesses =
    processSummaries.filter(
      (process) =>
        process.dashboardStatus ===
        "attention",
    );

  const healthyProcesses =
    processSummaries.filter(
      (process) =>
        process.dashboardStatus ===
        "healthy",
    );

  const completedProcessSummaries =
    processSummaries.filter(
      (process) =>
        process.dashboardStatus ===
        "complete",
    );

  const priorityQueue =
    recommendations
      .filter(
        (recommendation) =>
          recommendation.severity !==
          "success",
      )
      .slice(0, 10);

  const nextBestAction =
    priorityQueue[0] ??
    recommendations[0] ??
    null;

  const hasBlockingIssues =
    criticalIssues > 0 ||
    blockedProcesses > 0 ||
    missingRequiredDocuments > 0;

  const isReadyForSubmission =
    safeProcesses.length > 0 &&
    !hasBlockingIssues &&
    metrics.averageReadinessScore >= 90;

  return {
    generatedAt:
      new Date().toISOString(),

    overallHealthScore,
    overallHealthLabel:
      getDashboardHealthLabel(
        overallHealthScore,
      ),

    metrics,

    processes:
      [...processSummaries].sort(
        (first, second) => {
          if (
            second.hasBlockingIssues !==
            first.hasBlockingIssues
          ) {
            return first.hasBlockingIssues
              ? -1
              : 1;
          }

          return (
            first.processHealthScore -
            second.processHealthScore
          );
        },
      ),

    recommendations,
    priorityQueue,
    nextBestAction,

    criticalProcesses,
    attentionProcesses,
    healthyProcesses,
    completedProcesses:
      completedProcessSummaries,

    hasBlockingIssues,
    isReadyForSubmission,
  };
}

export function getDashboardAdvisorSummary(
  result: DashboardAdvisorResult,
) {
  return {
    overallHealthScore:
      result.overallHealthScore,
    overallHealthLabel:
      result.overallHealthLabel,

    totalProcesses:
      result.metrics.totalProcesses,
    activeProcesses:
      result.metrics.activeProcesses,
    completedProcesses:
      result.metrics.completedProcesses,

    averageReadinessScore:
      result.metrics.averageReadinessScore,

    missingRequiredDocuments:
      result.metrics
        .missingRequiredDocuments,

    criticalIssues:
      result.metrics.criticalIssues,
    warnings:
      result.metrics.warnings,

    nearestDeadlineDays:
      result.metrics.nearestDeadlineDays,

    hasBlockingIssues:
      result.hasBlockingIssues,
    isReadyForSubmission:
      result.isReadyForSubmission,

    nextBestAction:
      result.nextBestAction,
  };
}

export function getDashboardPriorityQueue(
  result: DashboardAdvisorResult,
  limit = 5,
): DashboardRecommendation[] {
  return result.priorityQueue.slice(
    0,
    Math.max(0, limit),
  );
}

export function getMostUrgentProcess(
  result: DashboardAdvisorResult,
): DashboardProcessSummary | null {
  return (
    result.processes.find(
      (process) =>
        process.dashboardStatus ===
        "critical",
    ) ??
    result.processes.find(
      (process) =>
        process.dashboardStatus ===
        "attention",
    ) ??
    result.processes[0] ??
    null
  );
}