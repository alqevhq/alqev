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
  useState<Language>(() =>
    readStoredLanguage("tr"),
  );
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
        className="flex min-h-screen items-center justify-center bg-slate-950 text-white"
      >
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-400" />

          <p className="mt-4 text-sm text-slate-400">
            {copy.newProcess.loading}
          </p>
        </div>
      </main>
    );
  }

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

      <div className="relative z-10 mx-auto max-w-5xl">
        <Link
          href="/processes"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <span aria-hidden="true">
            {direction === "rtl" ? "→" : "←"}
          </span>
          {copy.newProcess.backToProcesses}
        </Link>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl backdrop-blur-xl sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">
            PROCESS ENGINE v1
          </p>

          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
            {copy.newProcess.title}
          </h1>

          <p className="mt-4 max-w-3xl leading-7 text-slate-400">
            {copy.newProcess.description}
          </p>

          {hasProcessLimit ? (
            <div className="mt-10 rounded-3xl border border-amber-400/25 bg-amber-400/[0.08] p-6 sm:p-8">
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
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-white/10 px-6 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
                >
                  {copy.newProcess.returnToCurrent}
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
                  {copy.newProcess.processType}
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                                {
                                  template.description
                                }
                              </p>
                            </div>

                            <span
                              className={
                                isSelected
                                  ? "text-indigo-300"
                                  : "text-slate-600"
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

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="country"
                    className="mb-2 block text-sm font-medium text-slate-200"
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
                    className="h-12 w-full rounded-xl border border-white/10 bg-slate-900 px-4 text-sm text-white outline-none focus:border-indigo-400/60 focus:ring-4 focus:ring-indigo-500/10"
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
                    className="mb-2 block text-sm font-medium text-slate-200"
                  >
                    {copy.newProcess.deadline}{" "}
                    <span className="text-slate-500">
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
                    className="h-12 w-full rounded-xl border border-white/10 bg-slate-900 px-4 text-sm text-white outline-none focus:border-indigo-400/60 focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="notes"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  {copy.newProcess.notes}{" "}
                  <span className="text-slate-500">
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
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-400/60 focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>

              {selectedTemplate ? (
                <div className="rounded-2xl border border-indigo-400/20 bg-indigo-500/[0.07] p-5">
                  <p className="font-semibold text-indigo-200">
                    {
                      copy.newProcess
                        .generatedDocuments
                    }
                  </p>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {selectedTemplate.documents.map(
                      (item) => (
                        <div
                          key={item.key}
                          className="rounded-xl border border-white/10 bg-black/10 p-4"
                        >
                          <p className="text-sm font-semibold text-slate-200">
                            {item.title}
                          </p>

                          <p className="mt-1 text-xs leading-5 text-slate-500">
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

              <div className="flex flex-col gap-3 border-t border-white/10 pt-8 sm:flex-row sm:justify-end">
                <Link
                  href="/processes"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-700 px-6 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
                >
                  {copy.common.cancel}
                </Link>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-indigo-500 px-7 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
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