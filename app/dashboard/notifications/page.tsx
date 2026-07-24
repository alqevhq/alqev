"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
  analyzeNotifications,
  type AdvisorNotification,
  type NotificationProcess,
  type NotificationSeverity,
} from "@/lib/ai/notification-advisor";
import { readStoredLanguage } from "@/lib/i18n";
import {
  getLocalizedDocumentTitle,
  getLocalizedProcessTitle,
} from "@/lib/process-templates";

type SupportedLanguage = "de" | "en" | "tr" | "ru" | "ar" | "fa";
type NotificationFilter =
  | "all"
  | NotificationSeverity
  | "deadline"
  | "document"
  | "ocr";

type StoredNotificationState = {
  readIds: string[];
  dismissedIds: string[];
};

const STORAGE_PREFIX = "alqev-notification-center";

const translations: Record<
  SupportedLanguage,
  {
    title: string;
    subtitle: string;
    back: string;
    loading: string;
    error: string;
    retry: string;
    all: string;
    critical: string;
    warning: string;
    info: string;
    success: string;
    deadlines: string;
    documents: string;
    ocr: string;
    unread: string;
    markAllRead: string;
    markRead: string;
    dismiss: string;
    open: string;
    emptyTitle: string;
    emptyText: string;
    noFilteredTitle: string;
    noFilteredText: string;
    notifications: string;
    urgent: string;
    important: string;
    information: string;
    completed: string;
    read: string;
    newLabel: string;
  }
> = {
  de: {
    title: "Benachrichtigungen",
    subtitle: "Fristen, fehlende Dokumente und wichtige Hinweise an einem Ort.",
    back: "Zum Dashboard",
    loading: "Benachrichtigungen werden geladen...",
    error: "Die Benachrichtigungen konnten nicht geladen werden.",
    retry: "Erneut versuchen",
    all: "Alle",
    critical: "Kritisch",
    warning: "Wichtig",
    info: "Hinweise",
    success: "Erledigt",
    deadlines: "Fristen",
    documents: "Dokumente",
    ocr: "Dokumentprüfung",
    unread: "Ungelesen",
    markAllRead: "Alle als gelesen markieren",
    markRead: "Als gelesen markieren",
    dismiss: "Ausblenden",
    open: "Öffnen",
    emptyTitle: "Alles im Blick",
    emptyText: "Zurzeit gibt es keine aktiven Benachrichtigungen. Neue Hinweise erscheinen automatisch hier.",
    noFilteredTitle: "Keine passenden Hinweise",
    noFilteredText: "Für diesen Filter gibt es momentan keine Benachrichtigungen.",
    notifications: "Hinweise",
    urgent: "Dringend",
    important: "Wichtig",
    information: "Information",
    completed: "Bereit",
    read: "Gelesen",
    newLabel: "Neu",
  },
  en: {
    title: "Notifications",
    subtitle: "Deadlines, missing documents, and important alerts in one place.",
    back: "Back to dashboard",
    loading: "Loading notifications...",
    error: "Notifications could not be loaded.",
    retry: "Try again",
    all: "All",
    critical: "Critical",
    warning: "Important",
    info: "Information",
    success: "Completed",
    deadlines: "Deadlines",
    documents: "Documents",
    ocr: "Document review",
    unread: "Unread",
    markAllRead: "Mark all as read",
    markRead: "Mark as read",
    dismiss: "Dismiss",
    open: "Open",
    emptyTitle: "Everything is under control",
    emptyText: "There are no active notifications right now. New alerts will appear here automatically.",
    noFilteredTitle: "No matching notifications",
    noFilteredText: "There are currently no notifications for this filter.",
    notifications: "Notifications",
    urgent: "Urgent",
    important: "Important",
    information: "Information",
    completed: "Ready",
    read: "Read",
    newLabel: "New",
  },
  tr: {
    title: "Bildirimler",
    subtitle: "Son tarihler, eksik belgeler ve önemli uyarılar tek yerde.",
    back: "Dashboard'a dön",
    loading: "Bildirimler yükleniyor...",
    error: "Bildirimler yüklenemedi.",
    retry: "Tekrar dene",
    all: "Tümü",
    critical: "Kritik",
    warning: "Önemli",
    info: "Bilgi",
    success: "Tamamlanan",
    deadlines: "Son tarihler",
    documents: "Belgeler",
    ocr: "Belge kontrolü",
    unread: "Okunmamış",
    markAllRead: "Tümünü okundu işaretle",
    markRead: "Okundu işaretle",
    dismiss: "Kapat",
    open: "Aç",
    emptyTitle: "Her şey kontrol altında",
    emptyText: "Şu anda aktif bir bildirimin yok. Yeni uyarılar otomatik olarak burada görünecek.",
    noFilteredTitle: "Uygun bildirim bulunamadı",
    noFilteredText: "Bu filtreye ait şu anda bir bildirim yok.",
    notifications: "Bildirim",
    urgent: "Acil",
    important: "Önemli",
    information: "Bilgi",
    completed: "Hazır",
    read: "Okundu",
    newLabel: "Yeni",
  },
  ru: {
    title: "Уведомления",
    subtitle: "Сроки, недостающие документы и важные предупреждения в одном месте.",
    back: "Назад к панели",
    loading: "Загрузка уведомлений...",
    error: "Не удалось загрузить уведомления.",
    retry: "Повторить",
    all: "Все",
    critical: "Критично",
    warning: "Важно",
    info: "Информация",
    success: "Готово",
    deadlines: "Сроки",
    documents: "Документы",
    ocr: "Проверка документов",
    unread: "Непрочитанные",
    markAllRead: "Отметить все как прочитанные",
    markRead: "Отметить как прочитанное",
    dismiss: "Скрыть",
    open: "Открыть",
    emptyTitle: "Всё под контролем",
    emptyText: "Сейчас активных уведомлений нет. Новые уведомления появятся здесь автоматически.",
    noFilteredTitle: "Уведомлений нет",
    noFilteredText: "Для этого фильтра сейчас нет уведомлений.",
    notifications: "Уведомления",
    urgent: "Срочно",
    important: "Важно",
    information: "Информация",
    completed: "Готово",
    read: "Прочитано",
    newLabel: "Новое",
  },
  ar: {
    title: "الإشعارات",
    subtitle: "المواعيد النهائية والوثائق الناقصة والتنبيهات المهمة في مكان واحد.",
    back: "العودة إلى لوحة التحكم",
    loading: "جارٍ تحميل الإشعارات...",
    error: "تعذر تحميل الإشعارات.",
    retry: "إعادة المحاولة",
    all: "الكل",
    critical: "حرج",
    warning: "مهم",
    info: "معلومات",
    success: "مكتمل",
    deadlines: "المواعيد النهائية",
    documents: "الوثائق",
    ocr: "فحص الوثائق",
    unread: "غير مقروء",
    markAllRead: "تحديد الكل كمقروء",
    markRead: "تحديد كمقروء",
    dismiss: "إخفاء",
    open: "فتح",
    emptyTitle: "كل شيء تحت السيطرة",
    emptyText: "لا توجد إشعارات نشطة حاليًا. ستظهر التنبيهات الجديدة هنا تلقائيًا.",
    noFilteredTitle: "لا توجد إشعارات مطابقة",
    noFilteredText: "لا توجد إشعارات لهذا الفلتر حاليًا.",
    notifications: "إشعارات",
    urgent: "عاجل",
    important: "مهم",
    information: "معلومات",
    completed: "جاهز",
    read: "مقروء",
    newLabel: "جديد",
  },
  fa: {
    title: "اعلان‌ها",
    subtitle: "مهلت‌ها، مدارک ناقص و هشدارهای مهم در یک مکان.",
    back: "بازگشت به داشبورد",
    loading: "در حال بارگذاری اعلان‌ها...",
    error: "اعلان‌ها بارگذاری نشدند.",
    retry: "تلاش دوباره",
    all: "همه",
    critical: "بحرانی",
    warning: "مهم",
    info: "اطلاعات",
    success: "تکمیل‌شده",
    deadlines: "مهلت‌ها",
    documents: "مدارک",
    ocr: "بررسی مدرک",
    unread: "خوانده‌نشده",
    markAllRead: "علامت‌گذاری همه به‌عنوان خوانده‌شده",
    markRead: "علامت‌گذاری به‌عنوان خوانده‌شده",
    dismiss: "بستن",
    open: "باز کردن",
    emptyTitle: "همه چیز تحت کنترل است",
    emptyText: "در حال حاضر اعلان فعالی وجود ندارد. هشدارهای جدید به‌طور خودکار اینجا نمایش داده می‌شوند.",
    noFilteredTitle: "اعلان مطابقی وجود ندارد",
    noFilteredText: "در حال حاضر برای این فیلتر اعلانی وجود ندارد.",
    notifications: "اعلان",
    urgent: "فوری",
    important: "مهم",
    information: "اطلاعات",
    completed: "آماده",
    read: "خوانده‌شده",
    newLabel: "جدید",
  },
};

const severityStyles: Record<
  NotificationSeverity,
  { wrapper: string; icon: string; badge: string; dot: string; symbol: string }
> = {
  critical: {
    wrapper: "border-rose-400/25 bg-rose-400/[0.055]",
    icon: "border-rose-400/20 bg-rose-400/15 text-rose-200",
    badge: "border-rose-400/20 bg-rose-400/10 text-rose-200",
    dot: "bg-rose-300",
    symbol: "!",
  },
  warning: {
    wrapper: "border-amber-400/25 bg-amber-400/[0.05]",
    icon: "border-amber-400/20 bg-amber-400/15 text-amber-200",
    badge: "border-amber-400/20 bg-amber-400/10 text-amber-200",
    dot: "bg-amber-300",
    symbol: "!",
  },
  info: {
    wrapper: "border-indigo-400/25 bg-indigo-400/[0.05]",
    icon: "border-indigo-400/20 bg-indigo-400/15 text-indigo-200",
    badge: "border-indigo-400/20 bg-indigo-400/10 text-indigo-200",
    dot: "bg-indigo-300",
    symbol: "i",
  },
  success: {
    wrapper: "border-emerald-400/25 bg-emerald-400/[0.05]",
    icon: "border-emerald-400/20 bg-emerald-400/15 text-emerald-200",
    badge: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    dot: "bg-emerald-300",
    symbol: "✓",
  },
};

function normalizeLanguage(value: string | undefined): SupportedLanguage {
  return value === "de" || value === "en" || value === "tr" || value === "ru" || value === "ar" || value === "fa"
    ? value
    : "de";
}

function getAdvisorLanguage(language: SupportedLanguage): "de" | "en" | "tr" {
  if (language === "tr") return "tr";
  if (language === "en") return "en";
  return "de";
}

function normalizeDocuments(value: unknown): NotificationProcess["requiredDocuments"] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item, index) => ({
      key: typeof item.key === "string" && item.key.trim() ? item.key : `document-${index}`,
      id: typeof item.id === "string" && item.id.trim() ? item.id : undefined,
      title: typeof item.title === "string" && item.title.trim() ? item.title : undefined,
      description: typeof item.description === "string" ? item.description : undefined,
      required: typeof item.required === "boolean" ? item.required : undefined,
      status: typeof item.status === "string" ? item.status : "missing",
      fileName: typeof item.fileName === "string" ? item.fileName : undefined,
      fileUrl: typeof item.fileUrl === "string" ? item.fileUrl : undefined,
      ocrStatus: typeof item.ocrStatus === "string" ? item.ocrStatus : undefined,
      ocrConfidence: typeof item.ocrConfidence === "number" ? item.ocrConfidence : null,
      confidence: typeof item.confidence === "number" ? item.confidence : null,
      matchScore: typeof item.matchScore === "number" ? item.matchScore : null,
      documentMatchScore: typeof item.documentMatchScore === "number" ? item.documentMatchScore : null,
      validationStatus: typeof item.validationStatus === "string" ? item.validationStatus : undefined,
    }));
}

function readNotificationState(userId: string): StoredNotificationState {
  if (typeof window === "undefined") return { readIds: [], dismissedIds: [] };

  try {
    const rawValue = window.localStorage.getItem(`${STORAGE_PREFIX}:${userId}`);
    if (!rawValue) return { readIds: [], dismissedIds: [] };

    const parsed = JSON.parse(rawValue) as Partial<StoredNotificationState>;
    return {
      readIds: Array.isArray(parsed.readIds)
        ? parsed.readIds.filter((item): item is string => typeof item === "string")
        : [],
      dismissedIds: Array.isArray(parsed.dismissedIds)
        ? parsed.dismissedIds.filter((item): item is string => typeof item === "string")
        : [],
    };
  } catch {
    return { readIds: [], dismissedIds: [] };
  }
}

function saveNotificationState(userId: string, state: StoredNotificationState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${STORAGE_PREFIX}:${userId}`, JSON.stringify(state));
}

function getSeverityLabel(
  severity: NotificationSeverity,
  copy: (typeof translations)[SupportedLanguage],
): string {
  if (severity === "critical") return copy.urgent;
  if (severity === "warning") return copy.important;
  if (severity === "success") return copy.completed;
  return copy.information;
}

export default function NotificationCenterPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [language, setLanguage] = useState<SupportedLanguage>("de");
  const [processes, setProcesses] = useState<NotificationProcess[]>([]);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [readIds, setReadIds] = useState<string[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const copy = translations[language];
  const isRtl = language === "ar" || language === "fa";

  useEffect(() => {
    setLanguage(normalizeLanguage(readStoredLanguage("de")));
  }, []);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.replace("/login");
        return;
      }
      if (!isMounted) return;

      setUser(currentUser);
      setErrorMessage("");

      const storedState = readNotificationState(currentUser.uid);
      setReadIds(storedState.readIds);
      setDismissedIds(storedState.dismissedIds);

      try {
        const processesReference = collection(db, "users", currentUser.uid, "processes");
        const processSnapshot = await getDocs(
          query(processesReference, orderBy("createdAt", "desc")),
        ).catch(() => getDocs(processesReference));

        if (!isMounted) return;

        const processList: NotificationProcess[] = processSnapshot.docs.map((processDocument) => {
          const data = processDocument.data();
          return {
            id: processDocument.id,
            title: typeof data.title === "string" ? data.title : undefined,
            description: typeof data.description === "string" ? data.description : undefined,
            templateKey: typeof data.templateKey === "string" ? data.templateKey : undefined,
            status: typeof data.status === "string" ? data.status : "active",
            progress: typeof data.progress === "number" ? data.progress : undefined,
            deadline:
              typeof data.deadline === "string" || data.deadline instanceof Date
                ? data.deadline
                : null,
            targetDate:
              typeof data.targetDate === "string" || data.targetDate instanceof Date
                ? data.targetDate
                : null,
            completedDocumentCount:
              typeof data.completedDocumentCount === "number" ? data.completedDocumentCount : undefined,
            totalDocumentCount:
              typeof data.totalDocumentCount === "number" ? data.totalDocumentCount : undefined,
            requiredDocuments: normalizeDocuments(data.requiredDocuments),
            readinessScore: typeof data.readinessScore === "number" ? data.readinessScore : undefined,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        });

        setProcesses(processList);
      } catch (error) {
        console.error("Notification Center verileri yüklenemedi:", error);
        if (isMounted) setErrorMessage(copy.error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [copy.error, router]);

  const localizedProcesses = useMemo<NotificationProcess[]>(
    () =>
      processes.map((processItem) => {
        const localizedProcessTitle = getLocalizedProcessTitle(
          {
            templateKey: processItem.templateKey,
            title: processItem.title,
          },
          language,
        );

        return {
          ...processItem,
          title: localizedProcessTitle || processItem.title,
          requiredDocuments: processItem.requiredDocuments?.map(
            (documentItem) => ({
              ...documentItem,
              title:
                getLocalizedDocumentTitle(
                  {
                    templateKey: processItem.templateKey,
                    processTitle: processItem.title,
                    documentKey: documentItem.key,
                    documentTitle: documentItem.title,
                  },
                  language,
                ) || documentItem.title,
            }),
          ),
        };
      }),
    [language, processes],
  );

  const advisorResult = useMemo(
    () =>
      analyzeNotifications(localizedProcesses, {
        language: getAdvisorLanguage(language),
        includeSuccess: true,
        includeInfo: true,
        maxNotifications: 100,
      }),
    [language, localizedProcesses],
  );

  const visibleNotifications = useMemo<AdvisorNotification[]>(
    () =>
      advisorResult.notifications.filter(
        (notification) => !dismissedIds.includes(notification.id),
      ),
    [advisorResult.notifications, dismissedIds],
  );

  const filteredNotifications = useMemo(() => {
    if (filter === "all") return visibleNotifications;
    if (filter === "critical" || filter === "warning" || filter === "info" || filter === "success") {
      return visibleNotifications.filter((notification) => notification.severity === filter);
    }
    if (filter === "deadline") {
      return visibleNotifications.filter((notification) => notification.category === "deadline");
    }
    if (filter === "ocr") {
      return visibleNotifications.filter((notification) => notification.category === "ocr");
    }
    return visibleNotifications.filter((notification) => notification.category === "document");
  }, [filter, visibleNotifications]);

  const unreadCount = visibleNotifications.filter(
    (notification) => !readIds.includes(notification.id),
  ).length;

  function updateStoredState(nextReadIds: string[], nextDismissedIds: string[]): void {
    setReadIds(nextReadIds);
    setDismissedIds(nextDismissedIds);
    if (user) {
      saveNotificationState(user.uid, { readIds: nextReadIds, dismissedIds: nextDismissedIds });
    }
  }

  function markAsRead(notificationId: string): void {
    if (readIds.includes(notificationId)) return;
    updateStoredState([...readIds, notificationId], dismissedIds);
  }

  function markAllAsRead(): void {
    const notificationIds = visibleNotifications.map((notification) => notification.id);
    updateStoredState(Array.from(new Set([...readIds, ...notificationIds])), dismissedIds);
  }

  function dismissNotification(notificationId: string): void {
    updateStoredState(readIds, Array.from(new Set([...dismissedIds, notificationId])));
  }

  const filters: Array<{ key: NotificationFilter; label: string; count: number }> = [
    { key: "all", label: copy.all, count: visibleNotifications.length },
    {
      key: "critical",
      label: copy.critical,
      count: visibleNotifications.filter((item) => item.severity === "critical").length,
    },
    {
      key: "warning",
      label: copy.warning,
      count: visibleNotifications.filter((item) => item.severity === "warning").length,
    },
    {
      key: "deadline",
      label: copy.deadlines,
      count: visibleNotifications.filter((item) => item.category === "deadline").length,
    },
    {
      key: "document",
      label: copy.documents,
      count: visibleNotifications.filter((item) => item.category === "document").length,
    },
    {
      key: "ocr",
      label: copy.ocr,
      count: visibleNotifications.filter((item) => item.category === "ocr").length,
    },
    {
      key: "success",
      label: copy.success,
      count: visibleNotifications.filter((item) => item.severity === "success").length,
    },
  ];

  return (
    <main dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-[#070b16] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-10rem] top-[-8rem] h-[28rem] w-[28rem] rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute bottom-[-10rem] right-[-8rem] h-[30rem] w-[30rem] rounded-full bg-cyan-500/5 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <header className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
          >
            <span aria-hidden="true">←</span>
            {copy.back}
          </Link>

          <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-400/10 text-xl text-indigo-200 shadow-lg shadow-indigo-950/30">
                ◎
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{copy.title}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                  {copy.subtitle}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-indigo-400/30 hover:bg-white/[0.075] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {copy.markAllRead}
            </button>
          </div>
        </header>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label={copy.notifications} value={visibleNotifications.length} helper={copy.all} />
          <StatCard label={copy.unread} value={unreadCount} helper={copy.newLabel} />
          <StatCard
            label={copy.critical}
            value={visibleNotifications.filter((item) => item.severity === "critical").length}
            helper={copy.urgent}
          />
          <StatCard
            label={copy.warning}
            value={visibleNotifications.filter((item) => item.severity === "warning").length}
            helper={copy.important}
          />
        </section>

        <section className="mb-6 overflow-x-auto pb-2">
          <div className="flex min-w-max gap-2">
            {filters.map((item) => {
              const isActive = filter === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={[
                    "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",
                    isActive
                      ? "border-indigo-400/40 bg-indigo-400/15 text-indigo-100"
                      : "border-white/10 bg-white/[0.035] text-slate-400 hover:border-white/20 hover:text-white",
                  ].join(" ")}
                >
                  <span>{item.label}</span>
                  <span
                    className={[
                      "rounded-full px-2 py-0.5 text-xs",
                      isActive
                        ? "bg-indigo-300/15 text-indigo-100"
                        : "bg-white/[0.06] text-slate-500",
                    ].join(" ")}
                  >
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {isLoading ? (
          <StatePanel title={copy.loading} description="" symbol="…" />
        ) : errorMessage ? (
          <StatePanel title={copy.error} description={errorMessage} symbol="!">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400"
            >
              {copy.retry}
            </button>
          </StatePanel>
        ) : filteredNotifications.length === 0 ? (
          <StatePanel
            title={visibleNotifications.length === 0 ? copy.emptyTitle : copy.noFilteredTitle}
            description={visibleNotifications.length === 0 ? copy.emptyText : copy.noFilteredText}
            symbol="✓"
          />
        ) : (
          <section className="space-y-4">
            {filteredNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                isRead={readIds.includes(notification.id)}
                copy={copy}
                onMarkRead={markAsRead}
                onDismiss={dismissNotification}
              />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function StatCard({ label, value, helper }: { label: string; value: number; helper: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-xl shadow-black/10">
      <p className="text-sm font-medium text-slate-400">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-4">
        <p className="text-3xl font-bold tracking-tight text-white">{value}</p>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-slate-500">
          {helper}
        </span>
      </div>
    </div>
  );
}

function NotificationCard({
  notification,
  isRead,
  copy,
  onMarkRead,
  onDismiss,
}: {
  notification: AdvisorNotification;
  isRead: boolean;
  copy: (typeof translations)[SupportedLanguage];
  onMarkRead: (notificationId: string) => void;
  onDismiss: (notificationId: string) => void;
}) {
  const styles = severityStyles[notification.severity];
  const isUnread = !isRead;

  return (
    <article
      className={[
        "relative overflow-hidden rounded-3xl border p-5 shadow-xl shadow-black/10 transition sm:p-6",
        styles.wrapper,
        isUnread ? "opacity-100" : "opacity-70",
      ].join(" ")}
    >
      {isUnread && (
        <span
          className={[
            "absolute right-4 top-4 h-2.5 w-2.5 rounded-full shadow-[0_0_18px_currentColor]",
            styles.dot,
          ].join(" ")}
          aria-label={copy.newLabel}
        />
      )}

      <div className="flex items-start gap-4">
        <div
          className={[
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-lg font-bold",
            styles.icon,
          ].join(" ")}
        >
          {styles.symbol}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={["rounded-full border px-2.5 py-1 text-xs font-semibold", styles.badge].join(" ")}>
              {getSeverityLabel(notification.severity, copy)}
            </span>

            {isRead && (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-slate-500">
                {copy.read}
              </span>
            )}
          </div>

          <h2 className="mt-3 text-lg font-semibold leading-7 text-white sm:text-xl">{notification.title}</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300 sm:text-[15px]">{notification.message}</p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {notification.action.href && (
  <Link
    href={notification.action.href}
    onClick={() => onMarkRead(notification.id)}
    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-950/20 transition hover:bg-indigo-400"
  >
    {notification.action.label?.trim() || copy.open}
  </Link>
)}

            {isUnread && (
              <button
                type="button"
                onClick={() => onMarkRead(notification.id)}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.075] hover:text-white"
              >
                {copy.markRead}
              </button>
            )}

            <button
              type="button"
              onClick={() => onDismiss(notification.id)}
              className="inline-flex min-h-10 items-center justify-center rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-white/[0.05] hover:text-slate-200"
            >
              {copy.dismiss}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function StatePanel({
  title,
  description,
  symbol,
  children,
}: {
  title: string;
  description: string;
  symbol: string;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.035] px-6 py-14 text-center shadow-xl shadow-black/10">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-400/10 text-xl font-bold text-indigo-200">
        {symbol}
      </div>
      <h2 className="mt-5 text-xl font-semibold text-white">{title}</h2>
      {description && (
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">{description}</p>
      )}
      {children}
    </section>
  );
}