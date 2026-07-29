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
import {
  isRtlLanguage,
  readStoredLanguage,
  type Language,
} from "@/lib/i18n";

type SubscriptionPlan = "free" | "premium";

const copy = {
  tr: {
    backDashboard: "Dashboard'a dön",
    login: "Giriş yap",
    heroTitle: "Süreçlerini sınırsız yönet.",
    heroText:
      "Belgelerini, resmî işlemlerini ve yapay zekâ destekli hazırlık planını tek yerde yönet. Premium ile tüm limitleri kaldır.",
    loadingPlan: "Plan bilgileri yükleniyor...",
    premiumActive: "Premium planın aktif.",
    starter: "Başlangıç",
    currentPlan: "Mevcut plan",
    perMonth: "/ ay",
    freeDescription:
      "ALQEV'i denemek ve temel sürecini yönetmek için.",
    useFree: "Ücretsiz planı kullan",
    startFree: "Ücretsiz başla",
    recommended: "ÖNERİLEN",
    professional: "Profesyonel",
    premiumDescription:
      "Süreçlerini sınırsız yönetmek ve ALQEV AI'ın gelişmiş özelliklerini kullanmak için.",
    premiumActiveShort: "Premium aktif",
    earlyAccessRequest: "Premium erken erişim talebi oluştur",
    createForPremium: "Premium için hesap oluştur",
    earlyAccessHint:
      "Güvenli ödeme sistemi açıldığında erken erişim kullanıcılarına öncelik verilecek.",
    whyPremium: "Neden ALQEV Premium?",
    whyPremiumText:
      "Premium yalnızca daha yüksek kullanım limiti sunmaz. Belgelerini daha ayrıntılı analiz eder, eksiklerini önceliklendirir ve süreçlerin için kişiselleştirilmiş bir yol haritası oluşturur.",
    modalLabel: "Premium erken erişim",
    requestReceived: "Talebin alındı",
    requestReceivedText:
      "Premium ödeme sistemi aktif olduğunda sana öncelikli olarak haber vereceğiz.",
    okay: "Tamam",
    joinWaitlist: "Bekleme listesine katıl",
    waitlistText:
      "Ödeme sistemi aktif olduğunda ilk bilgilendirilen kullanıcılardan biri ol. Talep şu hesap adına kaydedilecek:",
    emailMissing: "E-posta bilgisi bulunamadı",
    cancel: "İptal",
    saving: "Kaydediliyor...",
    sendRequest: "Erken erişim talebi gönder",
    loginRequired:
      "Premium erken erişim talebi oluşturmak için önce hesabına giriş yapmalısın.",
    requestError: "Talebin kaydedilemedi. Lütfen tekrar dene.",
    freeFeatures: [
      "1 aktif süreç",
      "Temel belge yönetimi",
      "Ayda 10 OCR analizi",
      "Günde 20 AI Copilot mesajı",
      "Temel AI hazırlık analizi",
    ],
    premiumFeatures: [
      "Sınırsız aktif süreç",
      "AI Risk Analizi",
      "Kişiselleştirilmiş AI yol haritası",
      "Öncelikli AI önerileri",
      "Sınırsız OCR",
      "Sınırsız AI Copilot",
      "Gelişmiş belge analizi",
      "Erken erişim özellikleri",
    ],
  },
  de: {
    backDashboard: "Zurück zum Dashboard",
    login: "Anmelden",
    heroTitle: "Verwalte deine Vorgänge ohne Grenzen.",
    heroText:
      "Verwalte Dokumente, Behördenvorgänge und KI-gestützte Vorbereitung an einem Ort. Mit Premium entfallen alle Limits.",
    loadingPlan: "Tarif wird geladen...",
    premiumActive: "Dein Premium-Tarif ist aktiv.",
    starter: "Einstieg",
    currentPlan: "Aktueller Tarif",
    perMonth: "/ Monat",
    freeDescription:
      "Zum Testen von ALQEV und Verwalten deines grundlegenden Vorgangs.",
    useFree: "Kostenlosen Tarif nutzen",
    startFree: "Kostenlos starten",
    recommended: "EMPFOHLEN",
    professional: "Professionell",
    premiumDescription:
      "Für unbegrenzte Vorgänge und die erweiterten Funktionen von ALQEV AI.",
    premiumActiveShort: "Premium aktiv",
    earlyAccessRequest: "Premium-Frühzugang anfragen",
    createForPremium: "Konto für Premium erstellen",
    earlyAccessHint:
      "Frühzugangsnutzer werden bevorzugt, sobald das sichere Zahlungssystem verfügbar ist.",
    whyPremium: "Warum ALQEV Premium?",
    whyPremiumText:
      "Premium bietet nicht nur höhere Nutzungslimits. Dokumente werden detaillierter analysiert, Lücken priorisiert und eine persönliche Roadmap erstellt.",
    modalLabel: "Premium-Frühzugang",
    requestReceived: "Anfrage erhalten",
    requestReceivedText:
      "Sobald das Premium-Zahlungssystem aktiv ist, informieren wir dich bevorzugt.",
    okay: "Okay",
    joinWaitlist: "Warteliste beitreten",
    waitlistText:
      "Sei unter den ersten Informierten, sobald das Zahlungssystem aktiv ist. Die Anfrage wird für dieses Konto gespeichert:",
    emailMissing: "Keine E-Mail-Adresse gefunden",
    cancel: "Abbrechen",
    saving: "Wird gespeichert...",
    sendRequest: "Frühzugang anfragen",
    loginRequired:
      "Bitte melde dich an, um Premium-Frühzugang anzufragen.",
    requestError:
      "Die Anfrage konnte nicht gespeichert werden. Bitte versuche es erneut.",
    freeFeatures: [
      "1 aktiver Vorgang",
      "Grundlegende Dokumentenverwaltung",
      "10 OCR-Analysen pro Monat",
      "20 AI-Copilot-Nachrichten pro Tag",
      "Grundlegende KI-Bereitschaftsanalyse",
    ],
    premiumFeatures: [
      "Unbegrenzte aktive Vorgänge",
      "KI-Risikoanalyse",
      "Personalisierte KI-Roadmap",
      "Priorisierte KI-Empfehlungen",
      "Unbegrenztes OCR",
      "Unbegrenzter AI Copilot",
      "Erweiterte Dokumentenanalyse",
      "Frühzugangsfunktionen",
    ],
  },
  en: {
    backDashboard: "Back to dashboard",
    login: "Sign in",
    heroTitle: "Manage your processes without limits.",
    heroText:
      "Manage documents, official procedures, and AI-supported preparation in one place. Premium removes all limits.",
    loadingPlan: "Loading plan information...",
    premiumActive: "Your Premium plan is active.",
    starter: "Starter",
    currentPlan: "Current plan",
    perMonth: "/ month",
    freeDescription:
      "For trying ALQEV and managing your core process.",
    useFree: "Use free plan",
    startFree: "Start free",
    recommended: "RECOMMENDED",
    professional: "Professional",
    premiumDescription:
      "For unlimited process management and ALQEV AI's advanced features.",
    premiumActiveShort: "Premium active",
    earlyAccessRequest: "Request Premium early access",
    createForPremium: "Create an account for Premium",
    earlyAccessHint:
      "Early-access users will be prioritized when secure payments become available.",
    whyPremium: "Why ALQEV Premium?",
    whyPremiumText:
      "Premium does more than raise usage limits. It analyzes documents in greater detail, prioritizes gaps, and creates a personalized roadmap.",
    modalLabel: "Premium early access",
    requestReceived: "Request received",
    requestReceivedText:
      "We will notify you with priority when the Premium payment system becomes active.",
    okay: "Okay",
    joinWaitlist: "Join the waitlist",
    waitlistText:
      "Be among the first to be informed when payments become available. The request will be saved for this account:",
    emailMissing: "Email address not found",
    cancel: "Cancel",
    saving: "Saving...",
    sendRequest: "Send early-access request",
    loginRequired:
      "Please sign in before requesting Premium early access.",
    requestError:
      "Your request could not be saved. Please try again.",
    freeFeatures: [
      "1 active process",
      "Basic document management",
      "10 OCR analyses per month",
      "20 AI Copilot messages per day",
      "Basic AI readiness analysis",
    ],
    premiumFeatures: [
      "Unlimited active processes",
      "AI Risk Analysis",
      "Personalized AI roadmap",
      "Prioritized AI recommendations",
      "Unlimited OCR",
      "Unlimited AI Copilot",
      "Advanced document analysis",
      "Early-access features",
    ],
  },
  ru: {
    backDashboard: "Назад к панели",
    login: "Войти",
    heroTitle: "Управляйте процессами без ограничений.",
    heroText:
      "Управляйте документами, официальными процедурами и подготовкой с ИИ в одном месте. Premium снимает все ограничения.",
    loadingPlan: "Загрузка информации о тарифе...",
    premiumActive: "Ваш тариф Premium активен.",
    starter: "Начальный",
    currentPlan: "Текущий тариф",
    perMonth: "/ месяц",
    freeDescription:
      "Чтобы попробовать ALQEV и управлять основным процессом.",
    useFree: "Использовать бесплатный тариф",
    startFree: "Начать бесплатно",
    recommended: "РЕКОМЕНДУЕТСЯ",
    professional: "Профессиональный",
    premiumDescription:
      "Для неограниченного управления процессами и расширенных возможностей ALQEV AI.",
    premiumActiveShort: "Premium активен",
    earlyAccessRequest: "Запросить ранний доступ Premium",
    createForPremium: "Создать аккаунт для Premium",
    earlyAccessHint:
      "Пользователи раннего доступа получат приоритет после запуска безопасной оплаты.",
    whyPremium: "Почему ALQEV Premium?",
    whyPremiumText:
      "Premium не только повышает лимиты. Он глубже анализирует документы, расставляет приоритеты и создаёт персональную дорожную карту.",
    modalLabel: "Ранний доступ Premium",
    requestReceived: "Запрос получен",
    requestReceivedText:
      "Мы сообщим вам в приоритетном порядке после запуска оплаты Premium.",
    okay: "Хорошо",
    joinWaitlist: "Вступить в список ожидания",
    waitlistText:
      "Будьте среди первых, кто узнает о запуске оплаты. Запрос будет сохранён для этого аккаунта:",
    emailMissing: "Адрес электронной почты не найден",
    cancel: "Отмена",
    saving: "Сохранение...",
    sendRequest: "Отправить запрос на ранний доступ",
    loginRequired:
      "Сначала войдите в аккаунт, чтобы запросить ранний доступ Premium.",
    requestError:
      "Не удалось сохранить запрос. Повторите попытку.",
    freeFeatures: [
      "1 активный процесс",
      "Базовое управление документами",
      "10 OCR-анализов в месяц",
      "20 сообщений AI Copilot в день",
      "Базовый анализ готовности ИИ",
    ],
    premiumFeatures: [
      "Неограниченные активные процессы",
      "Анализ рисков ИИ",
      "Персональная дорожная карта ИИ",
      "Приоритетные рекомендации ИИ",
      "Неограниченный OCR",
      "Неограниченный AI Copilot",
      "Расширенный анализ документов",
      "Функции раннего доступа",
    ],
  },
  ar: {
    backDashboard: "العودة إلى لوحة التحكم",
    login: "تسجيل الدخول",
    heroTitle: "أدر إجراءاتك دون حدود.",
    heroText:
      "أدر الوثائق والإجراءات الرسمية وخطة الاستعداد المدعومة بالذكاء الاصطناعي في مكان واحد. يزيل Premium جميع الحدود.",
    loadingPlan: "جارٍ تحميل معلومات الخطة...",
    premiumActive: "خطة Premium الخاصة بك نشطة.",
    starter: "البداية",
    currentPlan: "الخطة الحالية",
    perMonth: "/ شهريًا",
    freeDescription:
      "لتجربة ALQEV وإدارة الإجراء الأساسي.",
    useFree: "استخدام الخطة المجانية",
    startFree: "ابدأ مجانًا",
    recommended: "موصى به",
    professional: "احترافي",
    premiumDescription:
      "لإدارة إجراءات غير محدودة واستخدام مزايا ALQEV AI المتقدمة.",
    premiumActiveShort: "Premium نشط",
    earlyAccessRequest: "طلب الوصول المبكر إلى Premium",
    createForPremium: "إنشاء حساب لـ Premium",
    earlyAccessHint:
      "سيحصل مستخدمو الوصول المبكر على الأولوية عند تفعيل الدفع الآمن.",
    whyPremium: "لماذا ALQEV Premium؟",
    whyPremiumText:
      "لا يرفع Premium حدود الاستخدام فقط، بل يحلل الوثائق بعمق ويحدد الأولويات وينشئ خريطة طريق مخصصة.",
    modalLabel: "الوصول المبكر إلى Premium",
    requestReceived: "تم استلام طلبك",
    requestReceivedText:
      "سنبلغك بأولوية عند تفعيل نظام الدفع لـ Premium.",
    okay: "حسنًا",
    joinWaitlist: "الانضمام إلى قائمة الانتظار",
    waitlistText:
      "كن من أوائل من يتم إبلاغهم عند تفعيل الدفع. سيتم حفظ الطلب باسم هذا الحساب:",
    emailMissing: "لم يتم العثور على البريد الإلكتروني",
    cancel: "إلغاء",
    saving: "جارٍ الحفظ...",
    sendRequest: "إرسال طلب الوصول المبكر",
    loginRequired:
      "يرجى تسجيل الدخول أولاً لطلب الوصول المبكر إلى Premium.",
    requestError:
      "تعذر حفظ الطلب. يرجى المحاولة مرة أخرى.",
    freeFeatures: [
      "إجراء نشط واحد",
      "إدارة أساسية للوثائق",
      "10 تحليلات OCR شهريًا",
      "20 رسالة AI Copilot يوميًا",
      "تحليل أساسي للجاهزية بالذكاء الاصطناعي",
    ],
    premiumFeatures: [
      "إجراءات نشطة غير محدودة",
      "تحليل المخاطر بالذكاء الاصطناعي",
      "خريطة طريق مخصصة بالذكاء الاصطناعي",
      "توصيات ذكاء اصطناعي ذات أولوية",
      "OCR غير محدود",
      "AI Copilot غير محدود",
      "تحليل متقدم للوثائق",
      "ميزات الوصول المبكر",
    ],
  },
  fa: {
    backDashboard: "بازگشت به داشبورد",
    login: "ورود",
    heroTitle: "فرایندهای خود را بدون محدودیت مدیریت کنید.",
    heroText:
      "مدارک، امور رسمی و برنامه آماده‌سازی مبتنی بر هوش مصنوعی را در یک مکان مدیریت کنید. Premium همه محدودیت‌ها را حذف می‌کند.",
    loadingPlan: "در حال بارگذاری اطلاعات طرح...",
    premiumActive: "طرح Premium شما فعال است.",
    starter: "شروع",
    currentPlan: "طرح فعلی",
    perMonth: "/ ماه",
    freeDescription:
      "برای آزمایش ALQEV و مدیریت فرایند اصلی.",
    useFree: "استفاده از طرح رایگان",
    startFree: "شروع رایگان",
    recommended: "پیشنهادشده",
    professional: "حرفه‌ای",
    premiumDescription:
      "برای مدیریت نامحدود فرایندها و استفاده از قابلیت‌های پیشرفته ALQEV AI.",
    premiumActiveShort: "Premium فعال",
    earlyAccessRequest: "درخواست دسترسی زودهنگام Premium",
    createForPremium: "ایجاد حساب برای Premium",
    earlyAccessHint:
      "پس از فعال شدن پرداخت امن، کاربران دسترسی زودهنگام در اولویت خواهند بود.",
    whyPremium: "چرا ALQEV Premium؟",
    whyPremiumText:
      "Premium فقط محدودیت مصرف را افزایش نمی‌دهد؛ مدارک را دقیق‌تر تحلیل، کمبودها را اولویت‌بندی و نقشه راه شخصی ایجاد می‌کند.",
    modalLabel: "دسترسی زودهنگام Premium",
    requestReceived: "درخواست شما دریافت شد",
    requestReceivedText:
      "پس از فعال شدن سیستم پرداخت Premium، در اولویت به شما اطلاع می‌دهیم.",
    okay: "باشه",
    joinWaitlist: "پیوستن به فهرست انتظار",
    waitlistText:
      "با فعال شدن پرداخت، جزو اولین افراد مطلع باشید. درخواست برای این حساب ثبت می‌شود:",
    emailMissing: "ایمیل یافت نشد",
    cancel: "لغو",
    saving: "در حال ذخیره...",
    sendRequest: "ارسال درخواست دسترسی زودهنگام",
    loginRequired:
      "برای درخواست دسترسی زودهنگام Premium ابتدا وارد شوید.",
    requestError:
      "درخواست ذخیره نشد. دوباره تلاش کنید.",
    freeFeatures: [
      "۱ فرایند فعال",
      "مدیریت پایه مدارک",
      "۱۰ تحلیل OCR در ماه",
      "۲۰ پیام AI Copilot در روز",
      "تحلیل پایه آمادگی هوش مصنوعی",
    ],
    premiumFeatures: [
      "فرایندهای فعال نامحدود",
      "تحلیل ریسک هوش مصنوعی",
      "نقشه راه شخصی هوش مصنوعی",
      "پیشنهادهای اولویت‌دار هوش مصنوعی",
      "OCR نامحدود",
      "AI Copilot نامحدود",
      "تحلیل پیشرفته مدارک",
      "قابلیت‌های دسترسی زودهنگام",
    ],
  },
} as const;

export default function PricingPage() {
  const [language] =
  useState<Language>(() =>
    readStoredLanguage("tr"),
  );
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
        currentCopy.loginRequired,
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
        currentCopy.requestError,
      );
    } finally {
      setIsRequesting(false);
    }
  }

  const isPremium = subscription === "premium";
  const currentCopy = copy[language];
  const direction = isRtlLanguage(language)
    ? "rtl"
    : "ltr";

  return (
    <main dir={direction} className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-12 text-white">
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
            {user ? currentCopy.backDashboard : currentCopy.login}
          </Link>
        </header>

        <section className="mx-auto mt-16 max-w-3xl text-center">
          <div className="inline-flex rounded-full border border-indigo-400/20 bg-indigo-400/10 px-4 py-2 text-sm font-semibold text-indigo-200">
            ALQEV PREMIUM
          </div>

          <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-6xl">
            {currentCopy.heroTitle}
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
{currentCopy.heroText}
          </p>

          {isLoading ? (
            <p className="mt-5 text-sm text-slate-500">
              {currentCopy.loadingPlan}
            </p>
          ) : isPremium ? (
            <div className="mx-auto mt-6 max-w-md rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.07] px-5 py-4 text-sm font-semibold text-emerald-200">
              {currentCopy.premiumActive}
            </div>
          ) : null}
        </section>

        <section className="mt-14 grid gap-6 lg:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-7 sm:p-9">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {currentCopy.starter}
                </p>

                <h2 className="mt-3 text-3xl font-bold">
                  Free
                </h2>
              </div>

              {!isPremium ? (
                <span className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
                  {currentCopy.currentPlan}
                </span>
              ) : null}
            </div>

            <div className="mt-7">
              <span className="text-5xl font-black">0 €</span>
              <span className="ml-2 text-slate-500">
                {currentCopy.perMonth}
              </span>
            </div>

            <p className="mt-5 text-sm leading-6 text-slate-400">
{currentCopy.freeDescription}
            </p>

            <ul className="mt-8 space-y-4">
              {currentCopy.freeFeatures.map((feature) => (
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
              {user ? currentCopy.useFree : currentCopy.startFree}
            </Link>
          </article>

          <article className="relative overflow-hidden rounded-3xl border border-indigo-400/30 bg-gradient-to-br from-indigo-500/[0.18] via-white/[0.045] to-cyan-500/[0.08] p-7 shadow-2xl shadow-indigo-950/30 sm:p-9">
            <div className="absolute right-5 top-5 rounded-full bg-indigo-400 px-3 py-1 text-xs font-bold text-slate-950">
              {currentCopy.recommended}
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-300">
                {currentCopy.professional}
              </p>

              <h2 className="mt-3 text-3xl font-bold">
                Premium
              </h2>
            </div>

            <div className="mt-7">
              <span className="text-5xl font-black">
                9,90 €
              </span>
              <span className="ml-2 text-slate-400">
                {currentCopy.perMonth}
              </span>
            </div>

            <p className="mt-5 text-sm leading-6 text-slate-300">
{currentCopy.premiumDescription}
            </p>

            <ul className="mt-8 space-y-4">
              {currentCopy.premiumFeatures.map((feature) => (
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
                {currentCopy.premiumActiveShort}
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
                {currentCopy.earlyAccessRequest}
              </button>
            ) : (
              <Link
                href="/signup"
                className="mt-9 flex w-full items-center justify-center rounded-xl bg-indigo-500 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-400"
              >
                {currentCopy.createForPremium}
              </Link>
            )}

            {!isPremium ? (
              <p className="mt-3 text-center text-xs text-slate-500">
{currentCopy.earlyAccessHint}
              </p>
            ) : null}
          </article>
        </section>

        <section className="mt-12 rounded-3xl border border-white/10 bg-white/[0.03] p-7 text-center sm:p-9">
          <h2 className="text-2xl font-bold">
            {currentCopy.whyPremium}
          </h2>

          <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-slate-400">
{currentCopy.whyPremiumText}
          </p>
        </section>
      </div>

      {isModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={currentCopy.modalLabel}
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
                  {currentCopy.requestReceived}
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-400">
{currentCopy.requestReceivedText}
                </p>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                >
                  {currentCopy.okay}
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
                  {currentCopy.modalLabel}
                </p>

                <h2 className="mt-3 text-2xl font-bold">
                  {currentCopy.joinWaitlist}
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-400">
{currentCopy.waitlistText}
                </p>

                <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-slate-200">
                  {user?.email || currentCopy.emailMissing}
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
                    {currentCopy.cancel}
                  </button>

                  <button
                    type="submit"
                    disabled={isRequesting}
                    className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-indigo-500 px-5 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isRequesting
                      ? currentCopy.saving
                      : currentCopy.sendRequest}
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