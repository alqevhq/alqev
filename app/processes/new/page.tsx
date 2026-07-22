"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../../../lib/firebase";
import {
  getPlanLimits,
  hasReachedLimit,
  normalizeSubscriptionPlan,
  type SubscriptionPlan,
} from "../../../lib/subscription";
import {
  countryOptions,
  getProcessTemplate,
  processTemplates,
} from "../../../lib/process-templates";

export default function NewProcessPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [templateKey, setTemplateKey] = useState("");
  const [country, setCountry] = useState("DE");
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [subscription, setSubscription] =
    useState<SubscriptionPlan>("free");
  const [processCount, setProcessCount] = useState(0);

  const selectedTemplate = useMemo(
    () => getProcessTemplate(templateKey),
    [templateKey],
  );

  const planLimits = getPlanLimits(subscription);
  const hasProcessLimit = hasReachedLimit(
    processCount,
    planLimits.maxProcesses,
  );

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
        }

        router.replace("/login");
        return;
      }

      if (!isMounted) return;

      setUser(currentUser);

      try {
        const [profileSnapshot, processesSnapshot] = await Promise.all([
          getDoc(doc(db, "users", currentUser.uid)),
          getDocs(
            collection(
              db,
              "users",
              currentUser.uid,
              "processes",
            ),
          ),
        ]);

        if (!isMounted) return;

        const profileData = profileSnapshot.exists()
          ? profileSnapshot.data()
          : {};

        const savedCountry = profileData.country;

        if (
          typeof savedCountry === "string" &&
          savedCountry.trim()
        ) {
          setCountry(savedCountry.trim());
        }

        setSubscription(
          normalizeSubscriptionPlan(profileData.subscription),
        );
        setProcessCount(processesSnapshot.size);
      } catch (error) {
        console.error("Plan ve süreç bilgileri okunamadı:", error);
        setErrorMessage(
          "Plan ve süreç bilgileri yüklenemedi. Lütfen sayfayı yenileyip tekrar dene.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [router]);

  function handleTemplateChange(value: string) {
    setTemplateKey(value);
    setErrorMessage("");

    const template = getProcessTemplate(value);

    if (template && !country) {
      setCountry(template.defaultCountry);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setErrorMessage("");

    if (!user) {
      setErrorMessage(
        "Oturum bulunamadı. Lütfen tekrar giriş yap.",
      );
      return;
    }

    if (hasProcessLimit) {
      setErrorMessage(
        "Free planında en fazla 1 süreç oluşturabilirsin. Yeni bir süreç başlatmak için Premium plana geçmelisin.",
      );
      return;
    }

    if (!selectedTemplate) {
      setErrorMessage("Lütfen bir süreç türü seç.");
      return;
    }

    if (!country.trim()) {
      setErrorMessage(
        "Lütfen sürecin yürütüleceği ülkeyi seç.",
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const [latestProfileSnapshot, latestProcessesSnapshot] =
        await Promise.all([
          getDoc(doc(db, "users", user.uid)),
          getDocs(
            collection(db, "users", user.uid, "processes"),
          ),
        ]);

      const latestPlan = normalizeSubscriptionPlan(
        latestProfileSnapshot.exists()
          ? latestProfileSnapshot.data().subscription
          : "free",
      );
      const latestLimits = getPlanLimits(latestPlan);

      if (
        hasReachedLimit(
          latestProcessesSnapshot.size,
          latestLimits.maxProcesses,
        )
      ) {
        setSubscription(latestPlan);
        setProcessCount(latestProcessesSnapshot.size);
        setErrorMessage(
          "Free planında en fazla 1 süreç oluşturabilirsin. Yeni bir süreç başlatmak için Premium plana geçmelisin.",
        );
        setIsSubmitting(false);
        return;
      }

      const requiredDocuments =
        selectedTemplate.documents.map((item) => ({
          key: item.key,
          title: item.title,
          description: item.description,
          required: item.required,
          status: "missing",
          fileName: "",
          fileUrl: "",
          uploadedAt: null,
        }));

      const processReference = await addDoc(
        collection(db, "users", user.uid, "processes"),
        {
          templateKey: selectedTemplate.key,
          title: selectedTemplate.title,
          description: selectedTemplate.description,
          category: selectedTemplate.category,
          country: country.trim(),
          status: "active",
          progress: 0,
          deadline: deadline || null,
          notes: notes.trim(),
          requiredDocuments,
          completedDocumentCount: 0,
          totalDocumentCount: requiredDocuments.length,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
      );

      router.replace(
        `/processes?created=${processReference.id}`,
      );
      router.refresh();
    } catch (error) {
      console.error("Süreç oluşturulamadı:", error);
      setErrorMessage(
        "Süreç oluşturulamadı. Lütfen tekrar dene.",
      );
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-400" />

          <p className="mt-4 text-sm text-slate-400">
            Süreç seçenekleri hazırlanıyor...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-10 text-white sm:px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute left-1/4 top-[-260px] h-[560px] w-[560px] rounded-full bg-indigo-700/20 blur-[150px]" />

        <div className="absolute bottom-[-280px] right-[-180px] h-[600px] w-[600px] rounded-full bg-blue-700/10 blur-[170px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl">
        <Link
          href="/processes"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <span aria-hidden="true">←</span>
          Süreçlere dön
        </Link>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl backdrop-blur-xl sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">
            PROCESS ENGINE v1
          </p>

          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
            Yeni süreç başlat
          </h1>

          <p className="mt-4 max-w-3xl leading-7 text-slate-400">
            Süreç türünü seç. ALQEV gerekli belge
            listesini otomatik oluştursun ve ilerlemeyi
            takip etsin.
          </p>

          {hasProcessLimit ? (
            <div className="mt-10 rounded-3xl border border-amber-400/25 bg-amber-400/[0.08] p-6 sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-300">
                FREE PLAN LİMİTİ
              </p>

              <h2 className="mt-3 text-2xl font-bold text-white">
                Mevcut süreç limitine ulaştın
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-amber-100/75">
                Free planında en fazla 1 süreç oluşturabilirsin.
                Yeni bir süreç başlatmak ve tüm süreçlerini aynı
                anda yönetmek için Premium plana geç.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/pricing"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-amber-300 px-6 text-sm font-bold text-slate-950 transition hover:bg-amber-200"
                >
                  Premium&apos;a yükselt
                </Link>

                <Link
                  href="/processes"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-white/10 px-6 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
                >
                  Mevcut sürece dön
                </Link>
              </div>
            </div>
          ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-10 space-y-8"
            noValidate
          >
            <div>
              <p className="text-sm font-semibold text-indigo-300">
                1. Süreç türü
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {processTemplates.map((template) => {
                  const isSelected =
                    templateKey === template.key;

                  return (
                    <button
                      key={template.key}
                      type="button"
                      onClick={() =>
                        handleTemplateChange(template.key)
                      }
                      disabled={isSubmitting}
                      className={
                        isSelected
                          ? "rounded-2xl border border-indigo-400/60 bg-indigo-500/15 p-5 text-left ring-4 ring-indigo-500/10"
                          : "rounded-2xl border border-white/10 bg-white/[0.025] p-5 text-left transition hover:border-indigo-400/30 hover:bg-white/[0.05]"
                      }
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-white">
                            {template.title}
                          </p>

                          <p className="mt-2 text-sm leading-6 text-slate-400">
                            {template.description}
                          </p>
                        </div>

                        <span
                          className={
                            isSelected
                              ? "text-indigo-300"
                              : "text-slate-600"
                          }
                        >
                          {isSelected ? "✓" : "+"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="country"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Ülke
                </label>

                <select
                  id="country"
                  value={country}
                  onChange={(event) =>
                    setCountry(event.target.value)
                  }
                  disabled={isSubmitting}
                  className="h-12 w-full rounded-xl border border-white/10 bg-slate-900 px-4 text-sm text-white outline-none focus:border-indigo-400/60 focus:ring-4 focus:ring-indigo-500/10"
                >
                  {countryOptions.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="deadline"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Hedef tarih{" "}
                  <span className="text-slate-500">
                    (isteğe bağlı)
                  </span>
                </label>

                <input
                  id="deadline"
                  type="date"
                  value={deadline}
                  onChange={(event) =>
                    setDeadline(event.target.value)
                  }
                  disabled={isSubmitting}
                  className="h-12 w-full rounded-xl border border-white/10 bg-slate-900 px-4 text-sm text-white outline-none focus:border-indigo-400/60 focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="notes"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Notlar{" "}
                <span className="text-slate-500">
                  (isteğe bağlı)
                </span>
              </label>

              <textarea
                id="notes"
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
                disabled={isSubmitting}
                rows={4}
                maxLength={1000}
                placeholder="Bu süreçle ilgili önemli bilgileri ekle..."
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-400/60 focus:ring-4 focus:ring-indigo-500/10"
              />
            </div>

            {selectedTemplate ? (
              <div className="rounded-2xl border border-indigo-400/20 bg-indigo-500/[0.07] p-5">
                <p className="font-semibold text-indigo-200">
                  Otomatik oluşturulacak belge listesi
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {selectedTemplate.documents.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-xl border border-white/10 bg-black/10 p-4"
                    >
                      <p className="text-sm font-semibold text-slate-200">
                        {item.title}
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {item.required
                          ? "Zorunlu belge"
                          : "Duruma göre gerekli"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {errorMessage ? (
              <div
                role="alert"
                className="rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm text-red-200"
              >
                {errorMessage}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-white/10 pt-8 sm:flex-row sm:justify-end">
              <Link
                href="/processes"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-700 px-6 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                İptal
              </Link>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-indigo-500 px-7 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Süreç oluşturuluyor..."
                  : "Süreci başlat"}
              </button>
            </div>
          </form>
          )}
        </section>
      </div>
    </main>
  );
}