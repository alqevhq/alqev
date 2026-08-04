"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "../../lib/firebase";

function getFirebaseErrorMessage(errorCode?: string) {
  switch (errorCode) {
    case "auth/invalid-email":
      return "Lütfen geçerli bir e-posta adresi gir.";

    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "E-posta adresi veya şifre hatalı.";

    case "auth/user-disabled":
      return "Bu kullanıcı hesabı devre dışı bırakılmış.";

    case "auth/network-request-failed":
      return "İnternet bağlantısı kurulamadı. Lütfen tekrar dene.";

    case "auth/too-many-requests":
      return "Çok fazla giriş denemesi yapıldı. Lütfen biraz sonra tekrar dene.";

    default:
      return "Giriş yapılamadı. Lütfen bilgilerini kontrol edip tekrar dene.";
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

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResendingVerification, setIsResendingVerification] =
    useState(false);
  const [showResendVerification, setShowResendVerification] =
    useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");
    setShowResendVerification(false);

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setErrorMessage("Lütfen e-posta adresini gir.");
      return;
    }

    if (!password) {
      setErrorMessage("Lütfen şifreni gir.");
      return;
    }

    try {
      setIsSubmitting(true);

      const userCredential = await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        password,
      );

      await userCredential.user.reload();

      if (!userCredential.user.emailVerified) {
        setShowResendVerification(true);
        setErrorMessage(
          "E-posta adresin henüz doğrulanmamış. Gelen kutundaki ALQEV doğrulama bağlantısına tıkla.",
        );

        await signOut(auth);
        setIsSubmitting(false);
        return;
      }

      // Firestore güvenlik kurallarının güncel e-posta doğrulama
      // bilgisini görmesi için Firebase ID tokenını zorla yenile.
      await userCredential.user.getIdToken(true);

      setSuccessMessage("Giriş başarılı. Yönlendiriliyorsun...");

      window.setTimeout(() => {
        router.replace("/dashboard");
        router.refresh();
      }, 1000);
    } catch (error: unknown) {
      setErrorMessage(getFirebaseErrorMessage(getErrorCode(error)));
      setIsSubmitting(false);
    }
  }

  async function handleResendVerification() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setErrorMessage(
        "Doğrulama e-postasını tekrar göndermek için e-posta adresini ve şifreni gir.",
      );
      return;
    }

    try {
      setIsResendingVerification(true);
      setErrorMessage("");
      setSuccessMessage("");

      const userCredential = await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        password,
      );

      await userCredential.user.reload();

      if (userCredential.user.emailVerified) {
        await signOut(auth);
        setShowResendVerification(false);
        setSuccessMessage(
          "E-posta adresin zaten doğrulanmış. Şimdi giriş yapabilirsin.",
        );
        return;
      }

      await sendEmailVerification(userCredential.user);
      await signOut(auth);

      setSuccessMessage(
        "Yeni doğrulama bağlantısı e-posta adresine gönderildi. Spam klasörünü de kontrol et.",
      );
      setShowResendVerification(false);
    } catch (error: unknown) {
      setErrorMessage(getFirebaseErrorMessage(getErrorCode(error)));
    } finally {
      setIsResendingVerification(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-12 text-white sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-220px] h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-violet-700/20 blur-[140px]" />

        <div className="absolute bottom-[-250px] left-[-150px] h-[500px] w-[500px] rounded-full bg-blue-700/15 blur-[150px]" />

        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:42px_42px]" />
      </div>

      <section className="relative z-10 w-full max-w-md">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
        >
          <span aria-hidden="true">←</span>
          Ana sayfaya dön
        </Link>

        <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 shadow-2xl shadow-violet-950/20 backdrop-blur-xl sm:p-8">
          <div className="mb-8">
            <div className="mb-5 inline-flex items-center rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-xs font-medium tracking-[0.18em] text-violet-200">
              ALQEV
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Tekrar hoş geldin
            </h1>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Hesabına erişmek için e-posta adresini ve şifreni gir.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
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
                disabled={isSubmitting || isResendingVerification}
                placeholder="ornek@email.com"
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-zinc-200"
              >
                Şifre
              </label>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting || isResendingVerification}
                placeholder="Şifreni gir"
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-violet-300 transition hover:text-violet-200"
              >
                Şifremi unuttum
              </Link>
            </div>

            {errorMessage ? (
              <div
                role="alert"
                className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm leading-5 text-red-200"
              >
                {errorMessage}
              </div>
            ) : null}

            {successMessage ? (
              <div
                role="status"
                className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm leading-5 text-emerald-200"
              >
                {successMessage}
              </div>
            ) : null}

            {showResendVerification ? (
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isResendingVerification}
                className="flex h-12 w-full items-center justify-center rounded-xl border border-violet-400/30 bg-violet-400/10 px-5 text-sm font-semibold text-violet-100 transition hover:bg-violet-400/15 focus:outline-none focus:ring-4 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isResendingVerification
                  ? "Doğrulama e-postası gönderiliyor..."
                  : "Doğrulama e-postasını tekrar gönder"}
              </button>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || isResendingVerification}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-zinc-200 focus:outline-none focus:ring-4 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Giriş yapılıyor..." : "Giriş yap"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Henüz bir hesabın yok mu?{" "}
            <Link
              href="/signup"
              className="font-medium text-zinc-200 transition hover:text-white"
            >
              Hesap oluştur
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}