"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  onAuthStateChanged,
  type User,
} from "firebase/auth";
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
  getLocalizedCountryLabel,
  getLocalizedProcessTemplates,
  getProcessTemplate,
} from "../../../lib/process-templates";
import {
  getTranslations,
  isRtlLanguage,
  isSupportedLanguage,
  readStoredLanguage,
  type Language,
} from "../../../lib/i18n";

export default function NewProcessPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [language, setLanguage] =
    useState<Language>("tr");
  const [templateKey, setTemplateKey] = useState("");
  const [country, setCountry] = useState("DE");
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");
  const [subscription, setSubscription] =
    useState<SubscriptionPlan>("free");
  const [processCount, setProcessCount] =
    useState(0);

  const copy = getTranslations(language);
  const direction = isRtlLanguage(language)
    ? "rtl"
    : "ltr";

  const localizedTemplates = useMemo(
    () => getLocalizedProcessTemplates(language),
    [language],
  );

  const selectedTemplate = useMemo(
    () => getProcessTemplate(templateKey, language),
    [templateKey, language],
  );

  const planLimits = getPlanLimits(subscription);
  const hasProcessLimit = hasReachedLimit(
    processCount,
    planLimits.maxProcesses,
  );


useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
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
          const [
            profileSnapshot,
            processesSnapshot,
          ] = await Promise.all([
            getDoc(
              doc(db, "users", currentUser.uid),
            ),
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

          const profileData =
            profileSnapshot.exists()
              ? profileSnapshot.data()
              : {};

          const storedLanguage =
            readStoredLanguage("tr");
          const profileLanguage =
            typeof profileData.language === "string" &&
            isSupportedLanguage(profileData.language)
              ? profileData.language
              : null;

          const resolvedLanguage =
            storedLanguage !== "tr"
              ? storedLanguage
              : profileLanguage ?? storedLanguage;

          setLanguage(resolvedLanguage);
          const savedCountry = profileData.country;

          if (
            typeof savedCountry === "string" &&
            savedCountry.trim()
          ) {
            setCountry(savedCountry.trim());
          }

          setSubscription(
            normalizeSubscriptionPlan(
              profileData.subscription,
            ),
          );
          setProcessCount(processesSnapshot.size);
        } catch (error) {
          console.error(
            "Plan ve süreç bilgileri okunamadı:",
            error,
          );
          setErrorMessage(
            copy.newProcess.loadError,
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
  }, [router, copy.newProcess.loadError]);

  function handleTemplateChange(value: string) {
    setTemplateKey(value);
    setErrorMessage("");

    const template = getProcessTemplate(
      value,
      language,
    );

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
      setErrorMessage(copy.newProcess.noSession);
      return;
    }

    if (hasProcessLimit) {
      setErrorMessage(
        copy.newProcess.freeLimitError,
      );
      return;
    }

    if (!selectedTemplate) {
      setErrorMessage(
        copy.newProcess.selectProcess,
      );
      return;
    }

    if (!country.trim()) {
      setErrorMessage(
        copy.newProcess.selectCountry,
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const [
        latestProfileSnapshot,
        latestProcessesSnapshot,
      ] = await Promise.all([
        getDoc(doc(db, "users", user.uid)),
        getDocs(
          collection(
            db,
            "users",
            user.uid,
            "processes",
          ),
        ),
      ]);

      const latestPlan =
        normalizeSubscriptionPlan(
          latestProfileSnapshot.exists()
            ? latestProfileSnapshot.data()
                .subscription
            : "free",
        );
      const latestLimits =
        getPlanLimits(latestPlan);

      if (
        hasReachedLimit(
          latestProcessesSnapshot.size,
          latestLimits.maxProcesses,
        )
      ) {
        setSubscription(latestPlan);
        setProcessCount(
          latestProcessesSnapshot.size,
        );
        setErrorMessage(
          copy.newProcess.freeLimitError,
        );
        setIsSubmitting(false);
        return;
      }

      const requiredDocuments =
        selectedTemplate.documents.map(
          (item) => ({
            key: item.key,
            title: item.title,
            description: item.description,
            required: item.required,
            status: "missing",
            fileName: "",
            fileUrl: "",
            uploadedAt: null,
          }),
        );

      const processReference = await addDoc(
        collection(
          db,
          "users",
          user.uid,
          "processes",
        ),
        {
          templateKey: selectedTemplate.key,
          language,
          title: selectedTemplate.title,
          description:
            selectedTemplate.description,
          category: selectedTemplate.category,
          country: country.trim(),
          status: "active",
          progress: 0,
          deadline: deadline || null,
          notes: notes.trim(),
          requiredDocuments,
          completedDocumentCount: 0,
          totalDocumentCount:
            requiredDocuments.length,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
      );

      router.replace(
        `/processes?created=${processReference.id}`,
      );
      router.refresh();
    } catch (error) {
      console.error(
        "Süreç oluşturulamadı:",
        error,
      );
      setErrorMessage(
        copy.newProcess.createError,
      );
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main
        dir={direction}
        className="flex min-h-[100dvh] items-center justify-center bg-[#030309] px-4 text-white"
      >
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-violet-400 shadow-[0_0_30px_rgba(139,92,246,0.18)]" />

          <p className="mt-4 text-sm text-zinc-400">
            {copy.newProcess.loading}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      dir={direction}
      className="relative min-h-[100dvh] overflow-x-hidden bg-[#030309] px-3 py-6 text-white sm:px-6 sm:py-10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute left-1/2 top-[-280px] h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-violet-700/12 blur-[165px]" />
        <div className="absolute right-[-240px] top-[30%] h-[560px] w-[560px] rounded-full bg-fuchsia-700/[0.08] blur-[175px]" />
        <div className="absolute bottom-[-320px] left-[-220px] h-[620px] w-[620px] rounded-full bg-violet-800/[0.08] blur-[180px]" />
        <div className="absolute left-1/2 top-[160px] h-[220px] w-[1050px] -translate-x-1/2 rounded-[50%] border-t border-fuchsia-400/25 shadow-[0_-18px_80px_rgba(168,85,247,0.12)]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <Link
          href="/processes"
          className="inline-flex max-w-full items-center gap-2 rounded-xl border border-white/[0.08] bg-[#090911]/80 px-4 py-2.5 text-sm font-semibold text-zinc-300 shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl transition hover:border-violet-400/30 hover:bg-violet-400/[0.06] hover:text-white"
        >
          <span aria-hidden="true">
            {direction === "rtl" ? "→" : "←"}
          </span>
          {copy.newProcess.backToProcesses}
        </Link>

        <section className="mt-8 min-w-0 overflow-hidden rounded-[2rem] border border-violet-300/15 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.14),transparent_42%),linear-gradient(145deg,rgba(17,17,29,0.96),rgba(7,7,14,0.98))] p-5 shadow-[0_28px_90px_rgba(46,16,101,0.18)] backdrop-blur-2xl sm:p-8 lg:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-violet-300">
            PROCESS ENGINE v1
          </p>

          <h1 className="mt-4 break-words text-[2rem] font-bold leading-tight tracking-tight sm:text-5xl">
            {copy.newProcess.title}
          </h1>

          <p className="mt-4 max-w-3xl break-words leading-7 text-zinc-400">
            {copy.newProcess.description}
          </p>

          {hasProcessLimit ? (
            <div className="mt-10 rounded-3xl border border-amber-400/20 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.10),transparent_50%),rgba(20,15,8,0.72)] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)] sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-300">
                {copy.newProcess.freeLimit}
              </p>

              <h2 className="mt-3 text-2xl font-bold text-white">
                {copy.newProcess.limitReached}
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-amber-100/75">
                {copy.newProcess.limitDescription}
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/pricing"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-amber-300 px-6 text-sm font-bold text-slate-950 transition hover:bg-amber-200"
                >
                  {copy.newProcess.upgrade}
                </Link>

                <Link
                  href="/processes"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02] px-6 py-3 text-sm font-semibold text-zinc-200 transition hover:border-violet-400/25 hover:bg-violet-400/[0.05]"
                >
                  {copy.newProcess.returnToCurrent}
                </Link>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="mt-10 min-w-0 space-y-8"
              noValidate
            >
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-300">
                  {copy.newProcess.processType}
                </p>

                <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {localizedTemplates.map(
                    (template) => {
                      const isSelected =
                        templateKey === template.key;

                      return (
                        <button
                          key={template.key}
                          type="button"
                          onClick={() =>
                            handleTemplateChange(
                              template.key,
                            )
                          }
                          disabled={isSubmitting}
                          className={
                            isSelected
                              ? "min-w-0 rounded-2xl border border-violet-400/50 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.16),transparent_55%),rgba(16,13,28,0.90)] p-5 text-left ring-4 ring-violet-500/10 shadow-[0_14px_38px_rgba(91,33,182,0.12)]"
                              : "min-w-0 rounded-2xl border border-white/[0.08] bg-[linear-gradient(145deg,rgba(16,16,26,0.90),rgba(8,8,14,0.94))] p-5 text-left transition hover:border-violet-400/30 hover:bg-violet-400/[0.04]"
                          }
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="break-words font-semibold text-white">
                                {template.title}
                              </p>

                              <p className="mt-2 break-words text-sm leading-6 text-zinc-400">
                                {
                                  template.description
                                }
                              </p>
                            </div>

                            <span
                              className={
                                isSelected
                                  ? "text-violet-300"
                                  : "text-zinc-600"
                              }
                            >
                              {isSelected
                                ? "✓"
                                : "+"}
                            </span>
                          </div>
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              <div className="grid min-w-0 gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="country"
                    className="mb-2 block text-sm font-medium text-zinc-200"
                  >
                    {copy.common.country}
                  </label>

                  <select
                    id="country"
                    value={country}
                    onChange={(event) =>
                      setCountry(
                        event.target.value,
                      )
                    }
                    disabled={isSubmitting}
                    className="h-12 w-full min-w-0 rounded-xl border border-white/[0.08] bg-[#070810] px-4 text-sm text-white outline-none transition focus:border-violet-400/50 focus:ring-4 focus:ring-violet-500/10"
                  >
                    {[
                      "DE",
                      "TR",
                      "AT",
                      "CH",
                      "NL",
                      "BE",
                      "FR",
                      "GB",
                      "OTHER",
                    ].map((countryCode) => (
                      <option
                        key={countryCode}
                        value={countryCode}
                      >
                        {getLocalizedCountryLabel(
                          countryCode,
                          language,
                        )}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="deadline"
                    className="mb-2 block text-sm font-medium text-zinc-200"
                  >
                    {copy.newProcess.deadline}{" "}
                    <span className="text-zinc-500">
                      (
                      {copy.newProcess.optional}
                      )
                    </span>
                  </label>

                  <input
                    id="deadline"
                    type="date"
                    value={deadline}
                    onChange={(event) =>
                      setDeadline(
                        event.target.value,
                      )
                    }
                    disabled={isSubmitting}
                    className="h-12 w-full min-w-0 rounded-xl border border-white/[0.08] bg-[#070810] px-4 text-sm text-white outline-none transition focus:border-violet-400/50 focus:ring-4 focus:ring-violet-500/10"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="notes"
                  className="mb-2 block text-sm font-medium text-zinc-200"
                >
                  {copy.newProcess.notes}{" "}
                  <span className="text-zinc-500">
                    (
                    {copy.newProcess.optional})
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
                  placeholder={
                    copy.newProcess
                      .notesPlaceholder
                  }
                  className="w-full min-w-0 rounded-xl border border-white/[0.08] bg-[#070810] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400/50 focus:ring-4 focus:ring-violet-500/10"
                />
              </div>

              {selectedTemplate ? (
                <div className="rounded-2xl border border-violet-400/20 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.12),transparent_55%),rgba(11,10,19,0.82)] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.18)]">
                  <p className="font-semibold text-violet-200">
                    {
                      copy.newProcess
                        .generatedDocuments
                    }
                  </p>

                  <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2">
                    {selectedTemplate.documents.map(
                      (item) => (
                        <div
                          key={item.key}
                          className="min-w-0 rounded-xl border border-white/[0.07] bg-black/10 p-4"
                        >
                          <p className="break-words text-sm font-semibold text-zinc-200">
                            {item.title}
                          </p>

                          <p className="mt-1 text-xs leading-5 text-zinc-500">
                            {item.required
                              ? copy.newProcess
                                  .requiredDocument
                              : copy.newProcess
                                  .conditionalDocument}
                          </p>
                        </div>
                      ),
                    )}
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

              <div className="flex flex-col gap-3 border-t border-white/[0.08] pt-8 sm:flex-row sm:justify-end">
                <Link
                  href="/processes"
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02] px-6 py-3 text-sm font-semibold text-zinc-200 transition hover:border-violet-400/25 hover:bg-violet-400/[0.05] sm:w-auto"
                >
                  {copy.common.cancel}
                </Link>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 px-7 py-3 text-sm font-semibold text-white shadow-[0_12px_34px_rgba(139,92,246,0.24)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {isSubmitting
                    ? copy.newProcess.creating
                    : copy.newProcess.start}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}