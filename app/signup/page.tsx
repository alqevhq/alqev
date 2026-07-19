"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";

function getFirebaseErrorMessage(errorCode?: string) {
  switch (errorCode) {
    case "auth/email-already-in-use":
      return "Bu e-posta adresiyle daha önce bir hesap oluşturulmuş.";

    case "auth/invalid-email":
      return "Lütfen geçerli bir e-posta adresi gir.";

    case "auth/weak-password":
      return "Şifren en az 6 karakter olmalı.";

    case "auth/network-request-failed":
      return "İnternet bağlantısı kurulamadı. Lütfen tekrar dene.";

    case "auth/operation-not-allowed":
      return "E-posta ve şifreyle kayıt Firebase üzerinde etkin değil.";

    case "auth/too-many-requests":
      return "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar dene.";

    case "permission-denied":
    case "firestore/permission-denied":
      return "Kullanıcı profili veritabanına kaydedilemedi. Firestore izinlerini kontrol et.";

    case "unavailable":
    case "firestore/unavailable":
      return "Veritabanına şu anda ulaşılamıyor. Lütfen biraz sonra tekrar dene.";

    default:
      return "Hesap oluşturulamadı. Lütfen bilgilerini kontrol edip tekrar dene.";
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

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedName) {
      setErrorMessage("Lütfen adını ve soyadını gir.");
      return;
    }

    if (!normalizedEmail) {
      setErrorMessage("Lütfen e-posta adresini gir.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Şifren en az 6 karakter olmalı.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Girdiğin şifreler birbiriyle eşleşmiyor.");
      return;
    }

    let createdUser: User | null = null;

    try {
      setIsSubmitting(true);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        password
      );

      createdUser = userCredential.user;

      await updateProfile(createdUser, {
        displayName: normalizedName,
      });

      await setDoc(doc(db, "users", createdUser.uid), {
        fullName: normalizedName,
        email: normalizedEmail,
        createdAt: serverTimestamp(),
        language: "tr",
        country: "",
        onboardingCompleted: false,
        subscription: "free",
      });

      setSuccessMessage(
        "Hesabın ve kullanıcı profilin başarıyla oluşturuldu. Yönlendiriliyorsun..."
      );

      setFullName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");

      window.setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 1200);
    } catch (error: unknown) {
      if (createdUser) {
        try {
          await deleteUser(createdUser);
        } catch (rollbackError) {
          console.error(
            "Tamamlanamayan kullanıcı kaydı geri alınamadı:",
            rollbackError
          );
        }
      }

      console.error("Kullanıcı kaydı oluşturulamadı:", error);
      setErrorMessage(getFirebaseErrorMessage(getErrorCode(error)));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-12 text-white sm:px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute left-1/2 top-[-220px] h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-violet-700/20 blur-[140px]" />

        <div className="absolute bottom-[-250px] right-[-150px] h-[500px] w-[500px] rounded-full bg-blue-700/15 blur-[150px]" />

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
              HUMANITY OS
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Hesabını oluştur
            </h1>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              HUMANITY OS deneyimine başlamak için bilgilerini gir.
            </p>
          </div>

          <form
            className="space-y-5"
            onSubmit={handleSubmit}
            noValidate
          >
            <div>
              <label
                htmlFor="fullName"
                className="mb-2 block text-sm font-medium text-zinc-200"
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
                placeholder="Ad Soyad"
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

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
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting}
                placeholder="En az 6 karakter"
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-zinc-200"
              >
                Şifreyi doğrula
              </label>

              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                disabled={isSubmitting}
                placeholder="Şifreni tekrar gir"
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              />
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

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-zinc-200 focus:outline-none focus:ring-4 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Hesap oluşturuluyor..." : "Hesap oluştur"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Zaten bir hesabın var mı?{" "}
            <Link
              href="/login"
              className="font-medium text-zinc-300 transition hover:text-white"
            >
              Giriş yap
            </Link>
          </p>

          <p className="mt-5 text-center text-xs leading-5 text-zinc-600">
            Hesap oluşturarak HUMANITY OS kullanım koşullarını ve gizlilik
            politikasını kabul etmiş olursun.
          </p>
        </div>
      </section>
    </main>
  );
}