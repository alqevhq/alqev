"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";

type LanguageOption = {
  value: string;
  label: string;
};

type CountryOption = {
  value: string;
  label: string;
};

const languageOptions: LanguageOption[] = [
  { value: "tr", label: "Türkçe" },
  { value: "de", label: "Deutsch" },
  { value: "en", label: "English" },
  { value: "ar", label: "العربية" },
  { value: "fa", label: "فارسی" },
];

const countryOptions: CountryOption[] = [
  { value: "DE", label: "Almanya" },
  { value: "TR", label: "Türkiye" },
  { value: "AT", label: "Avusturya" },
  { value: "CH", label: "İsviçre" },
  { value: "NL", label: "Hollanda" },
  { value: "BE", label: "Belçika" },
  { value: "FR", label: "Fransa" },
  { value: "GB", label: "Birleşik Krallık" },
  { value: "OTHER", label: "Diğer" },
];

const needOptions = [
  {
    value: "residence",
    title: "Oturum ve göçmenlik",
    description: "Oturum izni, uzatma, vize ve vatandaşlık süreçleri.",
  },
  {
    value: "documents",
    title: "Belgeler",
    description: "Resmî belgeleri toplama, düzenleme ve takip etme.",
  },
  {
    value: "appointments",
    title: "Termin ve son tarihler",
    description: "Randevular, teslim tarihleri ve hatırlatmalar.",
  },
  {
    value: "employment",
    title: "İş ve çalışma",
    description: "İş başvuruları, çalışma izni ve çalışan süreçleri.",
  },
  {
    value: "education",
    title: "Eğitim",
    description: "Okul, üniversite, denklik ve eğitim başvuruları.",
  },
  {
    value: "family",
    title: "Aile işlemleri",
    description: "Aile birleşimi, çocuk ve yakınlarla ilgili süreçler.",
  },
];

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
}

export default function OnboardingPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);

  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("tr");
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
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
        const userDocumentReference = doc(db, "users", currentUser.uid);
        const userDocumentSnapshot = await getDoc(userDocumentReference);

        if (!isMounted) {
          return;
        }

        if (userDocumentSnapshot.exists()) {
          const data = userDocumentSnapshot.data();

          setFullName(
            typeof data.fullName === "string" && data.fullName.trim()
              ? data.fullName.trim()
              : currentUser.displayName?.trim() ||
                  currentUser.email?.split("@")[0] ||
                  "",
          );

          setCountry(
            typeof data.country === "string" ? data.country.trim() : "",
          );

          setLanguage(
            typeof data.language === "string" && data.language.trim()
              ? data.language.trim()
              : "tr",
          );

          setSelectedNeeds(normalizeStringArray(data.needs));
        } else {
          setFullName(
            currentUser.displayName?.trim() ||
              currentUser.email?.split("@")[0] ||
              "",
          );
        }
      } catch (error) {
        console.error("Onboarding bilgileri yüklenemedi:", error);

        if (isMounted) {
          setFullName(
            currentUser.displayName?.trim() ||
              currentUser.email?.split("@")[0] ||
              "",
          );

          setErrorMessage(
            "Mevcut profil bilgileri yüklenemedi. Formu yine de doldurabilirsin.",
          );
        }
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

  function toggleNeed(needValue: string) {
    setSelectedNeeds((currentNeeds) => {
      if (currentNeeds.includes(needValue)) {
        return currentNeeds.filter((item) => item !== needValue);
      }

      return [...currentNeeds, needValue];
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!user) {
      setErrorMessage("Oturum bilgisi bulunamadı. Lütfen tekrar giriş yap.");
      return;
    }

    const normalizedFullName = fullName.trim();

    if (normalizedFullName.length < 2) {
      setErrorMessage("Lütfen adını ve soyadını gir.");
      return;
    }

    if (!country) {
      setErrorMessage("Lütfen yaşadığın ülkeyi seç.");
      return;
    }

    if (!language) {
      setErrorMessage("Lütfen tercih ettiğin dili seç.");
      return;
    }

    if (selectedNeeds.length === 0) {
      setErrorMessage("Lütfen en az bir ihtiyaç alanı seç.");
      return;
    }

    try {
      setIsSubmitting(true);

      const userDocumentReference = doc(db, "users", user.uid);

      await setDoc(
        userDocumentReference,
        {
          fullName: normalizedFullName,
          email: user.email || "",
          country,
          language,
          needs: selectedNeeds,
          onboardingCompleted: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      setSuccessMessage("Profilin başarıyla tamamlandı.");

      window.setTimeout(() => {
        router.replace("/dashboard");
        router.refresh();
      }, 800);
    } catch (error) {
      console.error("Onboarding kaydedilemedi:", error);

      setErrorMessage(
        "Profil bilgileri kaydedilemedi. Lütfen tekrar dene.",
      );

      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-400" />

          <p className="mt-4 text-sm text-slate-400">
            Profil bilgilerin hazırlanıyor...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-10 text-white sm:px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute left-1/4 top-[-260px] h-[560px] w-[560px] rounded-full bg-indigo-700/20 blur-[150px]" />
        <div className="absolute bottom-[-280px] right-[-180px] h-[600px] w-[600px] rounded-full bg-blue-700/10 blur-[170px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <span aria-hidden="true">←</span>
          Dashboard’a dön
        </Link>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-indigo-950/20 backdrop-blur-xl sm:p-10">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">
              ALQEV kurulumu
            </p>

            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
              Profilini tamamla
            </h1>

            <p className="mt-4 text-base leading-7 text-slate-400">
              Bu bilgiler sana uygun süreçleri, belgeleri ve hatırlatmaları
              gösterebilmemiz için kullanılacak.
            </p>
          </div>

          <form className="mt-10 space-y-10" onSubmit={handleSubmit} noValidate>
            <section>
              <div>
                <p className="text-sm font-semibold text-indigo-300">Adım 1</p>
                <h2 className="mt-2 text-xl font-bold">Temel bilgiler</h2>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="fullName"
                    className="mb-2 block text-sm font-medium text-slate-200"
                  >
                    Ad ve soyad
                  </label>

                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    disabled={isSubmitting}
                    placeholder="Adın ve soyadın"
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-400/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-slate-200"
                  >
                    E-posta adresi
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="h-12 w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/[0.025] px-4 text-sm text-slate-500 outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="country"
                    className="mb-2 block text-sm font-medium text-slate-200"
                  >
                    Yaşadığın ülke
                  </label>

                  <select
                    id="country"
                    name="country"
                    value={country}
                    onChange={(event) => setCountry(event.target.value)}
                    disabled={isSubmitting}
                    className="h-12 w-full rounded-xl border border-white/10 bg-slate-900 px-4 text-sm text-white outline-none transition focus:border-indigo-400/60 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">Ülke seç</option>

                    {countryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="language"
                    className="mb-2 block text-sm font-medium text-slate-200"
                  >
                    Tercih ettiğin dil
                  </label>

                  <select
                    id="language"
                    name="language"
                    value={language}
                    onChange={(event) => setLanguage(event.target.value)}
                    disabled={isSubmitting}
                    className="h-12 w-full rounded-xl border border-white/10 bg-slate-900 px-4 text-sm text-white outline-none transition focus:border-indigo-400/60 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {languageOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section>
              <div>
                <p className="text-sm font-semibold text-indigo-300">Adım 2</p>

                <h2 className="mt-2 text-xl font-bold">
                  Hangi alanlarda yardıma ihtiyacın var?
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Birden fazla alan seçebilirsin.
                </p>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {needOptions.map((option) => {
                  const isSelected = selectedNeeds.includes(option.value);

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleNeed(option.value)}
                      disabled={isSubmitting}
                      aria-pressed={isSelected}
                      className={
                        isSelected
                          ? "rounded-2xl border border-indigo-400/60 bg-indigo-500/15 p-5 text-left ring-4 ring-indigo-500/10 transition disabled:cursor-not-allowed disabled:opacity-60"
                          : "rounded-2xl border border-white/10 bg-white/[0.025] p-5 text-left transition hover:border-indigo-400/30 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-60"
                      }
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-white">
                            {option.title}
                          </p>

                          <p className="mt-2 text-sm leading-6 text-slate-400">
                            {option.description}
                          </p>
                        </div>

                        <span
                          className={
                            isSelected
                              ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-400 text-sm font-bold text-slate-950"
                              : "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-600 text-sm text-slate-500"
                          }
                        >
                          {isSelected ? "✓" : "+"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {errorMessage ? (
              <div
                role="alert"
                className="rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm leading-6 text-red-200"
              >
                {errorMessage}
              </div>
            ) : null}

            {successMessage ? (
              <div
                role="status"
                className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-4 text-sm leading-6 text-emerald-200"
              >
                {successMessage}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-white/10 pt-8 sm:flex-row sm:justify-end">
              <Link
                href="/dashboard"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-700 px-6 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                Daha sonra
              </Link>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-indigo-500 px-7 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Profil kaydediliyor..."
                  : "Profili tamamla"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}