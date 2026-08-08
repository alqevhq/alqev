/**
 * ALQEV / Humanity OS
 * Deterministic Notification Advisor
 *
 * Generates user-facing notifications from process, document, OCR,
 * deadline, and readiness data without calling an external AI model.
 */

export type NotificationSeverity =
  | "critical"
  | "warning"
  | "info"
  | "success";

export type NotificationCategory =
  | "deadline"
  | "document"
  | "ocr"
  | "readiness"
  | "process"
  | "system";

export type NotificationActionType =
  | "open_process"
  | "open_document"
  | "upload_document"
  | "review_document"
  | "open_dashboard"
  | "none";

export type NotificationStatus = "unread" | "read" | "dismissed";

export type NotificationDocument = {
  key?: string;
  id?: string;
  title?: string;
  description?: string;
  required?: boolean;
  status?: string;
  fileName?: string;
  fileUrl?: string;
  ocrStatus?: string;
  ocrConfidence?: number | null;
  confidence?: number | null;
  matchScore?: number | null;
  documentMatchScore?: number | null;
  validationStatus?: string;
  ocrError?: string;
  ocr?: {
    rawText?: string;
    documentType?: string;
    fields?: Array<{
      key?: string;
      label?: string;
      value?: string;
      confidence?: number;
    }>;
    intelligence?: {
      documentType?: string;
      documentMatch?: "match" | "possible_match" | "mismatch" | "unknown";
      qualityScore?: number;
      isReadable?: boolean;
      expiryStatus?:
        | "valid"
        | "expiring_soon"
        | "expired"
        | "not_applicable"
        | "unknown";
      warnings?: Array<{
        code?: string;
        severity?: "info" | "warning" | "critical";
        message?: string;
      }>;
      risks?: Array<{
        code?: string;
        severity?: "info" | "warning" | "critical";
        message?: string;
      }>;
    };
  } | null;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type NotificationProcess = {
  id: string;
  title?: string;
  description?: string;
  templateKey?: string;
  status?: string;
  progress?: number;
  deadline?: string | Date | null;
  targetDate?: string | Date | null;
  completedDocumentCount?: number;
  totalDocumentCount?: number;
  requiredDocuments?: NotificationDocument[];
  documents?: NotificationDocument[];
  readinessScore?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type NotificationAction = {
  type: NotificationActionType;
  label: string;
  href: string | null;
};

export type AdvisorNotification = {
  id: string;
  deduplicationKey: string;
  processId: string | null;
  documentId: string | null;
  category: NotificationCategory;
  severity: NotificationSeverity;
  status: NotificationStatus;
  priority: number;
  title: string;
  message: string;
  action: NotificationAction;
  createdAt: string;
  expiresAt: string | null;
  metadata: {
    processTitle?: string;
    documentTitle?: string;
    daysUntilDeadline?: number;
    readinessScore?: number;
    ocrConfidence?: number;
    matchScore?: number;
    reason?: string;
  };
};

export type NotificationAdvisorOptions = {
  now?: Date;
  language?: "tr" | "de" | "en" | "ru" | "ar" | "fa";
  includeSuccess?: boolean;
  includeInfo?: boolean;
  maxNotifications?: number;
  deadlineWarningDays?: number[];
  lowOcrThreshold?: number;
  lowMatchThreshold?: number;
};

export type NotificationAdvisorResult = {
  notifications: AdvisorNotification[];
  unreadCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  successCount: number;
  highestPriority: AdvisorNotification | null;
  generatedAt: string;
};

const DEFAULT_DEADLINE_WARNING_DAYS = [30, 14, 7, 3, 1, 0];
const DEFAULT_LOW_OCR_THRESHOLD = 0.72;
const DEFAULT_LOW_MATCH_THRESHOLD = 0.65;
const DEFAULT_MAX_NOTIFICATIONS = 50;

const COMPLETED_PROCESS_STATUSES = new Set([
  "completed",
  "done",
  "finished",
  "closed",
  "approved",
  "submitted",
]);

const COMPLETED_DOCUMENT_STATUSES = new Set([
  "uploaded",
  "approved",
  "completed",
  "verified",
  "accepted",
  "done",
]);

const FAILED_OCR_STATUSES = new Set([
  "failed",
  "error",
  "rejected",
  "unreadable",
]);

const PENDING_OCR_STATUSES = new Set([
  "pending",
  "processing",
  "queued",
]);

const INVALID_DOCUMENT_STATUSES = new Set([
  "invalid",
  "rejected",
  "mismatch",
  "needs_review",
  "review_required",
]);

const copy = {
  tr: {
    untitledProcess: "Başlıksız süreç",
    untitledDocument: "Başlıksız belge",
    openProcess: "Süreci aç",
    openDocument: "Belgeyi aç",
    uploadDocument: "Belge yükle",
    reviewDocument: "Belgeyi incele",
    openDashboard: "Dashboard'u aç",

    overdueTitle: "Süreç gecikmiş durumda",
    overdueMessage:
      "“{process}” sürecinin hedef tarihi {days} gün önce geçti. Süreci hemen kontrol et.",

    dueTodayTitle: "Son tarih bugün",
    dueTodayMessage:
      "“{process}” sürecinin hedef tarihi bugün. Eksik adımları tamamlamayı unutma.",

    deadlineTitle: "Yaklaşan son tarih",
    deadlineMessage:
      "“{process}” sürecinin hedef tarihine {days} gün kaldı.",

    missingRequiredTitle: "Zorunlu belge eksik",
    missingRequiredMessage:
      "“{process}” süreci için “{document}” belgesini yüklemen gerekiyor.",

    ocrFailedTitle: "Belge okunamadı",
    ocrFailedMessage:
      "“{document}” belgesi otomatik olarak okunamadı. Belgeyi yeniden yükle veya manuel olarak kontrol et.",

    ocrPendingTitle: "Belge analizi devam ediyor",
    ocrPendingMessage:
      "“{document}” belgesinin analizi henüz tamamlanmadı.",

    lowOcrTitle: "Belge kalitesi düşük",
    lowOcrMessage:
      "“{document}” belgesinin okuma güveni %{score}. Daha net bir kopya yüklemen gerekebilir.",

    mismatchTitle: "Belge eşleşmesi kontrol edilmeli",
    mismatchMessage:
      "“{document}” belgesi beklenen belge türüyle yeterince eşleşmiyor. Belgeyi kontrol et.",

    invalidDocumentTitle: "Belge inceleme bekliyor",
    invalidDocumentMessage:
      "“{document}” belgesi doğrulama kontrolünden geçemedi veya manuel inceleme gerekiyor.",

    readyTitle: "Süreç başvuruya hazır",
    readyMessage:
      "“{process}” sürecindeki zorunlu belgeler tamamlandı. Son kontrolleri yapabilirsin.",

    progressTitle: "Süreç ilerliyor",
    progressMessage:
      "“{process}” sürecinin hazırlık seviyesi %{score}. Kalan adımları tamamlamaya devam et.",

    emptyTitle: "İlk sürecini oluştur",
    emptyMessage:
      "Kişisel yol haritası ve akıllı bildirimler için ilk sürecini başlat.",
  },

  de: {
    untitledProcess: "Unbenannter Vorgang",
    untitledDocument: "Unbenanntes Dokument",
    openProcess: "Vorgang öffnen",
    openDocument: "Dokument öffnen",
    uploadDocument: "Dokument hochladen",
    reviewDocument: "Dokument prüfen",
    openDashboard: "Dashboard öffnen",

    overdueTitle: "Vorgang ist überfällig",
    overdueMessage:
      "Die Frist für „{process}“ ist seit {days} Tagen abgelaufen. Prüfe den Vorgang sofort.",

    dueTodayTitle: "Frist ist heute",
    dueTodayMessage:
      "Die Frist für „{process}“ ist heute. Schließe die fehlenden Schritte ab.",

    deadlineTitle: "Bevorstehende Frist",
    deadlineMessage:
      "Bis zur Frist für „{process}“ bleiben noch {days} Tage.",

    missingRequiredTitle: "Pflichtdokument fehlt",
    missingRequiredMessage:
      "Für „{process}“ musst du das Dokument „{document}“ hochladen.",

    ocrFailedTitle: "Dokument konnte nicht gelesen werden",
    ocrFailedMessage:
      "Das Dokument „{document}“ konnte nicht automatisch gelesen werden. Lade es erneut hoch oder prüfe es manuell.",

    ocrPendingTitle: "Dokumentanalyse läuft",
    ocrPendingMessage:
      "Die Analyse des Dokuments „{document}“ ist noch nicht abgeschlossen.",

    lowOcrTitle: "Dokumentqualität ist niedrig",
    lowOcrMessage:
      "Die Lesesicherheit für „{document}“ beträgt %{score}. Möglicherweise ist eine bessere Kopie erforderlich.",

    mismatchTitle: "Dokumentzuordnung prüfen",
    mismatchMessage:
      "„{document}“ stimmt nicht ausreichend mit dem erwarteten Dokumenttyp überein.",

    invalidDocumentTitle: "Dokument wartet auf Prüfung",
    invalidDocumentMessage:
      "„{document}“ hat die Validierung nicht bestanden oder benötigt eine manuelle Prüfung.",

    readyTitle: "Vorgang ist antragsbereit",
    readyMessage:
      "Alle Pflichtdokumente für „{process}“ sind vollständig. Du kannst die Abschlussprüfung durchführen.",

    progressTitle: "Vorgang macht Fortschritte",
    progressMessage:
      "Der Vorbereitungsstand für „{process}“ beträgt %{score}. Bearbeite die verbleibenden Schritte.",

    emptyTitle: "Ersten Vorgang erstellen",
    emptyMessage:
      "Starte deinen ersten Vorgang für einen persönlichen Fahrplan und intelligente Hinweise.",
  },

  en: {
    untitledProcess: "Untitled process",
    untitledDocument: "Untitled document",
    openProcess: "Open process",
    openDocument: "Open document",
    uploadDocument: "Upload document",
    reviewDocument: "Review document",
    openDashboard: "Open dashboard",

    overdueTitle: "Process is overdue",
    overdueMessage:
      "The deadline for “{process}” passed {days} days ago. Review the process now.",

    dueTodayTitle: "Deadline is today",
    dueTodayMessage:
      "The deadline for “{process}” is today. Complete the remaining steps.",

    deadlineTitle: "Upcoming deadline",
    deadlineMessage:
      "There are {days} days left until the deadline for “{process}”.",

    missingRequiredTitle: "Required document is missing",
    missingRequiredMessage:
      "You need to upload “{document}” for “{process}”.",

    ocrFailedTitle: "Document could not be read",
    ocrFailedMessage:
      "“{document}” could not be read automatically. Upload it again or review it manually.",

    ocrPendingTitle: "Document analysis is in progress",
    ocrPendingMessage:
      "The analysis of “{document}” has not finished yet.",

    lowOcrTitle: "Document quality is low",
    lowOcrMessage:
      "The reading confidence for “{document}” is %{score}. A clearer copy may be required.",

    mismatchTitle: "Document match needs review",
    mismatchMessage:
      "“{document}” does not match the expected document type closely enough.",

    invalidDocumentTitle: "Document needs review",
    invalidDocumentMessage:
      "“{document}” failed validation or requires manual review.",

    readyTitle: "Process is ready to apply",
    readyMessage:
      "All required documents for “{process}” are complete. You can perform the final checks.",

    progressTitle: "Process is progressing",
    progressMessage:
      "The readiness level for “{process}” is %{score}. Continue with the remaining steps.",

    emptyTitle: "Create your first process",
    emptyMessage:
      "Start your first process to receive a personal roadmap and intelligent notifications.",
  },

  ru: {
    untitledProcess: "Процесс без названия",
    untitledDocument: "Документ без названия",
    openProcess: "Открыть процесс",
    openDocument: "Открыть документ",
    uploadDocument: "Загрузить документ",
    reviewDocument: "Проверить документ",
    openDashboard: "Открыть панель",

    overdueTitle: "Срок процесса истёк",
    overdueMessage:
      "Срок для «{process}» истёк {days} дн. назад. Проверьте процесс как можно скорее.",

    dueTodayTitle: "Срок сегодня",
    dueTodayMessage:
      "Срок для «{process}» — сегодня. Завершите оставшиеся шаги.",

    deadlineTitle: "Приближается срок",
    deadlineMessage:
      "До срока для «{process}» осталось {days} дн.",

    missingRequiredTitle: "Не хватает обязательного документа",
    missingRequiredMessage:
      "Для «{process}» необходимо загрузить документ «{document}».",

    ocrFailedTitle: "Документ не удалось прочитать",
    ocrFailedMessage:
      "Документ «{document}» не удалось автоматически распознать. Загрузите его повторно или проверьте вручную.",

    ocrPendingTitle: "Анализ документа продолжается",
    ocrPendingMessage:
      "Анализ документа «{document}» ещё не завершён.",

    lowOcrTitle: "Низкое качество документа",
    lowOcrMessage:
      "Качество чтения документа «{document}» — %{score}. Возможно, потребуется более чёткая копия.",

    mismatchTitle: "Нужно проверить соответствие документа",
    mismatchMessage:
      "Документ «{document}» недостаточно соответствует ожидаемому типу документа.",

    invalidDocumentTitle: "Документ требует проверки",
    invalidDocumentMessage:
      "Документ «{document}» не прошёл проверку или требует ручного рассмотрения.",

    readyTitle: "Процесс готов к подаче",
    readyMessage:
      "Все обязательные документы для «{process}» готовы. Можно выполнить финальную проверку.",

    progressTitle: "Процесс продвигается",
    progressMessage:
      "Готовность «{process}» составляет %{score}. Продолжайте выполнять оставшиеся шаги.",

    emptyTitle: "Создайте первый процесс",
    emptyMessage:
      "Запустите первый процесс, чтобы получать персональный план и умные уведомления.",
  },

  ar: {
    untitledProcess: "إجراء بلا عنوان",
    untitledDocument: "وثيقة بلا عنوان",
    openProcess: "فتح الإجراء",
    openDocument: "فتح الوثيقة",
    uploadDocument: "رفع الوثيقة",
    reviewDocument: "مراجعة الوثيقة",
    openDashboard: "فتح لوحة التحكم",

    overdueTitle: "انتهت مهلة الإجراء",
    overdueMessage:
      "انتهت مهلة «{process}» منذ {days} يومًا. راجع الإجراء الآن.",

    dueTodayTitle: "المهلة اليوم",
    dueTodayMessage:
      "مهلة «{process}» هي اليوم. أكمل الخطوات المتبقية.",

    deadlineTitle: "موعد نهائي قريب",
    deadlineMessage:
      "تبقى {days} يومًا حتى موعد «{process}».",

    missingRequiredTitle: "وثيقة إلزامية مفقودة",
    missingRequiredMessage:
      "يجب رفع وثيقة «{document}» لإجراء «{process}».",

    ocrFailedTitle: "تعذر قراءة الوثيقة",
    ocrFailedMessage:
      "تعذر قراءة «{document}» تلقائيًا. أعد رفعها أو راجعها يدويًا.",

    ocrPendingTitle: "تحليل الوثيقة جارٍ",
    ocrPendingMessage:
      "لم يكتمل تحليل «{document}» بعد.",

    lowOcrTitle: "جودة الوثيقة منخفضة",
    lowOcrMessage:
      "جودة قراءة «{document}» هي %{score}. قد تحتاج إلى نسخة أوضح.",

    mismatchTitle: "يجب مراجعة تطابق الوثيقة",
    mismatchMessage:
      "لا تتطابق «{document}» بشكل كافٍ مع نوع الوثيقة المتوقع.",

    invalidDocumentTitle: "الوثيقة تحتاج إلى مراجعة",
    invalidDocumentMessage:
      "لم تجتز «{document}» التحقق أو تحتاج إلى مراجعة يدوية.",

    readyTitle: "الإجراء جاهز للتقديم",
    readyMessage:
      "اكتملت جميع الوثائق الإلزامية لإجراء «{process}». يمكنك إجراء المراجعة النهائية.",

    progressTitle: "الإجراء يتقدم",
    progressMessage:
      "نسبة جاهزية «{process}» هي %{score}. تابع إكمال الخطوات المتبقية.",

    emptyTitle: "أنشئ أول إجراء",
    emptyMessage:
      "ابدأ أول إجراء للحصول على خارطة طريق شخصية وإشعارات ذكية.",
  },

  fa: {
    untitledProcess: "فرایند بدون عنوان",
    untitledDocument: "مدرک بدون عنوان",
    openProcess: "باز کردن فرایند",
    openDocument: "باز کردن مدرک",
    uploadDocument: "بارگذاری مدرک",
    reviewDocument: "بررسی مدرک",
    openDashboard: "باز کردن داشبورد",

    overdueTitle: "مهلت فرایند گذشته است",
    overdueMessage:
      "مهلت «{process}» {days} روز پیش گذشته است. فرایند را اکنون بررسی کنید.",

    dueTodayTitle: "مهلت امروز است",
    dueTodayMessage:
      "مهلت «{process}» امروز است. مراحل باقی‌مانده را کامل کنید.",

    deadlineTitle: "مهلت نزدیک است",
    deadlineMessage:
      "{days} روز تا مهلت «{process}» باقی مانده است.",

    missingRequiredTitle: "مدرک الزامی ناقص است",
    missingRequiredMessage:
      "برای «{process}» باید مدرک «{document}» را بارگذاری کنید.",

    ocrFailedTitle: "مدرک خوانده نشد",
    ocrFailedMessage:
      "«{document}» به‌صورت خودکار خوانده نشد. دوباره بارگذاری کنید یا دستی بررسی کنید.",

    ocrPendingTitle: "تحلیل مدرک ادامه دارد",
    ocrPendingMessage:
      "تحلیل «{document}» هنوز کامل نشده است.",

    lowOcrTitle: "کیفیت مدرک پایین است",
    lowOcrMessage:
      "کیفیت خواندن «{document}» برابر %{score} است. ممکن است نسخه واضح‌تری لازم باشد.",

    mismatchTitle: "تطابق مدرک باید بررسی شود",
    mismatchMessage:
      "«{document}» به اندازه کافی با نوع مدرک مورد انتظار مطابقت ندارد.",

    invalidDocumentTitle: "مدرک نیاز به بررسی دارد",
    invalidDocumentMessage:
      "«{document}» اعتبارسنجی را رد کرده یا به بررسی دستی نیاز دارد.",

    readyTitle: "فرایند آماده ارسال است",
    readyMessage:
      "همه مدارک الزامی «{process}» کامل هستند. می‌توانید بررسی نهایی را انجام دهید.",

    progressTitle: "فرایند در حال پیشرفت است",
    progressMessage:
      "آمادگی «{process}» برابر %{score} است. مراحل باقی‌مانده را ادامه دهید.",

    emptyTitle: "اولین فرایند را ایجاد کنید",
    emptyMessage:
      "برای دریافت نقشه راه شخصی و اعلان‌های هوشمند، اولین فرایند خود را شروع کنید.",
  },
} as const;

type Language = keyof typeof copy;

function normalizeLanguage(
  language: NotificationAdvisorOptions["language"],
): Language {
  return language === "de" ||
    language === "en" ||
    language === "ru" ||
    language === "ar" ||
    language === "fa"
    ? language
    : "tr";
}

function normalizeStatus(value: unknown): string {
  return typeof value === "string"
    ? value.trim().toLowerCase()
    : "";
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

function normalizeConfidence(value: unknown): number | null {
  const numberValue = normalizeNumber(value);

  if (numberValue === null) {
    return null;
  }

  if (numberValue > 1 && numberValue <= 100) {
    return numberValue / 100;
  }

  return Math.max(0, Math.min(1, numberValue));
}

function getDocumentOcrStatus(
  document: NotificationDocument,
): string {
  const explicit = normalizeStatus(document.ocrStatus);

  if (explicit) {
    return explicit;
  }

  if (
    typeof document.ocrError === "string" &&
    document.ocrError.trim()
  ) {
    return "failed";
  }

  if (document.ocr?.intelligence?.isReadable === false) {
    return "unreadable";
  }

  if (document.ocr) {
    return "completed";
  }

  return "";
}

function getDocumentOcrConfidence(
  document: NotificationDocument,
): number | null {
  const explicit = normalizeConfidence(
    document.ocrConfidence ?? document.confidence,
  );

  if (explicit !== null) {
    return explicit;
  }

  const qualityScore =
    document.ocr?.intelligence?.qualityScore;

  return normalizeConfidence(qualityScore);
}

function getDocumentMatchScore(
  document: NotificationDocument,
): number | null {
  const explicit = normalizeConfidence(
    document.matchScore ??
      document.documentMatchScore,
  );

  if (explicit !== null) {
    return explicit;
  }

  const documentMatch =
    document.ocr?.intelligence?.documentMatch;

  if (documentMatch === "match") {
    return 1;
  }

  if (documentMatch === "possible_match") {
    return 0.7;
  }

  if (documentMatch === "mismatch") {
    return 0;
  }

  return null;
}

function getDocumentValidationStatus(
  document: NotificationDocument,
): string {
  const explicit =
    normalizeStatus(document.validationStatus);

  if (explicit) {
    return explicit;
  }

  if (
    document.ocr?.intelligence?.documentMatch ===
    "mismatch"
  ) {
    return "mismatch";
  }

  const hasCriticalRisk =
    document.ocr?.intelligence?.risks?.some(
      (item) => item.severity === "critical",
    ) ?? false;

  if (hasCriticalRisk) {
    return "needs_review";
  }

  return "";
}

function formatPercent(value: number): string {
  return String(Math.round(value * 100));
}

function fillTemplate(
  template: string,
  variables: Record<string, string | number>,
): string {
  return Object.entries(variables).reduce(
    (result, [key, value]) =>
      result
        .replaceAll(`{${key}}`, String(value))
        .replaceAll(`%{${key}}`, `${String(value)}%`),
    template,
  );
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getTime());
  }

  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }

    const dateOnly = new Date(`${value}T00:00:00`);

    return Number.isNaN(dateOnly.getTime()) ? null : dateOnly;
  }

  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    try {
      const result = (
        value as { toDate: () => Date }
      ).toDate();

      return result instanceof Date &&
        !Number.isNaN(result.getTime())
        ? result
        : null;
    } catch {
      return null;
    }
  }

  return null;
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function getDaysUntil(
  value: unknown,
  now: Date,
): number | null {
  const target = toDate(value);

  if (!target) {
    return null;
  }

  return Math.ceil(
    (startOfDay(target).getTime() -
      startOfDay(now).getTime()) /
      86_400_000,
  );
}

function getDocuments(
  process: NotificationProcess,
): NotificationDocument[] {
  if (Array.isArray(process.requiredDocuments)) {
    return process.requiredDocuments;
  }

  if (Array.isArray(process.documents)) {
    return process.documents;
  }

  return [];
}

function isProcessCompleted(
  process: NotificationProcess,
): boolean {
  return COMPLETED_PROCESS_STATUSES.has(
    normalizeStatus(process.status),
  );
}

function isDocumentCompleted(
  document: NotificationDocument,
): boolean {
  if (
    COMPLETED_DOCUMENT_STATUSES.has(
      normalizeStatus(document.status),
    )
  ) {
    return true;
  }

  return Boolean(
    typeof document.fileUrl === "string" &&
      document.fileUrl.trim(),
  );
}

function getProcessReadiness(
  process: NotificationProcess,
): number {
  const explicitScore =
    normalizeNumber(process.readinessScore) ??
    normalizeNumber(process.progress);

  if (explicitScore !== null) {
    return Math.max(0, Math.min(100, Math.round(explicitScore)));
  }

  const documents = getDocuments(process);

  if (documents.length === 0) {
    return 0;
  }

  const required = documents.filter(
    (item) => item.required !== false,
  );

  const relevantDocuments =
    required.length > 0 ? required : documents;

  const completed = relevantDocuments.filter(
    isDocumentCompleted,
  ).length;

  return Math.round(
    (completed / relevantDocuments.length) * 100,
  );
}

function getDocumentId(
  document: NotificationDocument,
  index: number,
): string {
  return (
    document.id?.trim() ||
    document.key?.trim() ||
    `document-${index}`
  );
}

function makeId(parts: Array<string | number | null>): string {
  return parts
    .filter((part): part is string | number => part !== null)
    .map((part) =>
      String(part)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9ğüşöçıİ_-]+/gi, "-")
        .replace(/^-+|-+$/g, ""),
    )
    .filter(Boolean)
    .join(":");
}

function getPriority(
  severity: NotificationSeverity,
  category: NotificationCategory,
  daysUntilDeadline?: number,
): number {
  const severityScore: Record<NotificationSeverity, number> = {
    critical: 1000,
    warning: 700,
    info: 400,
    success: 100,
  };

  const categoryScore: Record<NotificationCategory, number> = {
    deadline: 90,
    document: 80,
    ocr: 70,
    readiness: 50,
    process: 40,
    system: 10,
  };

  let urgencyScore = 0;

  if (typeof daysUntilDeadline === "number") {
    if (daysUntilDeadline < 0) urgencyScore = 150;
    else if (daysUntilDeadline === 0) urgencyScore = 140;
    else if (daysUntilDeadline <= 1) urgencyScore = 120;
    else if (daysUntilDeadline <= 3) urgencyScore = 100;
    else if (daysUntilDeadline <= 7) urgencyScore = 70;
    else if (daysUntilDeadline <= 14) urgencyScore = 40;
    else urgencyScore = 10;
  }

  return (
    severityScore[severity] +
    categoryScore[category] +
    urgencyScore
  );
}

function processHref(processId: string): string {
  return `/processes/${encodeURIComponent(processId)}`;
}

function documentHref(
  processId: string,
  documentId: string,
): string {
  return `${processHref(processId)}?document=${encodeURIComponent(
    documentId,
  )}`;
}

function createNotification(input: {
  idParts: Array<string | number | null>;
  processId?: string | null;
  documentId?: string | null;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  message: string;
  action: NotificationAction;
  now: Date;
  expiresAt?: Date | null;
  daysUntilDeadline?: number;
  metadata?: AdvisorNotification["metadata"];
}): AdvisorNotification {
  const id = makeId(input.idParts);

  return {
    id,
    deduplicationKey: id,
    processId: input.processId ?? null,
    documentId: input.documentId ?? null,
    category: input.category,
    severity: input.severity,
    status: "unread",
    priority: getPriority(
      input.severity,
      input.category,
      input.daysUntilDeadline,
    ),
    title: input.title,
    message: input.message,
    action: input.action,
    createdAt: input.now.toISOString(),
    expiresAt:
      input.expiresAt instanceof Date
        ? input.expiresAt.toISOString()
        : null,
    metadata: input.metadata ?? {},
  };
}

function generateDeadlineNotifications(
  process: NotificationProcess,
  processTitle: string,
  now: Date,
  language: Language,
  warningDays: number[],
): AdvisorNotification[] {
  if (isProcessCompleted(process)) {
    return [];
  }

  const dictionary = copy[language];
  const deadline = process.deadline ?? process.targetDate;
  const daysUntil = getDaysUntil(deadline, now);

  if (daysUntil === null) {
    return [];
  }

  if (daysUntil < 0) {
    return [
      createNotification({
        idParts: ["deadline", "overdue", process.id],
        processId: process.id,
        category: "deadline",
        severity: "critical",
        title: dictionary.overdueTitle,
        message: fillTemplate(dictionary.overdueMessage, {
          process: processTitle,
          days: Math.abs(daysUntil),
        }),
        action: {
          type: "open_process",
          label: dictionary.openProcess,
          href: processHref(process.id),
        },
        now,
        daysUntilDeadline: daysUntil,
        metadata: {
          processTitle,
          daysUntilDeadline: daysUntil,
          reason: "deadline_overdue",
        },
      }),
    ];
  }

  const nextWarningThreshold = warningDays
    .filter((day) => day > 0)
    .sort((first, second) => first - second)
    .find((day) => daysUntil <= day);

  if (daysUntil > 0 && nextWarningThreshold === undefined) {
    return [];
  }

  if (daysUntil === 0) {
    return [
      createNotification({
        idParts: ["deadline", "today", process.id],
        processId: process.id,
        category: "deadline",
        severity: "critical",
        title: dictionary.dueTodayTitle,
        message: fillTemplate(dictionary.dueTodayMessage, {
          process: processTitle,
        }),
        action: {
          type: "open_process",
          label: dictionary.openProcess,
          href: processHref(process.id),
        },
        now,
        expiresAt: new Date(
          startOfDay(now).getTime() + 86_400_000,
        ),
        daysUntilDeadline: daysUntil,
        metadata: {
          processTitle,
          daysUntilDeadline: daysUntil,
          reason: "deadline_today",
        },
      }),
    ];
  }

  const severity: NotificationSeverity =
    daysUntil <= 3 ? "critical" : "warning";

  return [
    createNotification({
      idParts: [
        "deadline",
        `${nextWarningThreshold ?? daysUntil}-day-window`,
        process.id,
      ],
      processId: process.id,
      category: "deadline",
      severity,
      title: dictionary.deadlineTitle,
      message: fillTemplate(dictionary.deadlineMessage, {
        process: processTitle,
        days: daysUntil,
      }),
      action: {
        type: "open_process",
        label: dictionary.openProcess,
        href: processHref(process.id),
      },
      now,
      expiresAt: toDate(deadline),
      daysUntilDeadline: daysUntil,
      metadata: {
        processTitle,
        daysUntilDeadline: daysUntil,
        reason: "deadline_approaching",
      },
    }),
  ];
}

function generateDocumentNotifications(
  process: NotificationProcess,
  processTitle: string,
  now: Date,
  language: Language,
  lowOcrThreshold: number,
  lowMatchThreshold: number,
  includeInfo: boolean,
): AdvisorNotification[] {
  const dictionary = copy[language];
  const notifications: AdvisorNotification[] = [];
  const documents = getDocuments(process);

  documents.forEach((document, index) => {
    const documentId = getDocumentId(document, index);
    const documentTitle =
      document.title?.trim() ||
      document.fileName?.trim() ||
      dictionary.untitledDocument;

    const status = normalizeStatus(document.status);
    const ocrStatus = getDocumentOcrStatus(document);
    const validationStatus =
      getDocumentValidationStatus(document);

    const isCompleted = isDocumentCompleted(document);

    if (document.required !== false && !isCompleted) {
      notifications.push(
        createNotification({
          idParts: [
            "document",
            "required-missing",
            process.id,
            documentId,
          ],
          processId: process.id,
          documentId,
          category: "document",
          severity: "critical",
          title: dictionary.missingRequiredTitle,
          message: fillTemplate(
            dictionary.missingRequiredMessage,
            {
              process: processTitle,
              document: documentTitle,
            },
          ),
          action: {
            type: "upload_document",
            label: dictionary.uploadDocument,
            href: documentHref(process.id, documentId),
          },
          now,
          metadata: {
            processTitle,
            documentTitle,
            reason: "required_document_missing",
          },
        }),
      );
    }

    if (
      FAILED_OCR_STATUSES.has(ocrStatus) ||
      status === "unreadable"
    ) {
      notifications.push(
        createNotification({
          idParts: [
            "ocr",
            "failed",
            process.id,
            documentId,
          ],
          processId: process.id,
          documentId,
          category: "ocr",
          severity: "warning",
          title: dictionary.ocrFailedTitle,
          message: fillTemplate(dictionary.ocrFailedMessage, {
            document: documentTitle,
          }),
          action: {
            type: "review_document",
            label: dictionary.reviewDocument,
            href: documentHref(process.id, documentId),
          },
          now,
          metadata: {
            processTitle,
            documentTitle,
            reason: "ocr_failed",
          },
        }),
      );

      return;
    }

    if (
      includeInfo &&
      PENDING_OCR_STATUSES.has(ocrStatus)
    ) {
      notifications.push(
        createNotification({
          idParts: [
            "ocr",
            "pending",
            process.id,
            documentId,
          ],
          processId: process.id,
          documentId,
          category: "ocr",
          severity: "info",
          title: dictionary.ocrPendingTitle,
          message: fillTemplate(dictionary.ocrPendingMessage, {
            document: documentTitle,
          }),
          action: {
            type: "open_document",
            label: dictionary.openDocument,
            href: documentHref(process.id, documentId),
          },
          now,
          metadata: {
            processTitle,
            documentTitle,
            reason: "ocr_pending",
          },
        }),
      );
    }

    const ocrConfidence =
      getDocumentOcrConfidence(document);

    if (
      ocrConfidence !== null &&
      ocrConfidence < lowOcrThreshold &&
      isCompleted
    ) {
      notifications.push(
        createNotification({
          idParts: [
            "ocr",
            "low-confidence",
            process.id,
            documentId,
          ],
          processId: process.id,
          documentId,
          category: "ocr",
          severity:
            ocrConfidence < 0.45 ? "critical" : "warning",
          title: dictionary.lowOcrTitle,
          message: fillTemplate(dictionary.lowOcrMessage, {
            document: documentTitle,
            score: formatPercent(ocrConfidence),
          }),
          action: {
            type: "review_document",
            label: dictionary.reviewDocument,
            href: documentHref(process.id, documentId),
          },
          now,
          metadata: {
            processTitle,
            documentTitle,
            ocrConfidence,
            reason: "low_ocr_confidence",
          },
        }),
      );
    }

    const matchScore =
      getDocumentMatchScore(document);

    if (
      matchScore !== null &&
      matchScore < lowMatchThreshold &&
      isCompleted
    ) {
      notifications.push(
        createNotification({
          idParts: [
            "document",
            "mismatch",
            process.id,
            documentId,
          ],
          processId: process.id,
          documentId,
          category: "document",
          severity:
            matchScore < 0.4 ? "critical" : "warning",
          title: dictionary.mismatchTitle,
          message: fillTemplate(dictionary.mismatchMessage, {
            document: documentTitle,
          }),
          action: {
            type: "review_document",
            label: dictionary.reviewDocument,
            href: documentHref(process.id, documentId),
          },
          now,
          metadata: {
            processTitle,
            documentTitle,
            matchScore,
            reason: "document_type_mismatch",
          },
        }),
      );
    }

    if (
      INVALID_DOCUMENT_STATUSES.has(validationStatus) ||
      INVALID_DOCUMENT_STATUSES.has(status)
    ) {
      notifications.push(
        createNotification({
          idParts: [
            "document",
            "review-required",
            process.id,
            documentId,
          ],
          processId: process.id,
          documentId,
          category: "document",
          severity: "warning",
          title: dictionary.invalidDocumentTitle,
          message: fillTemplate(
            dictionary.invalidDocumentMessage,
            {
              document: documentTitle,
            },
          ),
          action: {
            type: "review_document",
            label: dictionary.reviewDocument,
            href: documentHref(process.id, documentId),
          },
          now,
          metadata: {
            processTitle,
            documentTitle,
            reason: "document_validation_failed",
          },
        }),
      );
    }
  });

  return notifications;
}

function generateReadinessNotification(
  process: NotificationProcess,
  processTitle: string,
  now: Date,
  language: Language,
  includeSuccess: boolean,
  includeInfo: boolean,
): AdvisorNotification[] {
  const dictionary = copy[language];
  const documents = getDocuments(process);

  if (documents.length === 0 || isProcessCompleted(process)) {
    return [];
  }

  const requiredDocuments = documents.filter(
    (item) => item.required !== false,
  );

  const requiredMissing = requiredDocuments.filter(
    (item) => !isDocumentCompleted(item),
  );

  const readiness = getProcessReadiness(process);

  if (
    includeSuccess &&
    requiredDocuments.length > 0 &&
    requiredMissing.length === 0
  ) {
    return [
      createNotification({
        idParts: ["readiness", "ready", process.id],
        processId: process.id,
        category: "readiness",
        severity: "success",
        title: dictionary.readyTitle,
        message: fillTemplate(dictionary.readyMessage, {
          process: processTitle,
        }),
        action: {
          type: "open_process",
          label: dictionary.openProcess,
          href: processHref(process.id),
        },
        now,
        metadata: {
          processTitle,
          readinessScore: readiness,
          reason: "all_required_documents_complete",
        },
      }),
    ];
  }

  if (
    includeInfo &&
    readiness >= 50 &&
    readiness < 100 &&
    requiredMissing.length > 0
  ) {
    return [
      createNotification({
        idParts: [
          "readiness",
          `progress-${Math.floor(readiness / 10) * 10}`,
          process.id,
        ],
        processId: process.id,
        category: "readiness",
        severity: "info",
        title: dictionary.progressTitle,
        message: fillTemplate(dictionary.progressMessage, {
          process: processTitle,
          score: readiness,
        }),
        action: {
          type: "open_process",
          label: dictionary.openProcess,
          href: processHref(process.id),
        },
        now,
        metadata: {
          processTitle,
          readinessScore: readiness,
          reason: "readiness_progress",
        },
      }),
    ];
  }

  return [];
}

function deduplicateNotifications(
  notifications: AdvisorNotification[],
): AdvisorNotification[] {
  const seen = new Map<string, AdvisorNotification>();

  for (const notification of notifications) {
    const existing = seen.get(
      notification.deduplicationKey,
    );

    if (
      !existing ||
      notification.priority > existing.priority
    ) {
      seen.set(
        notification.deduplicationKey,
        notification,
      );
    }
  }

  return Array.from(seen.values());
}

function sortNotifications(
  notifications: AdvisorNotification[],
): AdvisorNotification[] {
  return [...notifications].sort((first, second) => {
    if (second.priority !== first.priority) {
      return second.priority - first.priority;
    }

    return (
      new Date(second.createdAt).getTime() -
      new Date(first.createdAt).getTime()
    );
  });
}

/**
 * Main notification engine.
 */
export function analyzeNotifications(
  processes: NotificationProcess[],
  options: NotificationAdvisorOptions = {},
): NotificationAdvisorResult {
  const now =
    options.now instanceof Date &&
    !Number.isNaN(options.now.getTime())
      ? new Date(options.now)
      : new Date();

  const language = normalizeLanguage(options.language);
  const includeSuccess = options.includeSuccess ?? true;
  const includeInfo = options.includeInfo ?? true;
  const maxNotifications = Math.max(
    1,
    Math.floor(
      options.maxNotifications ??
        DEFAULT_MAX_NOTIFICATIONS,
    ),
  );

  const deadlineWarningDays = Array.from(
    new Set(
      (
        options.deadlineWarningDays ??
        DEFAULT_DEADLINE_WARNING_DAYS
      )
        .filter(
          (value) =>
            Number.isInteger(value) && value >= 0,
        )
        .sort((first, second) => second - first),
    ),
  );

  const lowOcrThreshold = Math.max(
    0,
    Math.min(
      1,
      options.lowOcrThreshold ??
        DEFAULT_LOW_OCR_THRESHOLD,
    ),
  );

  const lowMatchThreshold = Math.max(
    0,
    Math.min(
      1,
      options.lowMatchThreshold ??
        DEFAULT_LOW_MATCH_THRESHOLD,
    ),
  );

  const sourceProcesses = Array.isArray(processes)
    ? processes.filter(
        (item): item is NotificationProcess =>
          Boolean(
            item &&
              typeof item === "object" &&
              typeof item.id === "string" &&
              item.id.trim(),
          ),
      )
    : [];

  const generated: AdvisorNotification[] = [];

  if (sourceProcesses.length === 0 && includeInfo) {
    const dictionary = copy[language];

    generated.push(
      createNotification({
        idParts: ["system", "create-first-process"],
        category: "system",
        severity: "info",
        title: dictionary.emptyTitle,
        message: dictionary.emptyMessage,
        action: {
          type: "open_dashboard",
          label: dictionary.openDashboard,
          href: "/processes/new",
        },
        now,
        metadata: {
          reason: "no_processes",
        },
      }),
    );
  }

  for (const process of sourceProcesses) {
    const processTitle =
      process.title?.trim() ||
      copy[language].untitledProcess;

    generated.push(
      ...generateDeadlineNotifications(
        process,
        processTitle,
        now,
        language,
        deadlineWarningDays,
      ),
      ...generateDocumentNotifications(
        process,
        processTitle,
        now,
        language,
        lowOcrThreshold,
        lowMatchThreshold,
        includeInfo,
      ),
      ...generateReadinessNotification(
        process,
        processTitle,
        now,
        language,
        includeSuccess,
        includeInfo,
      ),
    );
  }

  const notifications = sortNotifications(
    deduplicateNotifications(generated),
  ).slice(0, maxNotifications);

  const criticalCount = notifications.filter(
    (item) => item.severity === "critical",
  ).length;

  const warningCount = notifications.filter(
    (item) => item.severity === "warning",
  ).length;

  const infoCount = notifications.filter(
    (item) => item.severity === "info",
  ).length;

  const successCount = notifications.filter(
    (item) => item.severity === "success",
  ).length;

  return {
    notifications,
    unreadCount: notifications.filter(
      (item) => item.status === "unread",
    ).length,
    criticalCount,
    warningCount,
    infoCount,
    successCount,
    highestPriority: notifications[0] ?? null,
    generatedAt: now.toISOString(),
  };
}

/**
 * Returns only the notification list.
 */
export function getNotifications(
  processes: NotificationProcess[],
  options: NotificationAdvisorOptions = {},
): AdvisorNotification[] {
  return analyzeNotifications(
    processes,
    options,
  ).notifications;
}

/**
 * Returns the number shown on the notification badge.
 */
export function getNotificationBadgeCount(
  processes: NotificationProcess[],
  options: NotificationAdvisorOptions = {},
): number {
  return analyzeNotifications(
    processes,
    options,
  ).unreadCount;
}

/**
 * Returns only critical and warning notifications.
 */
export function getActionableNotifications(
  processes: NotificationProcess[],
  options: NotificationAdvisorOptions = {},
): AdvisorNotification[] {
  return analyzeNotifications(processes, {
    ...options,
    includeSuccess: false,
    includeInfo: false,
  }).notifications;
}

/**
 * Returns the single most important notification.
 */
export function getHighestPriorityNotification(
  processes: NotificationProcess[],
  options: NotificationAdvisorOptions = {},
): AdvisorNotification | null {
  return analyzeNotifications(
    processes,
    options,
  ).highestPriority;
}

/**
 * Converts generated notifications into Firestore-safe plain objects.
 * This function does not write to Firestore.
 */
export function serializeNotificationsForFirestore(
  notifications: AdvisorNotification[],
  userId: string,
): Array<
  AdvisorNotification & {
    userId: string;
    source: "notification-advisor";
  }
> {
  return notifications.map((notification) => ({
    ...notification,
    userId,
    source: "notification-advisor",
  }));
}