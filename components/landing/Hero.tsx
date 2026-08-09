"use client";

import { useEffect, useState } from "react";
import Header from "../layout/Header";
import HeroContent from "./HeroContent";
import ProcessPreview from "./ProcessPreview";
import {
  readStoredLanguage,
  storeLanguage,
} from "@/lib/i18n";

export type SupportedLanguage =
  | "de"
  | "en"
  | "tr"
  | "ru"
  | "ar"
  | "fa";

type LandingCopy = {
  header: {
    homeLabel: string;
    login: string;
    signup: string;
  };
  hero: {
    badge: string;
    headline: string;
    headlineHighlight: string;
    description: string;
    primaryAction: string;
    secondaryAction: string;
  };
  preview: {
    activeProcess: string;
    title: string;
    documents: [string, boolean][];
    aiTitle: string;
    aiText: string;
  };
  benefits: {
    icon: string;
    title: string;
    description: string;
  }[];
};

export const supportedLanguages: {
  code: SupportedLanguage;
  label: string;
  shortLabel: string;
}[] = [
  { code: "de", label: "Deutsch", shortLabel: "DE" },
  { code: "en", label: "English", shortLabel: "EN" },
  { code: "tr", label: "Türkçe", shortLabel: "TR" },
  { code: "ru", label: "Русский", shortLabel: "RU" },
  { code: "ar", label: "العربية", shortLabel: "AR" },
  { code: "fa", label: "فارسی", shortLabel: "FA" },
];

const translations: Record<SupportedLanguage, LandingCopy> = {
  de: {
    header: {
      homeLabel: "ALQEV Startseite",
      login: "Anmelden",
      signup: "Konto erstellen",
    },
    hero: {
      badge: "Eine App. Alle Prozesse deines Lebens.",
      headline: "Komplexe Lebensprozesse",
      headlineHighlight: "wirklich abschließen.",
      description:
        "ALQEV ist dein persönliches Life-Management-System, das dir hilft, Dokumente, Anträge, Termine und behördliche Vorgänge sicher zu organisieren.",
      primaryAction: "Jetzt Leben organisieren",
      secondaryAction: "So funktioniert es",
    },
    preview: {
      activeProcess: "Aktiver Vorgang",
      title: "Antrag auf Verlängerung des Aufenthaltstitels",
      documents: [
        ["Passkopie", true],
        ["Biometrisches Passfoto", true],
        ["Mietvertrag", false],
        ["Nachweis der Krankenversicherung", false],
      ],
      aiTitle: "ALQEV AI-Empfehlung",
      aiText:
        "Lade als nächsten Schritt deinen Mietvertrag hoch. Ich prüfe, ob die Adress- und Datumsangaben zu deinem Antrag passen.",
    },
    benefits: [
      {
        icon: "✓",
        title: "Vorgänge abschließen",
        description:
          "Verwalte Anträge, Dokumente und nächste Schritte an einem sicheren Ort.",
      },
      {
        icon: "◷",
        title: "Keine Termine verpassen",
        description:
          "Behalte Termine, Fristen und fehlende Dokumente rechtzeitig im Blick.",
      },
      {
        icon: "✦",
        title: "Mit AI vorankommen",
        description:
          "Erhalte nicht nur Antworten, sondern klare Hinweise zum nächsten Schritt.",
      },
    ],
  },
  en: {
    header: {
      homeLabel: "ALQEV home page",
      login: "Sign in",
      signup: "Create account",
    },
    hero: {
      badge: "One app. Every process in your life.",
      headline: "Complete complex life processes",
      headlineHighlight: "with real clarity.",
      description:
        "ALQEV is your personal life management system for securely organizing documents, applications, appointments, and official procedures.",
      primaryAction: "Start organizing your life",
      secondaryAction: "How it works",
    },
    preview: {
      activeProcess: "Active process",
      title: "Residence permit extension",
      documents: [
        ["Passport copy", true],
        ["Biometric photo", true],
        ["Rental agreement", false],
        ["Health insurance certificate", false],
      ],
      aiTitle: "ALQEV AI recommendation",
      aiText:
        "Upload your rental agreement next. I will check whether the address and date details match your application.",
    },
    benefits: [
      {
        icon: "✓",
        title: "Complete your processes",
        description:
          "Manage applications, documents, and next steps in one secure place.",
      },
      {
        icon: "◷",
        title: "Never miss an appointment",
        description:
          "See upcoming appointments, deadlines, and missing documents in time.",
      },
      {
        icon: "✦",
        title: "Move forward with AI",
        description:
          "Get more than answers: receive clear guidance on your next step.",
      },
    ],
  },
  tr: {
    header: {
      homeLabel: "ALQEV ana sayfa",
      login: "Giriş yap",
      signup: "Hesap oluştur",
    },
    hero: {
      badge: "Tek uygulama. Hayatındaki tüm süreçler.",
      headline: "Karmaşık hayat süreçlerini",
      headlineHighlight: "gerçekten tamamla.",
      description:
        "ALQEV; belgelerini, başvurularını, terminlerini ve resmî işlemlerini güvenli biçimde yönetmene yardımcı olan kişisel yaşam işletim sistemidir.",
      primaryAction: "Hayatını düzenlemeye başla",
      secondaryAction: "Nasıl çalışır?",
    },
    preview: {
      activeProcess: "Aktif süreç",
      title: "Oturum uzatma başvurusu",
      documents: [
        ["Pasaport kopyası", true],
        ["Biyometrik fotoğraf", true],
        ["Kira sözleşmesi", false],
        ["Sağlık sigortası belgesi", false],
      ],
      aiTitle: "ALQEV AI önerisi",
      aiText:
        "Sonraki adım olarak kira sözleşmeni yükle. Adres ve tarih bilgilerinin başvurunla uyumlu olup olmadığını kontrol edeyim.",
    },
    benefits: [
      {
        icon: "✓",
        title: "Süreçlerini tamamla",
        description:
          "Başvurularını, belgelerini ve sonraki adımlarını tek bir güvenli yerde yönet.",
      },
      {
        icon: "◷",
        title: "Terminleri unutma",
        description:
          "Yaklaşan randevuları, son tarihleri ve eksik belgeleri zamanında gör.",
      },
      {
        icon: "✦",
        title: "AI ile ilerle",
        description:
          "Sadece cevap alma; hangi adımı atman gerektiğini net biçimde öğren.",
      },
    ],
  },
  ru: {
    header: {
      homeLabel: "Главная страница ALQEV",
      login: "Войти",
      signup: "Создать аккаунт",
    },
    hero: {
      badge: "Одно приложение. Все жизненные процессы.",
      headline: "Завершайте сложные жизненные процессы",
      headlineHighlight: "уверенно и последовательно.",
      description:
        "ALQEV — это ваша персональная система управления жизнью для безопасной организации документов, заявлений, встреч и официальных процедур.",
      primaryAction: "Начать организовывать жизнь",
      secondaryAction: "Как это работает",
    },
    preview: {
      activeProcess: "Активный процесс",
      title: "Продление вида на жительство",
      documents: [
        ["Копия паспорта", true],
        ["Биометрическая фотография", true],
        ["Договор аренды", false],
        ["Справка о медицинском страховании", false],
      ],
      aiTitle: "Рекомендация ALQEV AI",
      aiText:
        "Следующим шагом загрузите договор аренды. Я проверю, совпадают ли адрес и даты с данными вашего заявления.",
    },
    benefits: [
      {
        icon: "✓",
        title: "Завершайте процессы",
        description:
          "Управляйте заявлениями, документами и следующими шагами в одном безопасном месте.",
      },
      {
        icon: "◷",
        title: "Не пропускайте встречи",
        description:
          "Заранее отслеживайте встречи, сроки и недостающие документы.",
      },
      {
        icon: "✦",
        title: "Продвигайтесь с AI",
        description:
          "Получайте не только ответы, но и чёткие рекомендации по следующему шагу.",
      },
    ],
  },
  ar: {
    header: {
      homeLabel: "الصفحة الرئيسية لـ ALQEV",
      login: "تسجيل الدخول",
      signup: "إنشاء حساب",
    },
    hero: {
      badge: "تطبيق واحد لكل إجراءات حياتك.",
      headline: "أنجز إجراءات الحياة المعقدة",
      headlineHighlight: "بوضوح وثقة.",
      description:
        "ALQEV هو نظامك الشخصي لإدارة الحياة، ويساعدك على تنظيم الوثائق والطلبات والمواعيد والإجراءات الرسمية بأمان.",
      primaryAction: "ابدأ تنظيم حياتك",
      secondaryAction: "كيف يعمل؟",
    },
    preview: {
      activeProcess: "إجراء نشط",
      title: "طلب تمديد تصريح الإقامة",
      documents: [
        ["نسخة من جواز السفر", true],
        ["صورة بيومترية", true],
        ["عقد الإيجار", false],
        ["إثبات التأمين الصحي", false],
      ],
      aiTitle: "توصية ALQEV AI",
      aiText:
        "حمّل عقد الإيجار كخطوة تالية. سأتحقق من توافق العنوان والتواريخ مع طلبك.",
    },
    benefits: [
      {
        icon: "✓",
        title: "أكمل إجراءاتك",
        description:
          "أدر طلباتك ووثائقك وخطواتك التالية في مكان آمن واحد.",
      },
      {
        icon: "◷",
        title: "لا تفوّت المواعيد",
        description:
          "تابع المواعيد والمُهل والوثائق الناقصة في الوقت المناسب.",
      },
      {
        icon: "✦",
        title: "تقدّم بمساعدة AI",
        description:
          "لا تحصل على إجابات فقط، بل على إرشاد واضح للخطوة التالية.",
      },
    ],
  },
  fa: {
    header: {
      homeLabel: "صفحه اصلی ALQEV",
      login: "ورود",
      signup: "ایجاد حساب",
    },
    hero: {
      badge: "یک برنامه برای همه فرایندهای زندگی.",
      headline: "فرایندهای پیچیده زندگی را",
      headlineHighlight: "با اطمینان تکمیل کنید.",
      description:
        "ALQEV سیستم شخصی مدیریت زندگی شماست و به شما کمک می‌کند مدارک، درخواست‌ها، قرارها و امور رسمی را به‌صورت امن مدیریت کنید.",
      primaryAction: "زندگی‌ام را منظم کنم",
      secondaryAction: "چگونه کار می‌کند؟",
    },
    preview: {
      activeProcess: "فرایند فعال",
      title: "درخواست تمدید اجازه اقامت",
      documents: [
        ["کپی گذرنامه", true],
        ["عکس بیومتریک", true],
        ["قرارداد اجاره", false],
        ["گواهی بیمه درمانی", false],
      ],
      aiTitle: "پیشنهاد ALQEV AI",
      aiText:
        "در مرحله بعد قرارداد اجاره را بارگذاری کنید. من بررسی می‌کنم که آدرس و تاریخ‌ها با درخواست شما مطابقت داشته باشند.",
    },
    benefits: [
      {
        icon: "✓",
        title: "فرایندها را کامل کنید",
        description:
          "درخواست‌ها، مدارک و مراحل بعدی را در یک فضای امن مدیریت کنید.",
      },
      {
        icon: "◷",
        title: "قرارها را فراموش نکنید",
        description:
          "قرارها، مهلت‌ها و مدارک ناقص را به‌موقع مشاهده کنید.",
      },
      {
        icon: "✦",
        title: "با AI پیش بروید",
        description:
          "فقط پاسخ نگیرید؛ راهنمای روشن برای قدم بعدی دریافت کنید.",
      },
    ],
  },
};

function detectBrowserLanguage(): SupportedLanguage {
  if (typeof navigator === "undefined") return "de";

  const browserLanguages =
    navigator.languages?.length > 0
      ? navigator.languages
      : [navigator.language];

  for (const browserLanguage of browserLanguages) {
    const languageCode = browserLanguage
      .toLowerCase()
      .split("-")[0] as SupportedLanguage;

    if (
      supportedLanguages.some(
        (language) => language.code === languageCode,
      )
    ) {
      return languageCode;
    }
  }

  return "en";
}

export default function Hero() {
  const [language, setLanguage] =
    useState<SupportedLanguage>("de");

  useEffect(() => {
    const detectedLanguage = detectBrowserLanguage();
    const preferredLanguage = readStoredLanguage(detectedLanguage);
    setLanguage(preferredLanguage);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir =
      language === "ar" || language === "fa" ? "rtl" : "ltr";
  }, [language]);

  function handleLanguageChange(nextLanguage: SupportedLanguage) {
    setLanguage(nextLanguage);
    storeLanguage(nextLanguage);
  }

  const copy = translations[language];
  const isRightToLeft =
    language === "ar" || language === "fa";

  return (
    <main
      className="relative min-h-[100dvh] overflow-x-hidden bg-[#030309] text-white"
      dir={isRightToLeft ? "rtl" : "ltr"}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute left-1/2 top-[-320px] h-[720px] w-[720px] -translate-x-1/2 rounded-full bg-violet-700/12 blur-[180px]" />
        <div className="absolute right-[-240px] top-[24%] h-[580px] w-[580px] rounded-full bg-fuchsia-700/[0.08] blur-[180px]" />
        <div className="absolute bottom-[-340px] left-[-220px] h-[620px] w-[620px] rounded-full bg-violet-800/[0.08] blur-[180px]" />
        <div className="absolute left-1/2 top-[205px] h-[240px] w-[1180px] -translate-x-1/2 rounded-[50%] border-t border-fuchsia-400/20 shadow-[0_-18px_90px_rgba(168,85,247,0.10)]" />
      </div>

      <div className="relative z-10">
        <Header
          homeLabel={copy.header.homeLabel}
          loginLabel={copy.header.login}
          signupLabel={copy.header.signup}
          language={language}
          onLanguageChange={handleLanguageChange}
        />

        <section className="mx-auto grid min-w-0 max-w-7xl gap-12 px-3 pb-20 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-2 lg:items-center lg:gap-16 lg:pb-24 lg:pt-20">
          <HeroContent copy={copy.hero} />
          <ProcessPreview copy={copy.preview} />
        </section>

        <section
          id="how-it-works"
          className="border-t border-white/[0.07] bg-[#06060d]/72 backdrop-blur-xl"
        >
          <div className="mx-auto grid max-w-7xl gap-5 px-3 py-16 sm:px-6 sm:py-20 md:grid-cols-3">
            {copy.benefits.map((benefit) => (
              <article
                key={benefit.title}
                className="group min-w-0 rounded-[1.75rem] border border-white/[0.08] bg-[linear-gradient(145deg,rgba(17,17,28,0.92),rgba(8,8,15,0.96))] p-6 shadow-[0_18px_55px_rgba(0,0,0,0.20)] transition duration-300 hover:-translate-y-1 hover:border-violet-400/30 hover:shadow-[0_22px_65px_rgba(91,33,182,0.14)] sm:p-7"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-xl font-bold text-violet-300 shadow-[0_0_24px_rgba(139,92,246,0.12)]">
                  {benefit.icon}
                </div>

                <h3 className="text-xl font-bold">
                  {benefit.title}
                </h3>

                <p className="mt-3 break-words leading-7 text-zinc-400">
                  {benefit.description}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}