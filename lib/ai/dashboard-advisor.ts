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

export type DashboardAdvisorLocale =
  | "en"
  | "de"
  | "tr"
  | "ru"
  | "ar"
  | "fa";

type DashboardAdvisorCopy = {
  noProcessesTitle: string;
  noProcessesMessage: string;
  noProcessesAction: string;
  missingDocumentsTitle: string;
  missingDocumentsMessage: (count: number) => string;
  missingDocumentsAction: string;
  criticalIssuesTitle: string;
  criticalIssuesMessage: (count: number) => string;
  criticalIssuesAction: string;
  nearestDeadlineTitle: string;
  deadlineTodayMessage: string;
  nearestDeadlineMessage: (count: number) => string;
  nearestDeadlineAction: string;
  accountReadyTitle: string;
  accountReadyMessage: string;
  accountReadyAction: string;
};

const DASHBOARD_ADVISOR_COPY: Record<DashboardAdvisorLocale, DashboardAdvisorCopy> = {
  en: {
    noProcessesTitle: "No active process",
    noProcessesMessage: "Create your first process to start receiving readiness and document guidance.",
    noProcessesAction: "Create a new process.",
    missingDocumentsTitle: "Required documents are missing",
    missingDocumentsMessage: (count) => `${count} required document(s) are still missing across your processes.`,
    missingDocumentsAction: "Upload the missing required documents.",
    criticalIssuesTitle: "Critical issues need attention",
    criticalIssuesMessage: (count) => `${count} critical issue(s) were detected across your processes.`,
    criticalIssuesAction: "Review the highest-priority critical issue.",
    nearestDeadlineTitle: "A deadline is approaching",
    deadlineTodayMessage: "One of your process deadlines is today.",
    nearestDeadlineMessage: (count) => `The nearest deadline is in ${count} day(s).`,
    nearestDeadlineAction: "Prioritize the process with the nearest deadline.",
    accountReadyTitle: "Your processes are in strong condition",
    accountReadyMessage: "No blocking issue was detected and your overall readiness is high.",
    accountReadyAction: "Review the information once more before submission.",
  },
  de: {
    noProcessesTitle: "Kein aktiver Vorgang",
    noProcessesMessage: "Erstellen Sie Ihren ersten Vorgang, um Hinweise zur Bereitschaft und zu Dokumenten zu erhalten.",
    noProcessesAction: "Neuen Vorgang erstellen.",
    missingDocumentsTitle: "Erforderliche Dokumente fehlen",
    missingDocumentsMessage: (count) => `In Ihren Vorgängen fehlen noch ${count} erforderliche Dokumente.`,
    missingDocumentsAction: "Fehlende erforderliche Dokumente hochladen.",
    criticalIssuesTitle: "Kritische Probleme erfordern Aufmerksamkeit",
    criticalIssuesMessage: (count) => `In Ihren Vorgängen wurden ${count} kritische Probleme erkannt.`,
    criticalIssuesAction: "Das kritischste Problem mit höchster Priorität prüfen.",
    nearestDeadlineTitle: "Eine Frist rückt näher",
    deadlineTodayMessage: "Eine Frist in einem Ihrer Vorgänge endet heute.",
    nearestDeadlineMessage: (count) => `Die nächste Frist endet in ${count} Tagen.`,
    nearestDeadlineAction: "Den Vorgang mit der nächsten Frist priorisieren.",
    accountReadyTitle: "Ihre Vorgänge sind in einem sehr guten Zustand",
    accountReadyMessage: "Es wurden keine blockierenden Probleme erkannt und Ihre Gesamtbereitschaft ist hoch.",
    accountReadyAction: "Die Angaben vor dem Einreichen noch einmal prüfen.",
  },
  tr: {
    noProcessesTitle: "Aktif süreç yok",
    noProcessesMessage: "Hazırlık ve belge yönlendirmeleri almaya başlamak için ilk sürecinizi oluşturun.",
    noProcessesAction: "Yeni bir süreç oluştur.",
    missingDocumentsTitle: "Gerekli belgeler eksik",
    missingDocumentsMessage: (count) => `Süreçlerinizde hâlâ ${count} gerekli belge eksik.`,
    missingDocumentsAction: "Eksik gerekli belgeleri yükleyin.",
    criticalIssuesTitle: "Kritik sorunların incelenmesi gerekiyor",
    criticalIssuesMessage: (count) => `Süreçlerinizde ${count} kritik sorun tespit edildi.`,
    criticalIssuesAction: "En yüksek öncelikli kritik sorunu inceleyin.",
    nearestDeadlineTitle: "Bir son tarih yaklaşıyor",
    deadlineTodayMessage: "Süreçlerinizden birinin son tarihi bugün.",
    nearestDeadlineMessage: (count) => `En yakın son tarihe ${count} gün kaldı.`,
    nearestDeadlineAction: "En yakın son tarihe sahip sürece öncelik verin.",
    accountReadyTitle: "Süreçleriniz güçlü durumda",
    accountReadyMessage: "Engelleyici bir sorun tespit edilmedi ve genel hazırlık seviyeniz yüksek.",
    accountReadyAction: "Göndermeden önce bilgileri bir kez daha kontrol edin.",
  },
  ru: {
    noProcessesTitle: "Нет активного процесса",
    noProcessesMessage: "Создайте свой первый процесс, чтобы получать рекомендации по готовности и документам.",
    noProcessesAction: "Создать новый процесс.",
    missingDocumentsTitle: "Отсутствуют обязательные документы",
    missingDocumentsMessage: (count) => `В ваших процессах всё ещё отсутствует обязательных документов: ${count}.`,
    missingDocumentsAction: "Загрузить отсутствующие обязательные документы.",
    criticalIssuesTitle: "Критические проблемы требуют внимания",
    criticalIssuesMessage: (count) => `В ваших процессах обнаружено критических проблем: ${count}.`,
    criticalIssuesAction: "Проверить критическую проблему с наивысшим приоритетом.",
    nearestDeadlineTitle: "Приближается срок",
    deadlineTodayMessage: "Срок одного из ваших процессов истекает сегодня.",
    nearestDeadlineMessage: (count) => `До ближайшего срока осталось дней: ${count}.`,
    nearestDeadlineAction: "Отдать приоритет процессу с ближайшим сроком.",
    accountReadyTitle: "Ваши процессы находятся в хорошем состоянии",
    accountReadyMessage: "Блокирующих проблем не обнаружено, а общий уровень готовности высокий.",
    accountReadyAction: "Ещё раз проверить информацию перед отправкой.",
  },
  ar: {
    noProcessesTitle: "لا توجد عملية نشطة",
    noProcessesMessage: "أنشئ عمليتك الأولى لبدء تلقي إرشادات الجاهزية والمستندات.",
    noProcessesAction: "إنشاء عملية جديدة.",
    missingDocumentsTitle: "المستندات المطلوبة غير مكتملة",
    missingDocumentsMessage: (count) => `لا يزال هناك ${count} من المستندات المطلوبة المفقودة في عملياتك.`,
    missingDocumentsAction: "رفع المستندات المطلوبة المفقودة.",
    criticalIssuesTitle: "توجد مشكلات حرجة تحتاج إلى الانتباه",
    criticalIssuesMessage: (count) => `تم اكتشاف ${count} من المشكلات الحرجة في عملياتك.`,
    criticalIssuesAction: "مراجعة المشكلة الحرجة ذات الأولوية الأعلى.",
    nearestDeadlineTitle: "موعد نهائي يقترب",
    deadlineTodayMessage: "الموعد النهائي لإحدى عملياتك هو اليوم.",
    nearestDeadlineMessage: (count) => `يتبقى ${count} يومًا على أقرب موعد نهائي.`,
    nearestDeadlineAction: "إعطاء الأولوية للعملية ذات الموعد النهائي الأقرب.",
    accountReadyTitle: "عملياتك في حالة جيدة",
    accountReadyMessage: "لم يتم اكتشاف أي مشكلة مانعة ومستوى جاهزيتك العام مرتفع.",
    accountReadyAction: "مراجعة المعلومات مرة أخرى قبل الإرسال.",
  },
  fa: {
    noProcessesTitle: "فرایند فعالی وجود ندارد",
    noProcessesMessage:
      "برای دریافت راهنمایی درباره آمادگی و مدارک، نخستین فرایند خود را ایجاد کنید.",
    noProcessesAction: "ایجاد فرایند جدید.",

    missingDocumentsTitle:
      "مدارک الزامی ناقص هستند",
    missingDocumentsMessage: (count) =>
      `هنوز ${count} مدرک الزامی در فرایندهای شما ناقص است.`,
    missingDocumentsAction:
      "مدارک الزامیِ ناقص را بارگذاری کنید.",

    criticalIssuesTitle:
      "مشکلات بحرانی نیاز به بررسی دارند",
    criticalIssuesMessage: (count) =>
      `${count} مشکل بحرانی در فرایندهای شما شناسایی شد.`,
    criticalIssuesAction:
      "مهم‌ترین مشکل بحرانی را بررسی کنید.",

    nearestDeadlineTitle: "یک مهلت در حال نزدیک شدن است",
    deadlineTodayMessage:
      "مهلت یکی از فرایندهای شما امروز است.",
    nearestDeadlineMessage: (count) =>
      `${count} روز تا نزدیک‌ترین مهلت باقی مانده است.`,
    nearestDeadlineAction:
      "فرایندی را که نزدیک‌ترین مهلت را دارد در اولویت قرار دهید.",

    accountReadyTitle:
      "فرایندهای شما در وضعیت خوبی قرار دارند",
    accountReadyMessage:
      "هیچ مشکل مسدودکننده‌ای شناسایی نشد و سطح کلی آمادگی شما بالاست.",
    accountReadyAction:
      "پیش از ارسال، اطلاعات را یک بار دیگر بررسی کنید.",
  },
};

function normalizeDashboardLocale(locale?: string): DashboardAdvisorLocale {
  const normalized = normalizeText(locale).toLowerCase().split("-")[0];
  if (normalized === "de" || normalized === "tr" || normalized === "ru" || normalized === "ar" || normalized === "fa") {
    return normalized;
  }
  return "en";
}

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
  locale: DashboardAdvisorLocale,
): DashboardRecommendation[] {
  const recommendations:
    DashboardRecommendation[] = [];

  const copy = DASHBOARD_ADVISOR_COPY[locale];

  if (metrics.totalProcesses === 0) {
    recommendations.push({
      id: "dashboard:account:no-process",
      category: "account",
      severity: "info",
      priority: 220,
      titleKey: "noProcesses",
      messageKey: "noProcessesMessage",
      title: copy.noProcessesTitle,
      message: copy.noProcessesMessage,
      suggestedAction:
        copy.noProcessesAction,
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
        copy.missingDocumentsTitle,
      message:
        copy.missingDocumentsMessage(
          metrics.missingRequiredDocuments,
        ),
      variables: {
        count:
          metrics.missingRequiredDocuments,
      },
      suggestedAction:
        copy.missingDocumentsAction,
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
        copy.criticalIssuesTitle,
      message:
        copy.criticalIssuesMessage(
          metrics.criticalIssues,
        ),
      variables: {
        count: metrics.criticalIssues,
      },
      suggestedAction:
        copy.criticalIssuesAction,
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
        copy.nearestDeadlineTitle,
      message:
        metrics.nearestDeadlineDays === 0
          ? copy.deadlineTodayMessage
          : copy.nearestDeadlineMessage(
              metrics.nearestDeadlineDays,
            ),
      variables: {
        count:
          metrics.nearestDeadlineDays,
      },
      suggestedAction:
        copy.nearestDeadlineAction,
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
        copy.accountReadyTitle,
      message:
        copy.accountReadyMessage,
      suggestedAction:
        copy.accountReadyAction,
    });
  }

  return recommendations;
}

export function analyzeDashboard(
  processes: AdvisorProcess[],
  locale: string = "en",
): DashboardAdvisorResult {
  const dashboardLocale =
    normalizeDashboardLocale(locale);

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
    buildAccountRecommendations(
      metrics,
      dashboardLocale,
    );

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