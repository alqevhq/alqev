"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  createdAt: Timestamp | null;
};

function getStatusLabel(status: string) {
  switch (status) {
    case "active":
      return "Aktif";

    case "completed":
      return "Tamamlandı";

    case "paused":
      return "Beklemede";

    case "cancelled":
      return "İptal edildi";

    default:
      return status || "Belirtilmedi";
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

function formatDeadline(value: string | null) {
  if (!value) {
    return "Hedef tarih yok";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function ProcessesPage() {
  const router = useRouter();

  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (isMounted) {
          setProcesses([]);
          setLoading(false);
          setErrorMessage(
            "Süreçlerini görmek için hesabına giriş yapmalısın.",
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

          snapshot = await getDocs(processesQuery);
        } catch {
          snapshot = await getDocs(processesReference);
        }

        if (!isMounted) {
          return;
        }

        const processList: Process[] = snapshot.docs.map((document) => {
          const data = document.data();

          const completedDocumentCount =
            typeof data.completedDocumentCount === "number"
              ? data.completedDocumentCount
              : 0;

          const totalDocumentCount =
            typeof data.totalDocumentCount === "number"
              ? data.totalDocumentCount
              : Array.isArray(data.requiredDocuments)
                ? data.requiredDocuments.length
                : 0;

          const calculatedProgress =
            totalDocumentCount > 0
              ? Math.round(
                  (completedDocumentCount / totalDocumentCount) * 100,
                )
              : 0;

          return {
            id: document.id,
            title:
              typeof data.title === "string"
                ? data.title
                : "Başlıksız Süreç",
            description:
              typeof data.description === "string"
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

        processList.sort((firstProcess, secondProcess) => {
          const firstDate =
            firstProcess.createdAt?.toMillis() ?? 0;
          const secondDate =
            secondProcess.createdAt?.toMillis() ?? 0;

          return secondDate - firstDate;
        });

        setProcesses(processList);
        setErrorMessage("");
      } catch (error) {
        console.error("Süreçler alınamadı:", error);

        if (isMounted) {
          setErrorMessage(
            "Süreçler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyip tekrar dene.",
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [router]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-10 text-white sm:px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute left-1/4 top-[-260px] h-[560px] w-[560px] rounded-full bg-indigo-700/20 blur-[150px]" />

        <div className="absolute bottom-[-280px] right-[-180px] h-[600px] w-[600px] rounded-full bg-blue-700/10 blur-[170px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">
              HUMANITY OS
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
              Süreçlerim
            </h1>

            <p className="mt-4 max-w-2xl leading-7 text-slate-400">
              Aktif süreçlerini, gerekli belgelerini ve ilerleme
              durumunu tek ekrandan takip et.
            </p>
          </div>

          <Link
            href="/processes/new"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-indigo-500 px-6 text-sm font-semibold text-white transition hover:bg-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
          >
            <span className="mr-2 text-lg" aria-hidden="true">
              +
            </span>
            Yeni Süreç Başlat
          </Link>
        </div>

        <section className="mt-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Aktif süreçler
              </h2>

              {!loading && !errorMessage ? (
                <p className="mt-1 text-sm text-slate-500">
                  Toplam {processes.length} süreç
                </p>
              ) : null}
            </div>
          </div>

          {loading ? (
            <div className="mt-8 flex min-h-64 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.035]">
              <div className="text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-400" />

                <p className="mt-4 text-sm text-slate-400">
                  Süreçler yükleniyor...
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
                Süreçler görüntülenemedi
              </h2>

              <p className="mt-3 text-sm leading-6 text-red-100/75">
                {errorMessage}
              </p>
            </div>
          ) : null}

          {!loading &&
          !errorMessage &&
          processes.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-white/10 bg-white/[0.025] p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-2xl text-indigo-300">
                +
              </div>

              <h2 className="mt-5 text-xl font-semibold">
                Henüz bir sürecin yok
              </h2>

              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-400">
                İlk sürecini başlattığında gerekli belgeler,
                ilerleme durumu ve hedef tarih burada görünecek.
              </p>

              <Link
                href="/processes/new"
                className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-slate-200"
              >
                İlk süreci başlat
              </Link>
            </div>
          ) : null}

          {!loading &&
          !errorMessage &&
          processes.length > 0 ? (
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {processes.map((process) => {
                const progress = Math.min(
                  100,
                  Math.max(0, Math.round(process.progress)),
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
                          {process.country}
                        </p>

                        <h3 className="mt-3 text-xl font-semibold text-white transition group-hover:text-indigo-200">
                          {process.title}
                        </h3>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(
                          process.status,
                        )}`}
                      >
                        {getStatusLabel(process.status)}
                      </span>
                    </div>

                    {process.description ? (
                      <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-400">
                        {process.description}
                      </p>
                    ) : null}

                    <div className="mt-7">
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="text-slate-400">
                          İlerleme
                        </span>

                        <span className="font-semibold text-white">
                          %{progress}
                        </span>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-indigo-500 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/5 bg-black/10 p-4">
                        <p className="text-xs text-slate-500">
                          Belgeler
                        </p>

                        <p className="mt-2 text-sm font-semibold text-slate-200">
                          {process.completedDocumentCount} /{" "}
                          {process.totalDocumentCount}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/5 bg-black/10 p-4">
                        <p className="text-xs text-slate-500">
                          Hedef tarih
                        </p>

                        <p className="mt-2 text-sm font-semibold text-slate-200">
                          {formatDeadline(process.deadline)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5">
                      <span className="text-sm font-medium text-indigo-300">
                        Süreç detayını aç
                      </span>

                      <span
                        aria-hidden="true"
                        className="text-xl text-indigo-300 transition-transform group-hover:translate-x-1"
                      >
                        →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}