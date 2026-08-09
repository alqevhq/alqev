"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  sendEmailVerification,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../../lib/firebase";

const CONSENT_VERSION = "2026-07-26";
const PRIVACY_VERSION = "2026-07-26";
const TERMS_VERSION = "2026-07-26";
const AI_NOTICE_VERSION = "2026-07-26";
const OCR_NOTICE_VERSION = "2026-07-26";
const AGE_NOTICE_VERSION = "2026-07-26";

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

type ConsentCheckboxProps = {
  id: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
};

function ConsentCheckbox({
  id,
  checked,
  disabled,
  onChange,
  children,
}: ConsentCheckboxProps) {
  return (
    <label
      htmlFor={id}
      className="flex min-w-0 cursor-pointer items-start gap-3 rounded-2xl border border-white/[0.08] bg-[linear-gradient(145deg,rgba(17,17,28,0.82),rgba(8,8,15,0.90))] p-4 transition hover:border-violet-400/25 hover:bg-violet-400/[0.04]"
    >
      <input
        id={id}
        name={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-white/20 bg-black text-violet-500 accent-violet-500 focus:ring-2 focus:ring-violet-500/40 disabled:cursor-not-allowed"
      />

      <span className="text-xs leading-5 text-zinc-400">{children}</span>
    </label>
  );
}

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [aiNoticeAccepted, setAiNoticeAccepted] = useState(false);
  const [ocrConsent, setOcrConsent] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);

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

    if (!privacyAccepted) {
      setErrorMessage("Devam etmek için gizlilik politikasını kabul etmelisin.");
      return;
    }

    if (!termsAccepted) {
      setErrorMessage("Devam etmek için kullanım koşullarını kabul etmelisin.");
      return;
    }

    if (!aiNoticeAccepted) {
      setErrorMessage("ALQEV&apos;in yapay zekâ kullanım bilgilendirmesini onaylamalısın.");
      return;
    }

    if (!ageConfirmed) {
      setErrorMessage("Hesap oluşturmak için 18 yaşını doldurduğunu onaylamalısın.");
      return;
    }

    let createdUser: User | null = null;
    let userDocumentCreated = false;

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

      const acceptedAt = serverTimestamp();

      const userDocumentReference = doc(db, "users", createdUser.uid);

      await setDoc(userDocumentReference, {
        fullName: normalizedName,
        email: normalizedEmail,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        language: "tr",
        country: "",
        onboardingCompleted: false,
        subscription: "free",
        accountStatus: "active",
        role: "user",
        legal: {
          consentVersion: CONSENT_VERSION,

          privacyAccepted,
          privacyAcceptedAt: acceptedAt,
          privacyVersion: PRIVACY_VERSION,

          termsAccepted,
          termsAcceptedAt: acceptedAt,
          termsVersion: TERMS_VERSION,

          aiNoticeAccepted,
          aiNoticeAcceptedAt: acceptedAt,
          aiNoticeVersion: AI_NOTICE_VERSION,

          ocrConsent,
          ocrConsentAcceptedAt: ocrConsent ? acceptedAt : null,
          ocrNoticeVersion: OCR_NOTICE_VERSION,

          ageConfirmed,
          ageConfirmedAt: acceptedAt,
          ageNoticeVersion: AGE_NOTICE_VERSION,

          requiredConsentsAccepted: true,
          acceptedAt,
        },
      });

      userDocumentCreated = true;

      await sendEmailVerification(createdUser);
      await signOut(auth);

      setSuccessMessage(
        "Hesabın oluşturuldu. Doğrulama bağlantısını e-posta adresine gönderdik. E-posta adresini doğruladıktan sonra giriş yapabilirsin."
      );

      setFullName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setPrivacyAccepted(false);
      setTermsAccepted(false);
      setAiNoticeAccepted(false);
      setOcrConsent(false);
      setAgeConfirmed(false);

      window.setTimeout(() => {
        router.replace("/login");
        router.refresh();
      }, 2500);
    } catch (error: unknown) {
      if (createdUser && userDocumentCreated) {
        try {
          await deleteDoc(doc(db, "users", createdUser.uid));
        } catch (rollbackError) {
          console.error(
            "Tamamlanamayan kullanıcı profili geri alınamadı:",
            rollbackError
          );
        }
      }

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
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-x-hidden bg-[#030309] px-3 py-7 text-white sm:px-6 sm:py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute left-1/2 top-[-260px] h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-violet-700/12 blur-[165px]" />
        <div className="absolute bottom-[-280px] right-[-190px] h-[560px] w-[560px] rounded-full bg-fuchsia-700/[0.08] blur-[175px]" />
        <div className="absolute left-1/2 top-[180px] h-[210px] w-[900px] -translate-x-1/2 rounded-[50%] border-t border-fuchsia-400/25 shadow-[0_-18px_80px_rgba(168,85,247,0.12)]" />
      </div>

      <section className="relative z-10 w-full max-w-2xl">
        <Link
          href="/"
          className="mb-6 inline-flex max-w-full items-center gap-2 rounded-xl border border-white/[0.08] bg-[#090911]/80 px-4 py-2.5 text-sm font-semibold text-zinc-300 shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl transition hover:border-violet-400/30 hover:bg-violet-400/[0.06] hover:text-white"
        >
          <span aria-hidden="true">←</span>
          Ana sayfaya dön
        </Link>

        <div className="min-w-0 rounded-[2rem] border border-violet-300/15 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.13),transparent_42%),linear-gradient(145deg,rgba(17,17,29,0.96),rgba(7,7,14,0.98))] p-5 shadow-[0_28px_90px_rgba(46,16,101,0.18)] backdrop-blur-2xl sm:p-8">
          <div className="mb-8">
            <div className="mb-5 inline-flex items-center rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-xs font-semibold tracking-[0.22em] text-violet-200">
              ALQEV
            </div>

            <h1 className="break-words text-[2rem] font-bold leading-tight tracking-tight text-white sm:text-4xl">
              Hesabını oluştur
            </h1>

            <p className="mt-3 break-words text-sm leading-6 text-zinc-400">
              ALQEV deneyimine başlamak için bilgilerini gir ve gerekli
              bilgilendirmeleri onayla.
            </p>
          </div>

          <form className="min-w-0 space-y-5" onSubmit={handleSubmit} noValidate>
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
                className="h-12 w-full min-w-0 rounded-xl border border-white/[0.08] bg-[#070810] px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400/50 focus:ring-4 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-60"
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
                className="h-12 w-full min-w-0 rounded-xl border border-white/[0.08] bg-[#070810] px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400/50 focus:ring-4 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div className="grid min-w-0 gap-5 sm:grid-cols-2">
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
                  className="h-12 w-full min-w-0 rounded-xl border border-white/[0.08] bg-[#070810] px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400/50 focus:ring-4 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-60"
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
                  className="h-12 w-full min-w-0 rounded-xl border border-white/[0.08] bg-[#070810] px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400/50 focus:ring-4 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-violet-400/20 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.12),transparent_60%),rgba(11,10,19,0.82)] p-4">
              <h2 className="text-sm font-semibold text-zinc-100">
                Gizlilik ve kullanım onayları
              </h2>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Yıldızlı onaylar hesap oluşturmak için zorunludur. OCR izni
                isteğe bağlıdır ve belge yükleme ekranında yeniden sorulmalıdır.
              </p>
            </div>

            <div className="space-y-3">
              <ConsentCheckbox
                id="privacyAccepted"
                checked={privacyAccepted}
                disabled={isSubmitting}
                onChange={setPrivacyAccepted}
              >
                <span className="font-medium text-zinc-200">*</span>{" "}
                <Link
                  href="/datenschutz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-violet-300 underline decoration-violet-300/40 underline-offset-2 hover:text-violet-200"
                >
                  Gizlilik Politikasını
                </Link>{" "}
                okudum ve kişisel verilerimin burada açıklandığı şekilde
                işlenmesini kabul ediyorum.
              </ConsentCheckbox>

              <ConsentCheckbox
                id="termsAccepted"
                checked={termsAccepted}
                disabled={isSubmitting}
                onChange={setTermsAccepted}
              >
                <span className="font-medium text-zinc-200">*</span>{" "}
                <Link
                  href="/nutzungsbedingungen"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-violet-300 underline decoration-violet-300/40 underline-offset-2 hover:text-violet-200"
                >
                  Kullanım Koşullarını
                </Link>{" "}
                okudum ve kabul ediyorum.
              </ConsentCheckbox>

              <ConsentCheckbox
                id="aiNoticeAccepted"
                checked={aiNoticeAccepted}
                disabled={isSubmitting}
                onChange={setAiNoticeAccepted}
              >
                <span className="font-medium text-zinc-200">*</span> ALQEV&apos;in
                yanıt üretmek için yapay zekâ sistemleri kullandığını; AI
                yanıtlarının hata içerebileceğini ve resmi, hukuki, tıbbi veya
                mali danışmanlığın yerine geçmediğini ve bağlayıcı kararlar için
                yetkili kurumların veya uzmanların değerlendirmesinin esas olduğunu
                anladım.
              </ConsentCheckbox>

              <ConsentCheckbox
                id="ocrConsent"
                checked={ocrConsent}
                disabled={isSubmitting}
                onChange={setOcrConsent}
              >
                Belge yüklediğimde içeriğin OCR ve yapay zekâ yöntemleriyle
                analiz edilebileceğini kabul ediyorum. Bu izin isteğe bağlıdır;
                belge yükleme özelliğini kullanmadan ALQEV hesabı açabilirim.
              </ConsentCheckbox>

              <ConsentCheckbox
                id="ageConfirmed"
                checked={ageConfirmed}
                disabled={isSubmitting}
                onChange={setAgeConfirmed}
              >
                <span className="font-medium text-zinc-200">*</span> 18 yaşımı
                doldurduğumu ve verdiğim bilgilerin doğru olduğunu onaylıyorum.
              </ConsentCheckbox>
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
              {isSubmitting ? "Hesap oluşturuluyor..." : "Hesap oluştur"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Zaten bir hesabın var mı?{" "}
            <Link
              href="/login"
              className="font-medium text-violet-300 transition hover:text-violet-200"
            >
              Giriş yap
            </Link>
          </p>

          <p className="mt-5 text-center text-xs leading-5 text-zinc-600">
            Onay kayıtları; ilgili metinlerin sürümü, seçimlerin ve kabul tarihi
            ile birlikte kullanıcı profilinde saklanır.
          </p>
        </div>
      </section>
    </main>
  );
}