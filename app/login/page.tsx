"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  sendEmailVerification,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "../../lib/firebase";
import {
  isRtlLanguage,
  readStoredLanguage,
  storeLanguage,
  type Language,
} from "@/lib/i18n";

type LoginCopy = {
  welcome: string;
  description: string;
  email: string;
  emailPlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  staySignedIn: string;
  forgotPassword: string;
  signIn: string;
  signingIn: string;
  or: string;
  createAccount: string;
  secureTitle: string;
  secureText: string;
  resendVerification: string;
  resendingVerification: string;
  emailRequired: string;
  passwordRequired: string;
  verificationRequired: string;
  resendCredentialsRequired: string;
  alreadyVerified: string;
  verificationSent: string;
  loginSuccess: string;
  errors: {
    invalidEmail: string;
    invalidCredentials: string;
    userDisabled: string;
    network: string;
    tooManyRequests: string;
    generic: string;
  };
};

const languages: { code: Language; label: string; short: string }[] = [
  { code: "de", label: "Deutsch", short: "DE" },
  { code: "en", label: "English", short: "EN" },
  { code: "tr", label: "Türkçe", short: "TR" },
  { code: "ru", label: "Русский", short: "RU" },
  { code: "ar", label: "العربية", short: "AR" },
  { code: "fa", label: "فارسی", short: "FA" },
];

const copy: Record<Language, LoginCopy> = {
  de: {
    welcome: "Willkommen zurück",
    description: "Bitte melde dich bei deinem Konto an.",
    email: "E-Mail-Adresse",
    emailPlaceholder: "E-Mail-Adresse eingeben",
    password: "Passwort",
    passwordPlaceholder: "Passwort eingeben",
    staySignedIn: "Angemeldet bleiben",
    forgotPassword: "Passwort vergessen?",
    signIn: "Anmelden",
    signingIn: "Anmeldung läuft...",
    or: "oder",
    createAccount: "Neues Konto erstellen",
    secureTitle: "Deine Daten sind sicher",
    secureText:
      "ALQEV verwendet moderne Verschlüsselung und Sicherheitsstandards.",
    resendVerification: "Bestätigungs-E-Mail erneut senden",
    resendingVerification: "Bestätigungs-E-Mail wird gesendet...",
    emailRequired: "Bitte gib deine E-Mail-Adresse ein.",
    passwordRequired: "Bitte gib dein Passwort ein.",
    verificationRequired:
      "Deine E-Mail-Adresse wurde noch nicht bestätigt. Öffne den ALQEV-Bestätigungslink in deinem Posteingang.",
    resendCredentialsRequired:
      "Gib E-Mail-Adresse und Passwort ein, um die Bestätigungs-E-Mail erneut zu senden.",
    alreadyVerified:
      "Deine E-Mail-Adresse ist bereits bestätigt. Du kannst dich jetzt anmelden.",
    verificationSent:
      "Ein neuer Bestätigungslink wurde gesendet. Prüfe bitte auch den Spam-Ordner.",
    loginSuccess: "Anmeldung erfolgreich. Du wirst weitergeleitet...",
    errors: {
      invalidEmail: "Bitte gib eine gültige E-Mail-Adresse ein.",
      invalidCredentials: "E-Mail-Adresse oder Passwort ist falsch.",
      userDisabled: "Dieses Benutzerkonto wurde deaktiviert.",
      network: "Keine Internetverbindung. Bitte versuche es erneut.",
      tooManyRequests:
        "Zu viele Anmeldeversuche. Bitte versuche es später erneut.",
      generic:
        "Anmeldung fehlgeschlagen. Prüfe deine Angaben und versuche es erneut.",
    },
  },
  en: {
    welcome: "Welcome back",
    description: "Please sign in to your account.",
    email: "Email address",
    emailPlaceholder: "Enter your email address",
    password: "Password",
    passwordPlaceholder: "Enter your password",
    staySignedIn: "Stay signed in",
    forgotPassword: "Forgot password?",
    signIn: "Sign in",
    signingIn: "Signing in...",
    or: "or",
    createAccount: "Create a new account",
    secureTitle: "Your data is secure",
    secureText:
      "ALQEV uses modern encryption and security standards.",
    resendVerification: "Resend verification email",
    resendingVerification: "Sending verification email...",
    emailRequired: "Please enter your email address.",
    passwordRequired: "Please enter your password.",
    verificationRequired:
      "Your email address has not been verified yet. Open the ALQEV verification link in your inbox.",
    resendCredentialsRequired:
      "Enter your email and password to resend the verification email.",
    alreadyVerified:
      "Your email address is already verified. You can sign in now.",
    verificationSent:
      "A new verification link was sent. Please also check your spam folder.",
    loginSuccess: "Sign-in successful. Redirecting...",
    errors: {
      invalidEmail: "Please enter a valid email address.",
      invalidCredentials: "The email address or password is incorrect.",
      userDisabled: "This user account has been disabled.",
      network: "No internet connection. Please try again.",
      tooManyRequests: "Too many sign-in attempts. Please try again later.",
      generic:
        "Sign-in failed. Please check your details and try again.",
    },
  },
  tr: {
    welcome: "Tekrar hoş geldin",
    description: "Lütfen hesabına giriş yap.",
    email: "E-posta adresi",
    emailPlaceholder: "E-posta adresini gir",
    password: "Şifre",
    passwordPlaceholder: "Şifreni gir",
    staySignedIn: "Oturumu açık tut",
    forgotPassword: "Şifremi unuttum?",
    signIn: "Giriş yap",
    signingIn: "Giriş yapılıyor...",
    or: "veya",
    createAccount: "Yeni hesap oluştur",
    secureTitle: "Verilerin güvende",
    secureText:
      "ALQEV modern şifreleme ve güvenlik standartları kullanır.",
    resendVerification: "Doğrulama e-postasını tekrar gönder",
    resendingVerification: "Doğrulama e-postası gönderiliyor...",
    emailRequired: "Lütfen e-posta adresini gir.",
    passwordRequired: "Lütfen şifreni gir.",
    verificationRequired:
      "E-posta adresin henüz doğrulanmamış. Gelen kutundaki ALQEV doğrulama bağlantısını aç.",
    resendCredentialsRequired:
      "Doğrulama e-postasını tekrar göndermek için e-posta adresini ve şifreni gir.",
    alreadyVerified:
      "E-posta adresin zaten doğrulanmış. Şimdi giriş yapabilirsin.",
    verificationSent:
      "Yeni doğrulama bağlantısı gönderildi. Spam klasörünü de kontrol et.",
    loginSuccess: "Giriş başarılı. Yönlendiriliyorsun...",
    errors: {
      invalidEmail: "Lütfen geçerli bir e-posta adresi gir.",
      invalidCredentials: "E-posta adresi veya şifre hatalı.",
      userDisabled: "Bu kullanıcı hesabı devre dışı bırakılmış.",
      network: "İnternet bağlantısı kurulamadı. Lütfen tekrar dene.",
      tooManyRequests:
        "Çok fazla giriş denemesi yapıldı. Lütfen biraz sonra tekrar dene.",
      generic:
        "Giriş yapılamadı. Lütfen bilgilerini kontrol edip tekrar dene.",
    },
  },
  ru: {
    welcome: "С возвращением",
    description: "Войдите в свой аккаунт.",
    email: "Электронная почта",
    emailPlaceholder: "Введите электронную почту",
    password: "Пароль",
    passwordPlaceholder: "Введите пароль",
    staySignedIn: "Оставаться в системе",
    forgotPassword: "Забыли пароль?",
    signIn: "Войти",
    signingIn: "Выполняется вход...",
    or: "или",
    createAccount: "Создать новый аккаунт",
    secureTitle: "Ваши данные защищены",
    secureText:
      "ALQEV использует современные стандарты шифрования и безопасности.",
    resendVerification: "Отправить письмо подтверждения ещё раз",
    resendingVerification: "Письмо подтверждения отправляется...",
    emailRequired: "Введите электронную почту.",
    passwordRequired: "Введите пароль.",
    verificationRequired:
      "Ваш адрес электронной почты ещё не подтверждён. Откройте ссылку подтверждения ALQEV во входящих.",
    resendCredentialsRequired:
      "Введите электронную почту и пароль для повторной отправки подтверждения.",
    alreadyVerified:
      "Ваш адрес уже подтверждён. Теперь вы можете войти.",
    verificationSent:
      "Новая ссылка подтверждения отправлена. Проверьте также папку «Спам».",
    loginSuccess: "Вход выполнен. Перенаправляем...",
    errors: {
      invalidEmail: "Введите действительный адрес электронной почты.",
      invalidCredentials: "Неверный адрес электронной почты или пароль.",
      userDisabled: "Эта учётная запись отключена.",
      network: "Нет подключения к интернету. Попробуйте ещё раз.",
      tooManyRequests: "Слишком много попыток входа. Попробуйте позже.",
      generic: "Не удалось войти. Проверьте данные и попробуйте ещё раз.",
    },
  },
  ar: {
    welcome: "مرحبًا بعودتك",
    description: "يرجى تسجيل الدخول إلى حسابك.",
    email: "البريد الإلكتروني",
    emailPlaceholder: "أدخل بريدك الإلكتروني",
    password: "كلمة المرور",
    passwordPlaceholder: "أدخل كلمة المرور",
    staySignedIn: "البقاء مسجّلًا",
    forgotPassword: "نسيت كلمة المرور؟",
    signIn: "تسجيل الدخول",
    signingIn: "جارٍ تسجيل الدخول...",
    or: "أو",
    createAccount: "إنشاء حساب جديد",
    secureTitle: "بياناتك آمنة",
    secureText:
      "يستخدم ALQEV معايير حديثة للتشفير والأمان.",
    resendVerification: "إعادة إرسال رسالة التحقق",
    resendingVerification: "جارٍ إرسال رسالة التحقق...",
    emailRequired: "يرجى إدخال بريدك الإلكتروني.",
    passwordRequired: "يرجى إدخال كلمة المرور.",
    verificationRequired:
      "لم يتم تأكيد بريدك الإلكتروني بعد. افتح رابط التحقق من ALQEV في صندوق الوارد.",
    resendCredentialsRequired:
      "أدخل بريدك الإلكتروني وكلمة المرور لإعادة إرسال رسالة التحقق.",
    alreadyVerified:
      "تم تأكيد بريدك الإلكتروني بالفعل. يمكنك تسجيل الدخول الآن.",
    verificationSent:
      "تم إرسال رابط تحقق جديد. تحقق أيضًا من مجلد الرسائل غير المرغوب فيها.",
    loginSuccess: "تم تسجيل الدخول بنجاح. جارٍ تحويلك...",
    errors: {
      invalidEmail: "يرجى إدخال بريد إلكتروني صالح.",
      invalidCredentials: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
      userDisabled: "تم تعطيل هذا الحساب.",
      network: "تعذر الاتصال بالإنترنت. حاول مرة أخرى.",
      tooManyRequests: "محاولات تسجيل دخول كثيرة جدًا. حاول لاحقًا.",
      generic: "تعذر تسجيل الدخول. تحقق من بياناتك وحاول مرة أخرى.",
    },
  },
  fa: {
    welcome: "خوش آمدید",
    description: "لطفاً وارد حساب خود شوید.",
    email: "ایمیل",
    emailPlaceholder: "ایمیل خود را وارد کنید",
    password: "رمز عبور",
    passwordPlaceholder: "رمز عبور را وارد کنید",
    staySignedIn: "ورود من را حفظ کن",
    forgotPassword: "رمز عبور را فراموش کرده‌اید؟",
    signIn: "ورود",
    signingIn: "در حال ورود...",
    or: "یا",
    createAccount: "ایجاد حساب جدید",
    secureTitle: "داده‌های شما امن است",
    secureText:
      "ALQEV از استانداردهای مدرن رمزگذاری و امنیت استفاده می‌کند.",
    resendVerification: "ارسال دوباره ایمیل تأیید",
    resendingVerification: "ایمیل تأیید در حال ارسال است...",
    emailRequired: "لطفاً ایمیل خود را وارد کنید.",
    passwordRequired: "لطفاً رمز عبور خود را وارد کنید.",
    verificationRequired:
      "ایمیل شما هنوز تأیید نشده است. لینک تأیید ALQEV را در صندوق ورودی باز کنید.",
    resendCredentialsRequired:
      "برای ارسال دوباره ایمیل تأیید، ایمیل و رمز عبور را وارد کنید.",
    alreadyVerified:
      "ایمیل شما قبلاً تأیید شده است. اکنون می‌توانید وارد شوید.",
    verificationSent:
      "لینک تأیید جدید ارسال شد. پوشه هرزنامه را نیز بررسی کنید.",
    loginSuccess: "ورود موفق بود. در حال انتقال...",
    errors: {
      invalidEmail: "لطفاً یک ایمیل معتبر وارد کنید.",
      invalidCredentials: "ایمیل یا رمز عبور نادرست است.",
      userDisabled: "این حساب کاربری غیرفعال شده است.",
      network: "اتصال اینترنت برقرار نشد. دوباره تلاش کنید.",
      tooManyRequests: "تلاش‌های ورود بیش از حد است. کمی بعد تلاش کنید.",
      generic: "ورود انجام نشد. اطلاعات خود را بررسی و دوباره تلاش کنید.",
    },
  },
};

function detectDeviceLanguage(): Language {
  if (typeof navigator === "undefined") return "en";

  const candidates =
    navigator.languages?.length
      ? navigator.languages
      : [navigator.language];

  for (const candidate of candidates) {
    const code = candidate.toLowerCase().split("-")[0];

    if (["de", "en", "tr", "ru", "ar", "fa"].includes(code)) {
      return code as Language;
    }
  }

  return "en";
}

function getFirebaseErrorMessage(
  errorCode: string | undefined,
  language: Language,
) {
  const errors = copy[language].errors;

  switch (errorCode) {
    case "auth/invalid-email":
      return errors.invalidEmail;
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return errors.invalidCredentials;
    case "auth/user-disabled":
      return errors.userDisabled;
    case "auth/network-request-failed":
      return errors.network;
    case "auth/too-many-requests":
      return errors.tooManyRequests;
    default:
      return errors.generic;
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


function AlqevBrand() {
  return (
    <svg
      viewBox="0 0 520 245"
      role="img"
      aria-label="ALQEV"
      className="h-auto w-[255px] max-w-[78vw] sm:w-[300px]"
    >
      <defs>
        <linearGradient id="alqevPurple" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
      </defs>

      <path d="M260 14 L325 124 H291 L260 70 L229 124 H195 Z" fill="white" />
      <path d="M260 62 L287 108 H233 Z" fill="url(#alqevPurple)" />

      <g
        fill="none"
        stroke="white"
        strokeWidth="9"
        strokeLinecap="square"
        strokeLinejoin="miter"
      >
        <path d="M37 216 L75 148 L113 216" />
        <path d="M137 148 V216 H184" />
        <path d="M317 148 H374 M317 148 V216 M317 182 H365 M317 216 H374" />
        <path d="M401 148 L438 216 L476 148" />
      </g>

      <circle
        cx="254"
        cy="182"
        r="35"
        fill="none"
        stroke="url(#alqevPurple)"
        strokeWidth="11"
      />
      <path
        d="M275 203 L299 224"
        stroke="url(#alqevPurple)"
        strokeWidth="11"
        strokeLinecap="square"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4.5 7L12 13L19.5 7" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <rect x="5" y="10" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 10V7.5A4 4 0 0112 3.5A4 4 0 0116 7.5V10" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path d="M2.5 12S6 6.5 12 6.5S21.5 12 21.5 12S18 17.5 12 17.5S2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="2.7" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3.5 19C3.5 15.5 5.8 13.5 9 13.5C12.2 13.5 14.5 15.5 14.5 19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M18 9V15M15 12H21" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <path d="M12 2.5L19 5.5V11C19 15.5 16.3 19.2 12 21.5C7.7 19.2 5 15.5 5 11V5.5L12 2.5Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.5 12L10.7 14.2L15.7 9.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();

  const [language, setLanguage] = useState<Language>("en");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [staySignedIn, setStaySignedIn] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResendingVerification, setIsResendingVerification] =
    useState(false);
  const [showResendVerification, setShowResendVerification] =
    useState(false);

  useEffect(() => {
    const detected = detectDeviceLanguage();
    const preferred = readStoredLanguage(detected);

    setLanguage(preferred);
    document.documentElement.lang = preferred;
    document.documentElement.dir = isRtlLanguage(preferred)
      ? "rtl"
      : "ltr";
  }, []);

  const t = copy[language];

  const taglines: Record<Language, [string, string]> = {
    de: ["Intelligente Prozesse. Klare Ergebnisse.", "Sichere Dokumente."],
    en: ["Intelligent processes. Clear results.", "Secure documents."],
    tr: ["Akıllı süreçler. Net sonuçlar.", "Güvenli belgeler."],
    ru: ["Умные процессы. Ясные результаты.", "Безопасные документы."],
    ar: ["عمليات ذكية. نتائج واضحة.", "مستندات آمنة."],
    fa: ["فرایندهای هوشمند. نتایج روشن.", "اسناد امن."],
  };
  const [taglineOne, taglineTwo] = taglines[language];

  const direction = isRtlLanguage(language) ? "rtl" : "ltr";

  function handleLanguageChange(nextLanguage: Language) {
    setLanguage(nextLanguage);
    storeLanguage(nextLanguage);
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");
    setShowResendVerification(false);

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setErrorMessage(t.emailRequired);
      return;
    }

    if (!password) {
      setErrorMessage(t.passwordRequired);
      return;
    }

    try {
      setIsSubmitting(true);

      await setPersistence(
        auth,
        staySignedIn ? browserLocalPersistence : browserSessionPersistence,
      );

      const userCredential = await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        password,
      );

      await userCredential.user.reload();

      if (!userCredential.user.emailVerified) {
        setShowResendVerification(true);
        setErrorMessage(t.verificationRequired);
        await signOut(auth);
        setIsSubmitting(false);
        return;
      }

      await userCredential.user.getIdToken(true);

      setSuccessMessage(t.loginSuccess);

      window.setTimeout(() => {
        router.replace("/dashboard");
        router.refresh();
      }, 800);
    } catch (error: unknown) {
      setErrorMessage(
        getFirebaseErrorMessage(getErrorCode(error), language),
      );
      setIsSubmitting(false);
    }
  }

  async function handleResendVerification() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setErrorMessage(t.resendCredentialsRequired);
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
        setSuccessMessage(t.alreadyVerified);
        return;
      }

      await sendEmailVerification(userCredential.user);
      await signOut(auth);

      setSuccessMessage(t.verificationSent);
      setShowResendVerification(false);
    } catch (error: unknown) {
      setErrorMessage(
        getFirebaseErrorMessage(getErrorCode(error), language),
      );
    } finally {
      setIsResendingVerification(false);
    }
  }

  return (
    <main
      dir={direction}
      className="relative min-h-[100dvh] overflow-x-hidden bg-[#030309] text-white"
    >
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-170px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-violet-700/10 blur-[150px]" />
        <div className="absolute bottom-[-250px] right-[-180px] h-[500px] w-[500px] rounded-full bg-indigo-700/10 blur-[160px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[980px] flex-col items-center px-4 pb-7 pt-5 sm:px-6 sm:pt-7 lg:px-8">
        <div className="flex max-w-full items-center gap-0.5 rounded-2xl border border-white/10 bg-[#090911]/85 p-1 shadow-[0_12px_35px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <span className="flex h-9 w-9 items-center justify-center text-violet-300">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
              <path d="M3.5 12H20.5M12 3C14.2 5.3 15.5 8.5 15.5 12C15.5 15.5 14.2 18.7 12 21M12 3C9.8 5.3 8.5 8.5 8.5 12C8.5 15.5 9.8 18.7 12 21" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </span>

          {languages.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => handleLanguageChange(item.code)}
              aria-pressed={language === item.code}
              title={item.label}
              className={`h-9 min-w-10 rounded-xl px-2 text-xs font-semibold transition sm:min-w-11 ${
                language === item.code
                  ? "bg-violet-500/15 text-white shadow-[0_0_18px_rgba(139,92,246,0.18),inset_0_0_0_1px_rgba(168,85,247,0.18)]"
                  : "text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
              }`}
            >
              {item.short}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-col items-center sm:mt-5">
          <AlqevBrand />
          <p className="mt-[-8px] text-center text-[13px] leading-5 text-zinc-400 sm:text-sm">
            {taglineOne}
            <br />
            {taglineTwo}
          </p>
        </div>

        <div aria-hidden="true" className="relative mt-2 h-16 w-[760px] max-w-[150vw] shrink-0 sm:mt-3 sm:h-20 lg:h-24">
          <div className="absolute left-1/2 top-5 h-[260px] w-[820px] -translate-x-1/2 rounded-[50%] border-t border-fuchsia-400/90 bg-violet-700/[0.055] shadow-[0_-8px_22px_rgba(217,70,239,0.38),0_-22px_80px_rgba(124,58,237,0.28)] sm:top-7 sm:w-[980px]" />
          <div className="absolute left-1/2 top-4 h-14 w-[500px] -translate-x-1/2 rounded-full bg-fuchsia-500/12 blur-2xl sm:top-5 sm:w-[680px]" />
        </div>

        <section className="relative z-10 -mt-8 w-full max-w-[540px] min-w-0 rounded-[26px] border border-white/10 bg-[linear-gradient(160deg,rgba(15,16,25,0.96),rgba(7,8,14,0.97))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.48)] backdrop-blur-2xl sm:-mt-10 sm:p-7">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-[28px]">
            {t.welcome}
          </h1>
          <p className="mt-1.5 text-sm text-zinc-400">{t.description}</p>

          <form className="mt-7 space-y-5" onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-zinc-300">
                {t.email}
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-violet-400">
                  <MailIcon />
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isSubmitting || isResendingVerification}
                  placeholder={t.emailPlaceholder}
                  className="h-14 w-full min-w-0 rounded-xl border border-white/10 bg-[#070810] pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400/50 focus:ring-4 focus:ring-violet-500/10 disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-zinc-300">
                {t.password}
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-violet-400">
                  <LockIcon />
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isSubmitting || isResendingVerification}
                  placeholder={t.passwordPlaceholder}
                  className="h-14 w-full min-w-0 rounded-xl border border-white/10 bg-[#070810] pl-12 pr-12 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400/50 focus:ring-4 focus:ring-violet-500/10 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label="Toggle password visibility"
                  className="absolute inset-y-0 right-3 flex w-9 items-center justify-center text-zinc-400 transition hover:text-white"
                >
                  <EyeIcon />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 text-[12px] sm:text-sm">
              <label className="flex min-w-0 cursor-pointer items-center gap-2 text-zinc-400">
                <input
                  type="checkbox"
                  checked={staySignedIn}
                  onChange={(event) => setStaySignedIn(event.target.checked)}
                  className="h-4 w-4 shrink-0 accent-violet-500"
                />
                <span className="truncate">{t.staySignedIn}</span>
              </label>
              <Link href="/forgot-password" className="shrink-0 font-medium text-violet-300 transition hover:text-violet-200">
                {t.forgotPassword}
              </Link>
            </div>

            {errorMessage ? (
              <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/[0.08] px-4 py-3 text-sm leading-5 text-red-200">
                {errorMessage}
              </div>
            ) : null}

            {successMessage ? (
              <div role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.08] px-4 py-3 text-sm leading-5 text-emerald-200">
                {successMessage}
              </div>
            ) : null}

            {showResendVerification ? (
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isResendingVerification}
                className="min-h-12 w-full rounded-xl border border-violet-400/25 bg-violet-400/[0.08] px-5 py-3 text-sm font-semibold text-violet-100 transition hover:bg-violet-400/[0.12] disabled:opacity-60"
              >
                {isResendingVerification ? t.resendingVerification : t.resendVerification}
              </button>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || isResendingVerification}
              className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 px-5 py-3 text-base font-bold text-white shadow-[0_12px_35px_rgba(139,92,246,0.24)] transition hover:brightness-110 active:scale-[0.995] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span>{isSubmitting ? t.signingIn : t.signIn}</span>
              {!isSubmitting ? <span aria-hidden="true">→</span> : null}
            </button>

            <div className="flex items-center gap-4 py-0.5">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-zinc-500">{t.or}</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <Link
              href="/signup"
              className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-transparent px-5 py-3 text-sm font-semibold text-zinc-100 transition hover:border-violet-400/30 hover:bg-violet-400/[0.04]"
            >
              <span className="text-violet-400"><UserPlusIcon /></span>
              <span>{t.createAccount}</span>
            </Link>
          </form>

          <div className="mt-6 flex items-start gap-3 border-t border-white/[0.06] pt-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-violet-300 shadow-[0_0_22px_rgba(139,92,246,0.16)]">
              <ShieldIcon />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-300">{t.secureTitle}</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">{t.secureText}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}