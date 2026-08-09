"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../lib/firebase";

function getFirebaseErrorMessage(errorCode?: string) {
  switch (errorCode) {
    case "auth/invalid-email":
      return "Lütfen geçerli bir e-posta adresi gir.";

    case "auth/user-not-found":
      return "Bu e-posta adresiyle kayıtlı bir hesap bulunamadı.";

    case "auth/network-request-failed":
      return "İnternet bağlantısı kurulamadı. Lütfen tekrar dene.";

    case "auth/too-many-requests":
      return "Çok fazla istek gönderildi. Lütfen biraz sonra tekrar dene.";

    default:
      return "Şifre sıfırlama e-postası gönderilemedi. Lütfen tekrar dene.";
  }
}

function getErrorCode(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return undefined;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setErrorMessage("Lütfen e-posta adresini gir.");
      return;
    }

    try {
      setIsSubmitting(true);

      auth.languageCode = "tr";
      await sendPasswordResetEmail(auth, normalizedEmail);

      setSuccessMessage(
        "Şifre sıfırlama bağlantısını e-posta adresine gönderdik. Gelen kutunu ve spam klasörünü kontrol et.",
      );
    } catch (error: unknown) {
      setErrorMessage(getFirebaseErrorMessage(getErrorCode(error)));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-x-hidden bg-[#030309] px-3 py-7 text-white sm:px-6 sm:py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute left-1/2 top-[-260px] h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-violet-700/12 blur-[165px]" />
        <div className="absolute bottom-[-280px] right-[-190px] h-[560px] w-[560px] rounded-full bg-fuchsia-700/[0.08] blur-[175px]" />
        <div className="absolute left-1/2 top-[165px] h-[210px] w-[900px] -translate-x-1/2 rounded-[50%] border-t border-fuchsia-400/25 shadow-[0_-18px_80px_rgba(168,85,247,0.12)]" />
      </div>

      <section className="relative z-10 w-full max-w-md">
        <Link
          href="/login"
          className="mb-6 inline-flex max-w-full items-center gap-2 rounded-xl border border-white/[0.08] bg-[#090911]/80 px-4 py-2.5 text-sm font-semibold text-zinc-300 shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl transition hover:border-violet-400/30 hover:bg-violet-400/[0.06] hover:text-white"
        >
          <span aria-hidden="true">←</span>
          Giriş sayfasına dön
        </Link>

        <div className="min-w-0 rounded-[2rem] border border-violet-300/15 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.13),transparent_42%),linear-gradient(145deg,rgba(17,17,29,0.96),rgba(7,7,14,0.98))] p-5 shadow-[0_28px_90px_rgba(46,16,101,0.18)] backdrop-blur-2xl sm:p-8">
          <div className="mb-8">
            <div className="mb-5 inline-flex items-center rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-xs font-semibold tracking-[0.22em] text-violet-200">
              ALQEV
            </div>

            <h1 className="break-words text-[2rem] font-bold leading-tight tracking-tight text-white sm:text-4xl">
              Şifreni sıfırla
            </h1>

            <p className="mt-3 break-words text-sm leading-6 text-zinc-400">
              Hesabında kullandığın e-posta adresini gir. Sana güvenli bir şifre
              sıfırlama bağlantısı göndereceğiz.
            </p>
          </div>

          <form className="min-w-0 space-y-5" onSubmit={handleSubmit} noValidate>
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-zinc-200"
              >
                E-posta adresi
              </label>

              <input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isSubmitting}
                placeholder="ornek@email.com"
                className="h-12 w-full min-w-0 rounded-xl border border-white/[0.08] bg-[#070810] px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400/50 focus:ring-4 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            {errorMessage ? (
              <div
                role="alert"
                className="rounded-xl border border-red-400/20 bg-red-400/[0.08] px-4 py-3 text-sm leading-5 text-red-200"
              >
                {errorMessage}
              </div>
            ) : null}

            {successMessage ? (
              <div
                role="status"
                className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.08] px-4 py-3 text-sm leading-5 text-emerald-200"
              >
                {successMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex min-h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 px-5 py-3 text-sm font-bold text-white shadow-[0_12px_34px_rgba(139,92,246,0.24)] transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? "Bağlantı gönderiliyor..."
                : "Şifre sıfırlama bağlantısı gönder"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Şifreni hatırladın mı?{" "}
            <Link
              href="/login"
              className="font-medium text-violet-300 transition hover:text-violet-200"
            >
              Giriş yap
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}