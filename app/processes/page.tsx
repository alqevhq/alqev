"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import {
  getLocalizedCountryLabel,
  getLocalizedProcessDescription,
  getLocalizedProcessTitle,
  normalizeProcessLanguage,
} from "@/lib/process-templates";
import {
  isRtlLanguage,
  readStoredLanguage,
  type Language,
} from "@/lib/i18n";

type Process = {
  id: string;
  templateKey?: string;
  title: string;
  description: string;
  country: string;
  status: string;
  progress: number;
  completedDocumentCount: number;
  totalDocumentCount: number;
  deadline: string | null;
  createdAt: Timestamp | null;
};

const subscribeToStoredLanguage = () => () => {};
const getStoredLanguageSnapshot = (): Language =>
  normalizeProcessLanguage(readStoredLanguage("tr"));
const getServerLanguageSnapshot = (): Language => "tr";

const copy = {
  tr: {
    title: "Süreçlerim",
    description:
      "Aktif süreçlerini, gerekli belgelerini ve ilerleme durumunu tek ekrandan takip et.",
    newProcess: "Yeni Süreç Başlat",
    backToDashboard: "Dashboard’a dön",
    activeProcesses: "Aktif süreçler",
    totalProcesses: "Toplam {count} süreç",
    loading: "Süreçler yükleniyor...",
    loadFailed: "Süreçler görüntülenemedi",
    loginRequired:
      "Süreçlerini görmek için hesabına giriş yapmalısın.",
    loadError:
      "Süreçler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyip tekrar dene.",
    noProcesses: "Henüz bir sürecin yok",
    noProcessesText:
      "İlk sürecini başlattığında gerekli belgeler, ilerleme durumu ve hedef tarih burada görünecek.",
    firstProcess: "İlk süreci başlat",
    progress: "İlerleme",
    documents: "Belgeler",
    deadline: "Hedef tarih",
    noDeadline: "Hedef tarih yok",
    openDetails: "Süreç detayını aç",
    untitled: "Başlıksız Süreç",
    unspecified: "Belirtilmedi",
    active: "Aktif",
    completed: "Tamamlandı",
    paused: "Beklemede",
    cancelled: "İptal edildi",
  },
  de: {
    title: "Meine Vorgänge",
    description:
      "Behalte aktive Vorgänge, erforderliche Dokumente und Fortschritte an einem Ort im Blick.",
    newProcess: "Neuen Vorgang starten",
    backToDashboard: "Zum Dashboard",
    activeProcesses: "Aktive Vorgänge",
    totalProcesses: "Insgesamt {count} Vorgänge",
    loading: "Vorgänge werden geladen...",
    loadFailed: "Vorgänge konnten nicht angezeigt werden",
    loginRequired:
      "Du musst angemeldet sein, um deine Vorgänge zu sehen.",
    loadError:
      "Beim Laden der Vorgänge ist ein Fehler aufgetreten. Bitte lade die Seite neu.",
    noProcesses: "Du hast noch keinen Vorgang",
    noProcessesText:
      "Sobald du deinen ersten Vorgang startest, erscheinen Dokumente, Fortschritt und Frist hier.",
    firstProcess: "Ersten Vorgang starten",
    progress: "Fortschritt",
    documents: "Dokumente",
    deadline: "Frist",
    noDeadline: "Keine Frist",
    openDetails: "Vorgang öffnen",
    untitled: "Unbenannter Vorgang",
    unspecified: "Nicht angegeben",
    active: "Aktiv",
    completed: "Abgeschlossen",
    paused: "Pausiert",
    cancelled: "Abgebrochen",
  },
  en: {
    title: "My Processes",
    description:
      "Track active processes, required documents, and progress from one screen.",
    newProcess: "Start New Process",
    backToDashboard: "Back to Dashboard",
    activeProcesses: "Active processes",
    totalProcesses: "{count} processes in total",
    loading: "Loading processes...",
    loadFailed: "Processes could not be displayed",
    loginRequired:
      "You must sign in to view your processes.",
    loadError:
      "An error occurred while loading processes. Please refresh the page.",
    noProcesses: "You do not have a process yet",
    noProcessesText:
      "Once you start your first process, documents, progress, and deadline will appear here.",
    firstProcess: "Start your first process",
    progress: "Progress",
    documents: "Documents",
    deadline: "Target date",
    noDeadline: "No target date",
    openDetails: "Open process details",
    untitled: "Untitled Process",
    unspecified: "Not specified",
    active: "Active",
    completed: "Completed",
    paused: "Paused",
    cancelled: "Cancelled",
  },
  ru: {
    title: "Мои процессы",
    description:
      "Отслеживайте активные процессы, необходимые документы и прогресс на одном экране.",
    newProcess: "Начать новый процесс",
    backToDashboard: "На панель управления",
    activeProcesses: "Активные процессы",
    totalProcesses: "Всего процессов: {count}",
    loading: "Загрузка процессов...",
    loadFailed: "Не удалось отобразить процессы",
    loginRequired:
      "Чтобы просмотреть процессы, необходимо войти в аккаунт.",
    loadError:
      "При загрузке процессов произошла ошибка. Обновите страницу и повторите попытку.",
    noProcesses: "У вас пока нет процессов",
    noProcessesText:
      "После запуска первого процесса здесь появятся документы, прогресс и срок.",
    firstProcess: "Начать первый процесс",
    progress: "Прогресс",
    documents: "Документы",
    deadline: "Целевая дата",
    noDeadline: "Целевая дата не указана",
    openDetails: "Открыть детали процесса",
    untitled: "Процесс без названия",
    unspecified: "Не указано",
    active: "Активен",
    completed: "Завершён",
    paused: "Приостановлен",
    cancelled: "Отменён",
  },
  ar: {
    title: "إجراءاتي",
    description:
      "تابع الإجراءات النشطة والوثائق المطلوبة ونسبة التقدم من شاشة واحدة.",
    newProcess: "بدء إجراء جديد",
    backToDashboard: "العودة إلى لوحة التحكم",
    activeProcesses: "الإجراءات النشطة",
    totalProcesses: "إجمالي الإجراءات: {count}",
    loading: "جارٍ تحميل الإجراءات...",
    loadFailed: "تعذر عرض الإجراءات",
    loginRequired:
      "يجب تسجيل الدخول لعرض إجراءاتك.",
    loadError:
      "حدث خطأ أثناء تحميل الإجراءات. يرجى تحديث الصفحة.",
    noProcesses: "ليس لديك إجراء بعد",
    noProcessesText:
      "بعد بدء أول إجراء ستظهر هنا الوثائق ونسبة التقدم والموعد النهائي.",
    firstProcess: "بدء أول إجراء",
    progress: "التقدم",
    documents: "الوثائق",
    deadline: "التاريخ المستهدف",
    noDeadline: "لا يوجد تاريخ مستهدف",
    openDetails: "فتح تفاصيل الإجراء",
    untitled: "إجراء بلا عنوان",
    unspecified: "غير محدد",
    active: "نشط",
    completed: "مكتمل",
    paused: "متوقف مؤقتًا",
    cancelled: "ملغى",
  },
  fa: {
    title: "فرایندهای من",
    description:
      "فرایندهای فعال، مدارک لازم و میزان پیشرفت را در یک صفحه دنبال کنید.",
    newProcess: "شروع فرایند جدید",
    backToDashboard: "بازگشت به داشبورد",
    activeProcesses: "فرایندهای فعال",
    totalProcesses: "مجموع فرایندها: {count}",
    loading: "در حال بارگذاری فرایندها...",
    loadFailed: "نمایش فرایندها ممکن نشد",
    loginRequired:
      "برای مشاهده فرایندها باید وارد حساب شوید.",
    loadError:
      "هنگام بارگذاری فرایندها خطایی رخ داد. صفحه را تازه‌سازی کنید.",
    noProcesses: "هنوز فرایندی ندارید",
    noProcessesText:
      "پس از شروع اولین فرایند، مدارک، پیشرفت و مهلت اینجا نمایش داده می‌شود.",
    firstProcess: "شروع اولین فرایند",
    progress: "پیشرفت",
    documents: "مدارک",
    deadline: "تاریخ هدف",
    noDeadline: "تاریخ هدفی وجود ندارد",
    openDetails: "باز کردن جزئیات فرایند",
    untitled: "فرایند بدون عنوان",
    unspecified: "مشخص نشده",
    active: "فعال",
    completed: "تکمیل شده",
    paused: "متوقف",
    cancelled: "لغو شده",
  },
} as const;

function fillTemplate(
  value: string,
  variables: Record<string, string | number>,
): string {
  return Object.entries(variables).reduce(
    (result, [key, replacement]) =>
      result.replaceAll(`{${key}}`, String(replacement)),
    value,
  );
}

function getStatusLabel(
  status: string,
  language: Language,
): string {
  const currentCopy = copy[language];

  switch (status) {
    case "active":
      return currentCopy.active;
    case "completed":
      return currentCopy.completed;
    case "paused":
      return currentCopy.paused;
    case "cancelled":
      return currentCopy.cancelled;
    default:
      return status || currentCopy.unspecified;
  }
}

function getStatusClasses(status: string) {
  switch (status) {
    case "completed":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
    case "paused":
      return "border-amber-400/20 bg-amber-400/10 text-amber-200";
    case "cancelled":
      return "border-red-400/20 bg-red-400/10 text-red-200";
    case "active":
    default:
      return "border-indigo-400/20 bg-indigo-400/10 text-indigo-200";
  }
}

function getDateLocale(language: Language): string {
  switch (language) {
    case "de":
      return "de-DE";
    case "en":
      return "en-GB";
    case "ru":
      return "ru-RU";
    case "ar":
      return "ar";
    case "fa":
      return "fa-IR";
    case "tr":
    default:
      return "tr-TR";
  }
}

function formatDeadline(
  value: string | null,
  language: Language,
): string {
  if (!value) {
    return copy[language].noDeadline;
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    getDateLocale(language),
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    },
  ).format(date);
}

export default function ProcessesPage() {
  const router = useRouter();

  const language = useSyncExternalStore(
    subscribeToStoredLanguage,
    getStoredLanguageSnapshot,
    getServerLanguageSnapshot,
  );
  const [processes, setProcesses] =
    useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] =
    useState("");

  const currentCopy = copy[language];
  const direction = isRtlLanguage(language)
    ? "rtl"
    : "ltr";

  

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          if (isMounted) {
            setProcesses([]);
            setLoading(false);
            setErrorMessage(
              currentCopy.loginRequired,
            );
          }

          router.replace("/login");
          return;
        }

        try {
          const processesReference = collection(
            db,
            "users",
            user.uid,
            "processes",
          );

          let snapshot;

          try {
            const processesQuery = query(
              processesReference,
              orderBy("createdAt", "desc"),
            );

            snapshot = await getDocs(
              processesQuery,
            );
          } catch {
            snapshot = await getDocs(
              processesReference,
            );
          }

          if (!isMounted) {
            return;
          }

          const processList: Process[] =
            snapshot.docs.map((document) => {
              const data = document.data();

              const completedDocumentCount =
                typeof data.completedDocumentCount ===
                "number"
                  ? data.completedDocumentCount
                  : 0;

              const totalDocumentCount =
                typeof data.totalDocumentCount ===
                "number"
                  ? data.totalDocumentCount
                  : Array.isArray(
                        data.requiredDocuments,
                      )
                    ? data.requiredDocuments.length
                    : 0;

              const calculatedProgress =
                totalDocumentCount > 0
                  ? Math.round(
                      (completedDocumentCount /
                        totalDocumentCount) *
                        100,
                    )
                  : 0;

              return {
                id: document.id,
                templateKey:
                  typeof data.templateKey === "string"
                    ? data.templateKey
                    : undefined,
                title:
                  typeof data.title === "string"
                    ? data.title
                    : currentCopy.untitled,
                description:
                  typeof data.description === "string"
                    ? data.description
                    : "",
                country:
                  typeof data.country === "string"
                    ? data.country
                    : "",
                status:
                  typeof data.status === "string"
                    ? data.status
                    : "active",
                progress:
                  typeof data.progress === "number"
                    ? data.progress
                    : calculatedProgress,
                completedDocumentCount,
                totalDocumentCount,
                deadline:
                  typeof data.deadline === "string"
                    ? data.deadline
                    : null,
                createdAt:
                  data.createdAt instanceof Timestamp
                    ? data.createdAt
                    : null,
              };
            });

          processList.sort(
            (firstProcess, secondProcess) => {
              const firstDate =
                firstProcess.createdAt?.toMillis() ??
                0;
              const secondDate =
                secondProcess.createdAt?.toMillis() ??
                0;

              return secondDate - firstDate;
            },
          );

          setProcesses(processList);
          setErrorMessage("");
        } catch (error) {
          console.error(
            "Süreçler alınamadı:",
            error,
          );

          if (isMounted) {
            setErrorMessage(
              currentCopy.loadError,
            );
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      },
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [router, currentCopy.loadError, currentCopy.loginRequired, currentCopy.untitled]);

  const localizedProcesses = useMemo(
    () =>
      processes.map((process) => ({
        ...process,
        localizedTitle:
          getLocalizedProcessTitle(
            {
              templateKey: process.templateKey,
              title: process.title,
            },
            language,
          ) || process.title,
        localizedDescription:
          getLocalizedProcessDescription(
            {
              templateKey: process.templateKey,
              processTitle: process.title,
              processDescription: process.description,
            },
            language,
          ) || process.description,
      })),
    [processes, language],
  );

  return (
    <main
      dir={direction}
      className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-10 text-white sm:px-6"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute left-1/4 top-[-260px] h-[560px] w-[560px] rounded-full bg-indigo-700/20 blur-[150px]" />
        <div className="absolute bottom-[-280px] right-[-180px] h-[600px] w-[600px] rounded-full bg-blue-700/10 blur-[170px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-indigo-400/30 hover:bg-white/[0.06] hover:text-white"
        >
          <span aria-hidden="true">
            {direction === "rtl" ? "→" : "←"}
          </span>
          {currentCopy.backToDashboard}
        </Link>

        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">
              ALQEV
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
              {currentCopy.title}
            </h1>

            <p className="mt-4 max-w-2xl leading-7 text-slate-400">
              {currentCopy.description}
            </p>
          </div>

          <Link
            href="/processes/new"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-indigo-500 px-6 text-sm font-semibold text-white transition hover:bg-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
          >
            <span
              className={
                direction === "rtl"
                  ? "ml-2 text-lg"
                  : "mr-2 text-lg"
              }
              aria-hidden="true"
            >
              +
            </span>
            {currentCopy.newProcess}
          </Link>
        </div>

        <section className="mt-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">
                {currentCopy.activeProcesses}
              </h2>

              {!loading && !errorMessage ? (
                <p className="mt-1 text-sm text-slate-500">
                  {fillTemplate(
                    currentCopy.totalProcesses,
                    {
                      count:
                        localizedProcesses.length,
                    },
                  )}
                </p>
              ) : null}
            </div>
          </div>

          {loading ? (
            <div className="mt-8 flex min-h-64 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.035]">
              <div className="text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-400" />
                <p className="mt-4 text-sm text-slate-400">
                  {currentCopy.loading}
                </p>
              </div>
            </div>
          ) : null}

          {!loading && errorMessage ? (
            <div
              role="alert"
              className="mt-8 rounded-3xl border border-red-400/20 bg-red-400/10 p-8 text-center"
            >
              <h2 className="text-xl font-semibold text-red-100">
                {currentCopy.loadFailed}
              </h2>

              <p className="mt-3 text-sm leading-6 text-red-100/75">
                {errorMessage}
              </p>
            </div>
          ) : null}

          {!loading &&
          !errorMessage &&
          localizedProcesses.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-white/10 bg-white/[0.025] p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-2xl text-indigo-300">
                +
              </div>

              <h2 className="mt-5 text-xl font-semibold">
                {currentCopy.noProcesses}
              </h2>

              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-400">
                {currentCopy.noProcessesText}
              </p>

              <Link
                href="/processes/new"
                className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-slate-200"
              >
                {currentCopy.firstProcess}
              </Link>
            </div>
          ) : null}

          {!loading &&
          !errorMessage &&
          localizedProcesses.length > 0 ? (
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {localizedProcesses.map(
                (process) => {
                  const progress = Math.min(
                    100,
                    Math.max(
                      0,
                      Math.round(
                        process.progress,
                      ),
                    ),
                  );

                  return (
                    <Link
                      key={process.id}
                      href={`/processes/${process.id}`}
                      className="group rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-xl transition hover:-translate-y-1 hover:border-indigo-400/40 hover:bg-white/[0.055] hover:shadow-indigo-950/30"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
                            {process.country
                              ? getLocalizedCountryLabel(
                                  process.country,
                                  language,
                                )
                              : currentCopy.unspecified}
                          </p>

                          <h3 className="mt-3 text-xl font-semibold text-white transition group-hover:text-indigo-200">
                            {
                              process.localizedTitle
                            }
                          </h3>
                        </div>

                        <span
                          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(
                            process.status,
                          )}`}
                        >
                          {getStatusLabel(
                            process.status,
                            language,
                          )}
                        </span>
                      </div>

                      {process.localizedDescription ? (
                        <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-400">
                          {
                            process.localizedDescription
                          }
                        </p>
                      ) : null}

                      <div className="mt-7">
                        <div className="flex items-center justify-between gap-4 text-sm">
                          <span className="text-slate-400">
                            {
                              currentCopy.progress
                            }
                          </span>

                          <span className="font-semibold text-white">
                            %{progress}
                          </span>
                        </div>

                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-indigo-500 transition-all"
                            style={{
                              width: `${progress}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/5 bg-black/10 p-4">
                          <p className="text-xs text-slate-500">
                            {
                              currentCopy.documents
                            }
                          </p>

                          <p className="mt-2 text-sm font-semibold text-slate-200">
                            {
                              process.completedDocumentCount
                            }{" "}
                            /{" "}
                            {
                              process.totalDocumentCount
                            }
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/5 bg-black/10 p-4">
                          <p className="text-xs text-slate-500">
                            {
                              currentCopy.deadline
                            }
                          </p>

                          <p className="mt-2 text-sm font-semibold text-slate-200">
                            {formatDeadline(
                              process.deadline,
                              language,
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5">
                        <span className="text-sm font-medium text-indigo-300">
                          {
                            currentCopy.openDetails
                          }
                        </span>

                        <span
                          aria-hidden="true"
                          className={
                            direction === "rtl"
                              ? "text-xl text-indigo-300 transition-transform group-hover:-translate-x-1"
                              : "text-xl text-indigo-300 transition-transform group-hover:translate-x-1"
                          }
                        >
                          {direction === "rtl"
                            ? "←"
                            : "→"}
                        </span>
                      </div>
                    </Link>
                  );
                },
              )}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}