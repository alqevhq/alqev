"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import {
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { analyzeProcesses } from "@/lib/ai";

type UserProfile = {
  fullName: string;
  email: string;
  language: string;
  country: string;
  onboardingCompleted: boolean;
  subscription: string;
  needs: string[];
};

type RequiredDocument = {
  key: string;
  title: string;
  description?: string;
  required?: boolean;
  status?: string;
  fileName?: string;
  fileUrl?: string;
};

type Process = {
  id: string;
  title: string;
  description: string;
  country: string;
  status: string;
  progress: number;
  completedDocumentCount: number;
  totalDocumentCount: number;
  deadline: string | null;
  requiredDocuments: RequiredDocument[];
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};

type DashboardCardProps = {
  title: string;
  description: string;
  value: string;
  href: string;
};

type PriorityItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  severity: "critical" | "warning" | "info" | "success";
};

const countryLabels: Record<string, string> = {
  DE: "Almanya",
  TR: "Türkiye",
  AT: "Avusturya",
  CH: "İsviçre",
  NL: "Hollanda",
  BE: "Belçika",
  FR: "Fransa",
  GB: "Birleşik Krallık",
  OTHER: "Diğer",
};

const languageLabels: Record<string, string> = {
  tr: "Türkçe",
  de: "Deutsch",
  en: "English",
  ar: "العربية",
  fa: "فارسی",
};

const priorityStyles: Record<
  PriorityItem["severity"],
  {
    card: string;
    icon: string;
    badge: string;
    label: string;
  }
> = {
  critical: {
    card: "border-rose-400/20 bg-rose-400/[0.055]",
    icon: "bg-rose-400/15 text-rose-200",
    badge: "bg-rose-400/10 text-rose-200",
    label: "Kritik",
  },
  warning: {
    card: "border-amber-400/20 bg-amber-400/[0.05]",
    icon: "bg-amber-400/15 text-amber-200",
    badge: "bg-amber-400/10 text-amber-200",
    label: "Önemli",
  },
  info: {
    card: "border-indigo-400/20 bg-indigo-400/[0.05]",
    icon: "bg-indigo-400/15 text-indigo-200",
    badge: "bg-indigo-400/10 text-indigo-200",
    label: "Öneri",
  },
  success: {
    card: "border-emerald-400/20 bg-emerald-400/[0.05]",
    icon: "bg-emerald-400/15 text-emerald-200",
    badge: "bg-emerald-400/10 text-emerald-200",
    label: "Hazır",
  },
};

function DashboardCard({
  title,
  description,
  value,
  href,
}: DashboardCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-3xl border border-white/10 bg-white/[0.035] p-6 transition hover:-translate-y-1 hover:border-indigo-400/40 hover:bg-white/[0.06]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-400">
            {title}
          </p>

          <p className="mt-3 text-3xl font-bold text-white">
            {value}
          </p>
        </div>

        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 transition group-hover:border-indigo-400/30 group-hover:text-indigo-300">
          →
        </span>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-400">
        {description}
      </p>
    </Link>
  );
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item === "string" &&
      item.trim().length > 0,
  );
}

function normalizeDocuments(
  value: unknown,
): RequiredDocument[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object",
    )
    .map((item, index) => ({
      key:
        typeof item.key === "string" && item.key.trim()
          ? item.key
          : `document-${index}`,
      title:
        typeof item.title === "string" &&
        item.title.trim()
          ? item.title
          : "Başlıksız belge",
      description:
        typeof item.description === "string"
          ? item.description
          : undefined,
      required:
        typeof item.required === "boolean"
          ? item.required
          : undefined,
      status:
        typeof item.status === "string"
          ? item.status
          : "missing",
      fileName:
        typeof item.fileName === "string"
          ? item.fileName
          : undefined,
      fileUrl:
        typeof item.fileUrl === "string"
          ? item.fileUrl
          : undefined,
    }));
}

function createFallbackProfile(
  user: User,
): UserProfile {
  return {
    fullName:
      user.displayName?.trim() ||
      user.email?.split("@")[0] ||
      "Kullanıcı",
    email: user.email || "",
    language: "tr",
    country: "",
    onboardingCompleted: false,
    subscription: "free",
    needs: [],
  };
}

function parseDeadline(
  value: string | null,
): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function formatDeadline(
  value: string | null,
): string {
  const date = parseDeadline(value);

  if (!date) {
    return "Hedef tarih yok";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getDaysUntil(
  value: string | null,
): number | null {
  const deadline = parseDeadline(value);

  if (!deadline) {
    return null;
  }

  const today = new Date();

  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);

  return Math.ceil(
    (deadline.getTime() - today.getTime()) /
      86_400_000,
  );
}

function isCompletedDocument(
  documentItem: RequiredDocument,
): boolean {
  return (
    documentItem.status === "uploaded" ||
    documentItem.status === "approved"
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 6) {
    return "İyi geceler";
  }

  if (hour < 12) {
    return "Günaydın";
  }

  if (hour < 18) {
    return "İyi günler";
  }

  return "İyi akşamlar";
}

function getReadinessLabel(
  score: number,
): string {
  if (score >= 90) {
    return "Başvuruya çok yakınsın";
  }

  if (score >= 70) {
    return "Hazırlığın iyi ilerliyor";
  }

  if (score >= 40) {
    return "Bazı önemli eksikler var";
  }

  if (score > 0) {
    return "Hazırlığa yeni başlıyorsun";
  }

  return "Henüz analiz verisi yok";
}

function getRiskLevel(input: {
  criticalCount: number;
  requiredMissingCount: number;
  nearestDeadlineDays: number | null;
}): {
  label: string;
  description: string;
  className: string;
} {
  if (
    input.criticalCount > 0 ||
    (input.nearestDeadlineDays !== null &&
      input.nearestDeadlineDays <= 3 &&
      input.requiredMissingCount > 0)
  ) {
    return {
      label: "Yüksek risk",
      description:
        "Kritik bir eksik veya çok yakın bir hedef tarih bulunuyor.",
      className:
        "border-rose-400/20 bg-rose-400/[0.07] text-rose-100",
    };
  }

  if (
    input.requiredMissingCount > 0 ||
    (input.nearestDeadlineDays !== null &&
      input.nearestDeadlineDays <= 14)
  ) {
    return {
      label: "Orta risk",
      description:
        "Tamamlanması gereken belge veya yaklaşan tarih bulunuyor.",
      className:
        "border-amber-400/20 bg-amber-400/[0.07] text-amber-100",
    };
  }

  return {
    label: "Düşük risk",
    description:
      "Şu anda acil müdahale gerektiren bir durum görünmüyor.",
    className:
      "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-100",
  };
}

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] =
    useState<User | null>(null);

  const [profile, setProfile] =
    useState<UserProfile | null>(null);

  const [processes, setProcesses] =
    useState<Process[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSigningOut, setIsSigningOut] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (!currentUser) {
          router.replace("/login");
          return;
        }

        if (!isMounted) {
          return;
        }

        setUser(currentUser);
        setErrorMessage("");

        try {
          const userDocumentReference = doc(
            db,
            "users",
            currentUser.uid,
          );

          const processesReference = collection(
            db,
            "users",
            currentUser.uid,
            "processes",
          );

          const [
            userDocumentSnapshot,
            processSnapshot,
          ] = await Promise.all([
            getDoc(userDocumentReference),
            getDocs(
              query(
                processesReference,
                orderBy("createdAt", "desc"),
              ),
            ).catch(() =>
              getDocs(processesReference),
            ),
          ]);

          if (!isMounted) {
            return;
          }

          if (userDocumentSnapshot.exists()) {
            const data =
              userDocumentSnapshot.data();

            setProfile({
              fullName:
                typeof data.fullName === "string" &&
                data.fullName.trim()
                  ? data.fullName.trim()
                  : currentUser.displayName?.trim() ||
                    currentUser.email?.split("@")[0] ||
                    "Kullanıcı",
              email:
                typeof data.email === "string" &&
                data.email.trim()
                  ? data.email.trim()
                  : currentUser.email || "",
              language:
                typeof data.language === "string" &&
                data.language.trim()
                  ? data.language.trim()
                  : "tr",
              country:
                typeof data.country === "string"
                  ? data.country.trim()
                  : "",
              onboardingCompleted:
                typeof data.onboardingCompleted ===
                "boolean"
                  ? data.onboardingCompleted
                  : false,
              subscription:
                typeof data.subscription === "string" &&
                data.subscription.trim()
                  ? data.subscription.trim()
                  : "free",
              needs: normalizeStringArray(
                data.needs,
              ),
            });
          } else {
            setProfile(
              createFallbackProfile(currentUser),
            );

            setErrorMessage(
              "Kullanıcı profil belgesi bulunamadı. Geçici bilgiler gösteriliyor.",
            );
          }

          const processList: Process[] =
            processSnapshot.docs.map(
              (processDocument) => {
                const data =
                  processDocument.data();

                const requiredDocuments =
                  normalizeDocuments(
                    data.requiredDocuments,
                  );

                const calculatedCompletedCount =
                  requiredDocuments.filter(
                    isCompletedDocument,
                  ).length;

                const completedDocumentCount =
                  typeof data.completedDocumentCount ===
                  "number"
                    ? data.completedDocumentCount
                    : calculatedCompletedCount;

                const totalDocumentCount =
                  typeof data.totalDocumentCount ===
                  "number"
                    ? data.totalDocumentCount
                    : requiredDocuments.length;

                const calculatedProgress =
                  totalDocumentCount > 0
                    ? Math.round(
                        (completedDocumentCount /
                          totalDocumentCount) *
                          100,
                      )
                    : 0;

                return {
                  id: processDocument.id,
                  title:
                    typeof data.title === "string" &&
                    data.title.trim()
                      ? data.title
                      : "Başlıksız Süreç",
                  description:
                    typeof data.description ===
                    "string"
                      ? data.description
                      : "",
                  country:
                    typeof data.country === "string"
                      ? data.country
                      : "Belirtilmedi",
                  status:
                    typeof data.status === "string"
                      ? data.status
                      : "active",
                  progress:
                    typeof data.progress === "number"
                      ? Math.min(
                          100,
                          Math.max(
                            0,
                            Math.round(data.progress),
                          ),
                        )
                      : calculatedProgress,
                  completedDocumentCount,
                  totalDocumentCount,
                  deadline:
                    typeof data.deadline === "string"
                      ? data.deadline
                      : null,
                  requiredDocuments,
                  createdAt:
                    data.createdAt instanceof Timestamp
                      ? data.createdAt
                      : null,
                  updatedAt:
                    data.updatedAt instanceof Timestamp
                      ? data.updatedAt
                      : null,
                };
              },
            );

          processList.sort(
            (first, second) =>
              (second.createdAt?.toMillis() ??
                0) -
              (first.createdAt?.toMillis() ??
                0),
          );

          setProcesses(processList);
        } catch (error) {
          console.error(
            "Dashboard verileri yüklenemedi:",
            error,
          );

          if (!isMounted) {
            return;
          }

          setProfile(
            createFallbackProfile(currentUser),
          );

          setErrorMessage(
            "Dashboard verileri yüklenirken bir hata oluştu. Lütfen sayfayı yenileyip tekrar dene.",
          );
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      },
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [router]);

  const dashboardData = useMemo(() => {
    const activeProcesses = processes.filter(
      (item) => item.status === "active",
    );

    const totalCompletedDocuments =
      processes.reduce(
        (sum, item) =>
          sum + item.completedDocumentCount,
        0,
      );

    const totalDocuments = processes.reduce(
      (sum, item) =>
        sum + item.totalDocumentCount,
      0,
    );

    const totalMissingDocuments = Math.max(
      0,
      totalDocuments -
        totalCompletedDocuments,
    );

    const requiredMissingDocuments =
      processes.flatMap((processItem) =>
        processItem.requiredDocuments
          .filter(
            (documentItem) =>
              documentItem.required !== false &&
              !isCompletedDocument(documentItem),
          )
          .map((documentItem) => ({
            processId: processItem.id,
            processTitle: processItem.title,
            document: documentItem,
          })),
      );

    const optionalMissingDocuments =
      processes.flatMap((processItem) =>
        processItem.requiredDocuments
          .filter(
            (documentItem) =>
              documentItem.required === false &&
              !isCompletedDocument(documentItem),
          )
          .map((documentItem) => ({
            processId: processItem.id,
            processTitle: processItem.title,
            document: documentItem,
          })),
      );

    const upcomingProcesses = processes
      .map((item) => ({
        ...item,
        daysUntil: getDaysUntil(item.deadline),
      }))
      .filter(
        (
          item,
        ): item is Process & {
          daysUntil: number;
        } =>
          item.daysUntil !== null &&
          item.daysUntil >= 0,
      )
      .sort(
        (first, second) =>
          first.daysUntil - second.daysUntil,
      );

    const overdueProcesses = processes
      .map((item) => ({
        ...item,
        daysUntil: getDaysUntil(item.deadline),
      }))
      .filter(
        (
          item,
        ): item is Process & {
          daysUntil: number;
        } =>
          item.daysUntil !== null &&
          item.daysUntil < 0,
      )
      .sort(
        (first, second) =>
          first.daysUntil - second.daysUntil,
      );

    const primaryProcess =
      activeProcesses[0] ??
      processes[0] ??
      null;

    return {
      activeProcesses,
      totalCompletedDocuments,
      totalDocuments,
      totalMissingDocuments,
      requiredMissingDocuments,
      optionalMissingDocuments,
      upcomingProcesses,
      overdueProcesses,
      primaryProcess,
    };
  }, [processes]);

  const aiAnalysis = useMemo(
    () => analyzeProcesses(processes),
    [processes],
  );

  const dashboardIntelligence = useMemo(() => {
    const criticalRecommendations =
      aiAnalysis.recommendations.filter(
        (item) =>
          item.severity === "critical",
      );

    const warningRecommendations =
      aiAnalysis.recommendations.filter(
        (item) =>
          item.severity === "warning",
      );

    const nearestDeadline =
      dashboardData.upcomingProcesses[0] ??
      null;

    const priorities: PriorityItem[] = [];

    for (const recommendation of [
      ...criticalRecommendations,
      ...warningRecommendations,
    ].slice(0, 3)) {
      priorities.push({
        id: `recommendation-${priorities.length}`,
        title:
          recommendation.severity === "critical"
            ? "Kritik AI uyarısı"
            : "AI önerisi",
        description: recommendation.message,
        href: dashboardData.primaryProcess
          ? `/processes/${dashboardData.primaryProcess.id}`
          : "/processes/new",
        severity:
          recommendation.severity === "critical"
            ? "critical"
            : "warning",
      });
    }

    for (const item of dashboardData.requiredMissingDocuments) {
      if (priorities.length >= 3) {
        break;
      }

      priorities.push({
        id: `missing-${item.processId}-${item.document.key}`,
        title: item.document.title,
        description: `${item.processTitle} sürecindeki zorunlu belge henüz yüklenmedi.`,
        href: `/processes/${item.processId}`,
        severity: "warning",
      });
    }

    if (
      priorities.length < 3 &&
      nearestDeadline
    ) {
      priorities.push({
        id: `deadline-${nearestDeadline.id}`,
        title: nearestDeadline.title,
        description:
          nearestDeadline.daysUntil === 0
            ? "Bu sürecin hedef tarihi bugün."
            : `${nearestDeadline.daysUntil} gün sonra hedef tarihe ulaşacak.`,
        href: `/processes/${nearestDeadline.id}`,
        severity:
          nearestDeadline.daysUntil <= 3
            ? "critical"
            : nearestDeadline.daysUntil <= 14
              ? "warning"
              : "info",
      });
    }

    if (
      priorities.length === 0 &&
      dashboardData.primaryProcess
    ) {
      priorities.push({
        id: "ready-primary-process",
        title: "Hazırlığın kontrol altında",
        description:
          "Şu anda kritik bir eksik görünmüyor. Sürecindeki bilgileri güncel tutmaya devam et.",
        href: `/processes/${dashboardData.primaryProcess.id}`,
        severity: "success",
      });
    }

    if (priorities.length === 0) {
      priorities.push({
        id: "create-first-process",
        title: "İlk sürecini oluştur",
        description:
          "Kişisel öneriler ve hazırlık analizi için ilk sürecini başlat.",
        href: "/processes/new",
        severity: "info",
      });
    }

    const risk = getRiskLevel({
      criticalCount:
        criticalRecommendations.length +
        dashboardData.overdueProcesses.length,
      requiredMissingCount:
        dashboardData.requiredMissingDocuments
          .length,
      nearestDeadlineDays:
        nearestDeadline?.daysUntil ?? null,
    });

    const estimatedDays =
      dashboardData.requiredMissingDocuments
        .length > 0
        ? Math.max(
            1,
            dashboardData.requiredMissingDocuments
              .length * 2,
          )
        : dashboardData.optionalMissingDocuments
              .length > 0
          ? Math.max(
              1,
              dashboardData.optionalMissingDocuments
                .length,
            )
          : 0;

    const nextAction =
      dashboardData.requiredMissingDocuments[0];

    return {
      priorities,
      criticalCount:
        criticalRecommendations.length +
        dashboardData.overdueProcesses.length,
      warningCount:
        warningRecommendations.length +
        dashboardData.requiredMissingDocuments
          .length,
      risk,
      estimatedDays,
      nextAction,
    };
  }, [aiAnalysis, dashboardData]);

  async function handleSignOut() {
    try {
      setIsSigningOut(true);
      setErrorMessage("");

      await signOut(auth);

      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error(
        "Çıkış yapılamadı:",
        error,
      );

      setErrorMessage(
        "Çıkış yapılırken bir hata oluştu. Lütfen tekrar dene.",
      );

      setIsSigningOut(false);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-400" />

          <p className="mt-4 text-sm text-slate-400">
            HUMANITY OS hazırlanıyor...
          </p>
        </div>
      </main>
    );
  }

  if (!user || !profile) {
    return null;
  }

  const displayName =
    profile.fullName.trim() ||
    user.displayName?.trim() ||
    user.email?.split("@")[0] ||
    "Kullanıcı";

  const firstName =
    displayName.split(/\s+/)[0] ||
    displayName;

  const subscriptionLabel =
    profile.subscription.toLowerCase() ===
    "free"
      ? "Ücretsiz plan"
      : profile.subscription;

  const countryLabel = profile.country
    ? countryLabels[profile.country] ||
      profile.country
    : "Belirtilmedi";

  const languageLabel =
    languageLabels[profile.language] ||
    profile.language.toUpperCase();

  const primaryProcess =
    dashboardData.primaryProcess;

  const nearestDeadline =
    dashboardData.upcomingProcesses[0] ??
    null;

  const readinessScore =
    aiAnalysis.readiness.score;

  const completedPercentage =
    dashboardData.totalDocuments > 0
      ? Math.round(
          (dashboardData.totalCompletedDocuments /
            dashboardData.totalDocuments) *
            100,
        )
      : 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute left-1/4 top-[-300px] h-[600px] w-[600px] rounded-full bg-indigo-700/15 blur-[160px]" />

        <div className="absolute bottom-[-300px] right-[-200px] h-[600px] w-[600px] rounded-full bg-blue-700/10 blur-[170px]" />
      </div>

      <header className="relative z-10 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link
            href="/dashboard"
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500 text-xl font-bold">
              H
            </div>

            <div>
              <p className="font-bold">
                HUMANITY OS
              </p>

              <p className="text-xs text-slate-500">
                Personal Dashboard
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-white">
                {displayName}
              </p>

              <p className="max-w-48 truncate text-xs text-slate-500">
                {profile.email}
              </p>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSigningOut
                ? "Çıkış yapılıyor..."
                : "Çıkış yap"}
            </button>
          </div>
        </nav>
      </header>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-10">
        {errorMessage ? (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-400/[0.07] px-5 py-4 text-sm leading-6 text-amber-100"
          >
            {errorMessage}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/15 via-white/[0.035] to-transparent p-7 sm:p-10">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">
                Günlük yaşam merkezi
              </p>

              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
                {getGreeting()}, {firstName}. 👋
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">
                Bugünkü önceliklerini, eksik
                belgelerini ve yaklaşan tarihlerini
                tek ekrandan yönet.
              </p>
            </div>

            <div className="grid min-w-64 gap-3 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm">
              <div className="flex items-center justify-between gap-6">
                <span className="text-slate-500">
                  Plan
                </span>

                <span className="font-semibold text-slate-200">
                  {subscriptionLabel}
                </span>
              </div>

              <div className="flex items-center justify-between gap-6">
                <span className="text-slate-500">
                  Dil
                </span>

                <span className="font-semibold text-slate-200">
                  {languageLabel}
                </span>
              </div>

              <div className="flex items-center justify-between gap-6">
                <span className="text-slate-500">
                  Ülke
                </span>

                <span className="font-semibold text-slate-200">
                  {countryLabel}
                </span>
              </div>

              <div className="flex items-center justify-between gap-6">
                <span className="text-slate-500">
                  Profil
                </span>

                <span
                  className={
                    profile.onboardingCompleted
                      ? "font-semibold text-emerald-300"
                      : "font-semibold text-amber-300"
                  }
                >
                  {profile.onboardingCompleted
                    ? "Tamamlandı"
                    : "Tamamlanmadı"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/processes/new"
              className="inline-flex items-center justify-center rounded-xl bg-indigo-500 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-400"
            >
              Yeni süreç başlat
            </Link>

            <Link
              href="/processes"
              className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-6 py-3.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
            >
              Süreçlerimi görüntüle
            </Link>
          </div>
        </section>

        {!profile.onboardingCompleted ? (
          <section className="mt-6 rounded-3xl border border-amber-400/20 bg-amber-400/[0.06] p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div>
              <p className="font-semibold text-amber-100">
                Profilini tamamlaman gerekiyor
              </p>

              <p className="mt-2 text-sm leading-6 text-amber-100/70">
                Ülke, dil ve kişisel ihtiyaç
                bilgilerini eklediğinde HUMANITY OS
                daha doğru öneriler oluşturabilir.
              </p>
            </div>

            <Link
              href="/onboarding"
              className="mt-5 inline-flex shrink-0 items-center justify-center rounded-xl bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 sm:mt-0"
            >
              Profili tamamla
            </Link>
          </section>
        ) : null}

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <DashboardCard
            title="Aktif süreçler"
            value={String(
              dashboardData.activeProcesses.length,
            )}
            description="Devam eden başvuru ve resmî işlemlerin."
            href="/processes"
          />

          <DashboardCard
            title="Belgeler"
            value={`${dashboardData.totalCompletedDocuments} / ${dashboardData.totalDocuments}`}
            description={`Belgelerin %${completedPercentage} oranında hazır.`}
            href={
              primaryProcess
                ? `/processes/${primaryProcess.id}`
                : "/processes"
            }
          />

          <DashboardCard
            title="Kritik görevler"
            value={String(
              dashboardIntelligence.criticalCount,
            )}
            description="Hızlıca ele alınması gereken uyarılar."
            href={
              primaryProcess
                ? `/processes/${primaryProcess.id}`
                : "/processes"
            }
          />

          <DashboardCard
            title="Eksik belgeler"
            value={String(
              dashboardData.totalMissingDocuments,
            )}
            description={`${dashboardData.requiredMissingDocuments.length} zorunlu belge bekliyor.`}
            href={
              primaryProcess
                ? `/processes/${primaryProcess.id}`
                : "/processes"
            }
          />
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-3xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/[0.12] via-white/[0.035] to-cyan-400/[0.04] p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-300">
                  AI hazırlık analizi
                </p>

                <h2 className="mt-3 text-2xl font-bold">
                  Immigration Readiness
                </h2>
              </div>

              <div className="rounded-2xl border border-indigo-300/20 bg-black/20 px-4 py-3 text-right">
                <span className="text-4xl font-black text-white">
                  {readinessScore}
                </span>

                <span className="ml-1 text-lg text-slate-500">
                  / 100
                </span>
              </div>
            </div>

            <div className="mt-7 h-3 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all"
                style={{
                  width: `${readinessScore}%`,
                }}
              />
            </div>

            <p className="mt-4 font-semibold text-slate-200">
              {getReadinessLabel(readinessScore)}
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              {aiAnalysis.readiness.totalItems > 0
                ? `${aiAnalysis.readiness.completedItems} / ${aiAnalysis.readiness.totalItems} belge tamamlandı. Zorunlu belgelere daha yüksek ağırlık verildi.`
                : "Hazırlık puanı için önce bir süreç ve belge listesi oluştur."}
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.05] p-4">
                <p className="text-sm text-emerald-200/70">
                  Hazır belgeler
                </p>

                <p className="mt-2 text-2xl font-bold text-emerald-100">
                  {
                    dashboardData.totalCompletedDocuments
                  }
                </p>
              </div>

              <div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.05] p-4">
                <p className="text-sm text-amber-200/70">
                  Zorunlu eksikler
                </p>

                <p className="mt-2 text-2xl font-bold text-amber-100">
                  {
                    dashboardData
                      .requiredMissingDocuments
                      .length
                  }
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-300">
                  HUMANITY AI
                </p>

                <h2 className="mt-3 text-2xl font-bold">
                  Bugünkü önceliklerin
                </h2>
              </div>

              <p className="text-sm text-slate-500">
                En önemli 3 adım
              </p>
            </div>

            <div className="mt-6 space-y-3">
              {dashboardIntelligence.priorities.map(
                (item, index) => {
                  const style =
                    priorityStyles[item.severity];

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`group flex gap-4 rounded-2xl border p-4 transition hover:-translate-y-0.5 ${style.card}`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold ${style.icon}`}
                      >
                        {index + 1}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-slate-100">
                            {item.title}
                          </p>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${style.badge}`}
                          >
                            {style.label}
                          </span>
                        </div>

                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          {item.description}
                        </p>
                      </div>

                      <span className="self-center text-slate-600 transition group-hover:text-indigo-300">
                        →
                      </span>
                    </Link>
                  );
                },
              )}
            </div>
          </article>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <article
            className={`rounded-3xl border p-6 ${dashboardIntelligence.risk.className}`}
          >
            <p className="text-sm font-medium opacity-70">
              Risk analizi
            </p>

            <p className="mt-3 text-2xl font-bold">
              {dashboardIntelligence.risk.label}
            </p>

            <p className="mt-3 text-sm leading-6 opacity-75">
              {
                dashboardIntelligence.risk
                  .description
              }
            </p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
            <p className="text-sm font-medium text-slate-500">
              Sonraki adım
            </p>

            <p className="mt-3 text-xl font-bold">
              {dashboardIntelligence.nextAction
                ? dashboardIntelligence.nextAction
                    .document.title
                : primaryProcess
                  ? "Sürecini kontrol et"
                  : "İlk sürecini oluştur"}
            </p>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              {dashboardIntelligence.nextAction
                ? `${dashboardIntelligence.nextAction.processTitle} sürecindeki zorunlu belgeyi yükle.`
                : primaryProcess
                  ? "Yeni uyarı veya eksik belge olup olmadığını kontrol et."
                  : "Kişisel yol haritanı oluşturmak için bir süreç başlat."}
            </p>

            <Link
              href={
                dashboardIntelligence.nextAction
                  ? `/processes/${dashboardIntelligence.nextAction.processId}`
                  : primaryProcess
                    ? `/processes/${primaryProcess.id}`
                    : "/processes/new"
              }
              className="mt-5 inline-flex text-sm font-semibold text-indigo-300 transition hover:text-indigo-200"
            >
              Adımı aç →
            </Link>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
            <p className="text-sm font-medium text-slate-500">
              Tahmini hazırlık
            </p>

            <p className="mt-3 text-2xl font-bold">
              {dashboardIntelligence.estimatedDays >
              0
                ? `${dashboardIntelligence.estimatedDays} gün`
                : "Hazır"}
            </p>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              {dashboardIntelligence.estimatedDays >
              0
                ? "Bu tahmin eksik belge sayısına göre oluşturuldu."
                : "Mevcut belge listesinde zorunlu bir eksik görünmüyor."}
            </p>
          </article>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
            {primaryProcess ? (
              <>
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Öne çıkan süreç
                    </p>

                    <h2 className="mt-2 text-2xl font-bold">
                      {primaryProcess.title}
                    </h2>
                  </div>

                  <div className="rounded-full border border-indigo-400/20 bg-indigo-400/10 px-4 py-2 text-sm font-semibold text-indigo-300">
                    %{primaryProcess.progress} tamamlandı
                  </div>
                </div>

                <div className="mt-7 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all"
                    style={{
                      width: `${primaryProcess.progress}%`,
                    }}
                  />
                </div>

                <div className="mt-8 space-y-4">
                  {primaryProcess.requiredDocuments
                    .length > 0 ? (
                    primaryProcess.requiredDocuments
                      .slice(0, 4)
                      .map(
                        (
                          documentItem,
                          index,
                        ) => {
                          const completed =
                            isCompletedDocument(
                              documentItem,
                            );

                          return (
                            <div
                              key={
                                documentItem.key ||
                                `${documentItem.title}-${index}`
                              }
                              className={
                                completed
                                  ? "flex items-center gap-4 rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.04] p-4"
                                  : "flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4"
                              }
                            >
                              <span
                                className={
                                  completed
                                    ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300"
                                    : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-600 text-slate-500"
                                }
                              >
                                {completed
                                  ? "✓"
                                  : "○"}
                              </span>

                              <div className="min-w-0">
                                <p className="font-semibold text-slate-200">
                                  {
                                    documentItem.title
                                  }
                                </p>

                                <p
                                  className={
                                    completed
                                      ? "mt-1 text-sm text-slate-500"
                                      : "mt-1 text-sm text-amber-300/80"
                                  }
                                >
                                  {completed
                                    ? documentItem.fileName ||
                                      "Belge yüklendi."
                                    : documentItem.required ===
                                        false
                                      ? "İsteğe bağlı belge henüz yüklenmedi."
                                      : "Zorunlu belge henüz yüklenmedi."}
                                </p>
                              </div>
                            </div>
                          );
                        },
                      )
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
                      Bu süreç için henüz belge
                      listesi oluşturulmamış.
                    </div>
                  )}
                </div>

                <Link
                  href={`/processes/${primaryProcess.id}`}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-indigo-300 transition hover:text-indigo-200"
                >
                  Süreç detayını aç
                  <span aria-hidden="true">
                    →
                  </span>
                </Link>
              </>
            ) : (
              <div className="flex min-h-80 flex-col items-center justify-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-2xl text-indigo-300">
                  +
                </div>

                <h2 className="mt-5 text-2xl font-bold">
                  Henüz bir sürecin yok
                </h2>

                <p className="mt-3 max-w-lg text-sm leading-6 text-slate-400">
                  İlk sürecini başlattığında
                  ilerleme durumun ve gerekli
                  belgelerin burada görünecek.
                </p>

                <Link
                  href="/processes/new"
                  className="mt-6 inline-flex rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400"
                >
                  İlk süreci başlat
                </Link>
              </div>
            )}
          </article>

          <aside className="space-y-6">
            <article className="rounded-3xl border border-indigo-400/20 bg-indigo-500/[0.08] p-6">
              <p className="text-sm font-semibold text-indigo-300">
                AI durum özeti
              </p>

              <p className="mt-4 text-xl font-bold text-slate-100">
                {getReadinessLabel(readinessScore)}
              </p>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                {dashboardIntelligence
                  .criticalCount > 0
                  ? `${dashboardIntelligence.criticalCount} kritik konu öncelikli olarak ele alınmalı.`
                  : dashboardData
                        .requiredMissingDocuments
                        .length > 0
                    ? `${dashboardData.requiredMissingDocuments.length} zorunlu belge tamamlanmayı bekliyor.`
                    : "Şu anda kritik bir eksik görünmüyor."}
              </p>

              <Link
                href={
                  primaryProcess
                    ? `/processes/${primaryProcess.id}`
                    : "/processes/new"
                }
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400"
              >
                {primaryProcess
                  ? "Sürece git"
                  : "Süreç oluştur"}
              </Link>
            </article>

            <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
              <p className="text-sm font-medium text-slate-500">
                Yaklaşan önemli tarih
              </p>

              {nearestDeadline ? (
                <>
                  <p className="mt-3 text-xl font-bold">
                    {nearestDeadline.title}
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    {nearestDeadline.daysUntil ===
                    0
                      ? "Hedef tarih bugün."
                      : `${nearestDeadline.daysUntil} gün içinde tamamlanmalı.`}
                  </p>

                  <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4">
                    <p className="text-sm font-medium text-amber-200">
                      {formatDeadline(
                        nearestDeadline.deadline,
                      )}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-3 text-xl font-bold">
                    Yaklaşan tarih yok
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Süreçlerine hedef tarih
                    eklediğinde en yakın tarih burada
                    görünecek.
                  </p>
                </>
              )}
            </article>
          </aside>
        </section>
      </div>
    </main>
  );
}