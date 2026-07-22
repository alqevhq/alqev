"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { normalizeSubscriptionPlan } from "@/lib/subscription";

type SubscriptionPlan = "free" | "premium";

const freeFeatures = [
  "1 aktif süreç",
  "Temel belge yönetimi",
  "Ayda 10 OCR analizi",
  "Günde 20 AI Copilot mesajı",
  "Temel AI hazırlık analizi",
];

const premiumFeatures = [
  "Sınırsız aktif süreç",
  "AI Risk Analizi",
  "Kişiselleştirilmiş AI yol haritası",
  "Öncelikli AI önerileri",
  "Sınırsız OCR",
  "Sınırsız AI Copilot",
  "Gelişmiş belge analizi",
  "Erken erişim özellikleri",
];

export default function PricingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] =
    useState<SubscriptionPlan>("free");
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requestSuccess, setRequestSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isMounted) return;

      setUser(currentUser);

      if (!currentUser) {
        setSubscription("free");
        setIsLoading(false);
        return;
      }

      try {
        const userSnapshot = await getDoc(
          doc(db, "users", currentUser.uid),
        );

        if (!isMounted) return;

        const rawPlan = userSnapshot.exists()
          ? userSnapshot.data().subscription
          : "free";

        setSubscription(normalizeSubscriptionPlan(rawPlan));
      } catch (error) {
        console.error("Abonelik bilgisi yüklenemedi:", error);

        if (isMounted) {
          setSubscription("free");
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
  }, []);

  async function handleEarlyAccessRequest(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setRequestError("");

    if (!user) {
      setRequestError(
        "Premium erken erişim talebi için önce hesabına giriş yapmalısın.",
      );
      return;
    }

    try {
      setIsRequesting(true);

      await addDoc(
        collection(
          db,
          "users",
          user.uid,
          "premiumRequests",
        ),
        {
          email: user.email || "",
          status: "waiting",
          requestedPlan: "premium",
          monthlyPrice: 19.9,
          currency: "EUR",
          source: "pricing-page",
          createdAt: serverTimestamp(),
        },
      );

      setRequestSuccess(true);
    } catch (error) {
      console.error("Premium talebi kaydedilemedi:", error);
      setRequestError(
        "Talebin kaydedilemedi. Lütfen tekrar dene.",
      );
    } finally {
      setIsRequesting(false);
    }
  }

  const isPremium = subscription === "premium";

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-12 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute left-1/4 top-[-260px] h-[560px] w-[560px] rounded-full bg-indigo-700/20 blur-[150px]" />
        <div className="absolute bottom-[-280px] right-[-180px] h-[560px] w-[560px] rounded-full bg-cyan-700/10 blur-[160px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <Link
            href={user ? "/dashboard" : "/"}
            className="inline-flex items-center gap-3"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500 text-xl font-bold">
              H
            </span>

            <span>
              <span className="block font-bold">
                ALQEV
              </span>
              <span className="block text-xs text-slate-500">
                Premium
              </span>
            </span>
          </Link>

          <Link
            href={user ? "/dashboard" : "/login"}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-indigo-400/40 hover:bg-white/[0.05]"
          >
            {user ? "Dashboard'a dön" : "Giriş yap"}
          </Link>
        </header>

        <section className="mx-auto mt-16 max-w-3xl text-center">
          <div className="inline-flex rounded-full border border-indigo-400/20 bg-indigo-400/10 px-4 py-2 text-sm font-semibold text-indigo-200">
            ALQEV PREMIUM
          </div>

          <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-6xl">
            Süreçlerini sınır olmadan yönet.
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
            Belgelerini, resmî işlemlerini ve yapay zekâ
            destekli hazırlık planını tek yerde yönet.
            Premium ile tüm limitleri kaldır.
          </p>

          {isLoading ? (
            <p className="mt-5 text-sm text-slate-500">
              Plan bilgisi yükleniyor...
            </p>
          ) : isPremium ? (
            <div className="mx-auto mt-6 max-w-md rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.07] px-5 py-4 text-sm font-semibold text-emerald-200">
              Premium planın aktif.
            </div>
          ) : null}
        </section>

        <section className="mt-14 grid gap-6 lg:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-7 sm:p-9">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Başlangıç
                </p>

                <h2 className="mt-3 text-3xl font-bold">
                  Free
                </h2>
              </div>

              {!isPremium ? (
                <span className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
                  Mevcut plan
                </span>
              ) : null}
            </div>

            <div className="mt-7">
              <span className="text-5xl font-black">0 €</span>
              <span className="ml-2 text-slate-500">
                / ay
              </span>
            </div>

            <p className="mt-5 text-sm leading-6 text-slate-400">
              ALQEV&apos;u denemek ve temel sürecini
              yönetmek için.
            </p>

            <ul className="mt-8 space-y-4">
              {freeFeatures.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-3 text-sm text-slate-300"
                >
                  <span className="mt-0.5 text-emerald-300">
                    ✓
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              href={user ? "/dashboard" : "/signup"}
              className="mt-9 inline-flex w-full items-center justify-center rounded-xl border border-white/10 px-5 py-3.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.05]"
            >
              {user ? "Free planı kullan" : "Ücretsiz başla"}
            </Link>
          </article>

          <article className="relative overflow-hidden rounded-3xl border border-indigo-400/30 bg-gradient-to-br from-indigo-500/[0.18] via-white/[0.045] to-cyan-500/[0.08] p-7 shadow-2xl shadow-indigo-950/30 sm:p-9">
            <div className="absolute right-5 top-5 rounded-full bg-indigo-400 px-3 py-1 text-xs font-bold text-slate-950">
              ÖNERİLEN
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-300">
                Profesyonel
              </p>

              <h2 className="mt-3 text-3xl font-bold">
                Premium
              </h2>
            </div>

            <div className="mt-7">
              <span className="text-5xl font-black">
                19,90 €
              </span>
              <span className="ml-2 text-slate-400">
                / ay
              </span>
            </div>

            <p className="mt-5 text-sm leading-6 text-slate-300">
              Süreçlerini sınırsız yönetmek ve ALQEV AI&apos;ın
              gelişmiş özelliklerini kullanmak için.
            </p>

            <ul className="mt-8 space-y-4">
              {premiumFeatures.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-3 text-sm text-slate-200"
                >
                  <span className="mt-0.5 text-indigo-300">
                    ✓
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {isPremium ? (
              <div className="mt-9 flex w-full items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/[0.08] px-5 py-3.5 text-sm font-semibold text-emerald-200">
                Premium aktif
              </div>
            ) : user ? (
              <button
                type="button"
                onClick={() => {
                  setRequestError("");
                  setRequestSuccess(false);
                  setIsModalOpen(true);
                }}
                className="mt-9 flex w-full items-center justify-center rounded-xl bg-indigo-500 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-400"
              >
                Premium erken erişim talebi
              </button>
            ) : (
              <Link
                href="/signup"
                className="mt-9 flex w-full items-center justify-center rounded-xl bg-indigo-500 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-400"
              >
                Premium için hesap oluştur
              </Link>
            )}

            {!isPremium ? (
              <p className="mt-3 text-center text-xs text-slate-500">
                Güvenli ödeme sistemi açıldığında erken erişim
                kullanıcılarına öncelik verilecek.
              </p>
            ) : null}
          </article>
        </section>

        <section className="mt-12 rounded-3xl border border-white/10 bg-white/[0.03] p-7 text-center sm:p-9">
          <h2 className="text-2xl font-bold">
            ALQEV neden Premium?
          </h2>

          <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-slate-400">
            Premium yalnızca daha yüksek kullanım limiti
            sunmaz. Belgelerini daha ayrıntılı analiz eder,
            eksiklerini önceliklendirir ve süreçlerin için
            kişiselleştirilmiş bir yol haritası oluşturur.
          </p>
        </section>
      </div>

      {isModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Premium erken erişim"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => {
            if (!isRequesting) setIsModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            {requestSuccess ? (
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-2xl text-emerald-300">
                  ✓
                </div>

                <h2 className="mt-5 text-2xl font-bold">
                  Talebin alındı
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Premium ödeme sistemi aktif olduğunda sana
                  öncelikli olarak haber vereceğiz.
                </p>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                >
                  Tamam
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
                  Premium erken erişim
                </p>

                <h2 className="mt-3 text-2xl font-bold">
                  Bekleme listesine katıl
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Ödeme sistemi aktif olduğunda ilk bilgilendirilen
                  kullanıcılardan biri ol. Talep şu hesap adına
                  kaydedilecek:
                </p>

                <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-slate-200">
                  {user?.email || "E-posta bilgisi bulunamadı"}
                </div>

                {requestError ? (
                  <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                    {requestError}
                  </div>
                ) : null}

                <form
                  onSubmit={handleEarlyAccessRequest}
                  className="mt-6 flex flex-col gap-3 sm:flex-row"
                >
                  <button
                    type="button"
                    disabled={isRequesting}
                    onClick={() => setIsModalOpen(false)}
                    className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-white/10 px-5 text-sm font-semibold text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
                  >
                    Vazgeç
                  </button>

                  <button
                    type="submit"
                    disabled={isRequesting}
                    className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-indigo-500 px-5 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isRequesting
                      ? "Kaydediliyor..."
                      : "Erken erişim talebi gönder"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}