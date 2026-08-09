"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  doc,
  getDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { normalizeSubscriptionPlan } from "@/lib/subscription";
import {
  isRtlLanguage,
  readStoredLanguage,
  type Language,
} from "@/lib/i18n";

type SubscriptionPlan = "free" | "premium";

const subscribeToStoredLanguage = () => () => {};
const getStoredLanguageSnapshot = (): Language => readStoredLanguage("tr");
const getServerLanguageSnapshot = (): Language => "tr";

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
    manageSubscription: "Aboneliğimi yönet",
    portalOpening: "Abonelik portalı açılıyor...",
    portalError: "Abonelik portalı açılamadı. Lütfen tekrar dene.",
    earlyAccessRequest: "Premium’a geç",
    createForPremium: "Premium için hesap oluştur",
    earlyAccessHint:
      "Güvenli ödeme Stripe üzerinden gerçekleştirilir. Aboneliğini dilediğin zaman yönetebilirsin.",
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
    saving: "Stripe açılıyor...",
    sendRequest: "Erken erişim talebi gönder",
    loginRequired:
      "Premium erken erişim talebi oluşturmak için önce hesabına giriş yapmalısın.",
    requestError: "Ödeme sayfası açılamadı. Lütfen tekrar dene.",
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
    manageSubscription: "Abo verwalten",
    portalOpening: "Abo-Portal wird geöffnet...",
    portalError: "Das Abo-Portal konnte nicht geöffnet werden. Bitte versuche es erneut.",
    earlyAccessRequest: "Premium abonnieren",
    createForPremium: "Konto für Premium erstellen",
    earlyAccessHint:
      "Die sichere Zahlung erfolgt über Stripe. Du kannst dein Abo jederzeit verwalten.",
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
    saving: "Stripe wird geöffnet...",
    sendRequest: "Frühzugang anfragen",
    loginRequired:
      "Bitte melde dich an, um Premium-Frühzugang anzufragen.",
    requestError:
      "Die Zahlungsseite konnte nicht geöffnet werden. Bitte versuche es erneut.",
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
    manageSubscription: "Manage subscription",
    portalOpening: "Opening subscription portal...",
    portalError: "The subscription portal could not be opened. Please try again.",
    earlyAccessRequest: "Subscribe to Premium",
    createForPremium: "Create an account for Premium",
    earlyAccessHint:
      "Secure payment is handled by Stripe. You can manage your subscription at any time.",
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
    saving: "Opening Stripe...",
    sendRequest: "Send early-access request",
    loginRequired:
      "Please sign in before requesting Premium early access.",
    requestError:
      "The payment page could not be opened. Please try again.",
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
    manageSubscription: "Управлять подпиской",
    portalOpening: "Открывается портал подписки...",
    portalError: "Не удалось открыть портал подписки. Повторите попытку.",
    earlyAccessRequest: "Подключить Premium",
    createForPremium: "Создать аккаунт для Premium",
    earlyAccessHint:
      "Безопасная оплата проводится через Stripe. Подпиской можно управлять в любое время.",
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
    saving: "Открывается Stripe...",
    sendRequest: "Отправить запрос на ранний доступ",
    loginRequired:
      "Сначала войдите в аккаунт, чтобы запросить ранний доступ Premium.",
    requestError:
      "Не удалось открыть страницу оплаты. Повторите попытку.",
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
    manageSubscription: "إدارة الاشتراك",
    portalOpening: "جارٍ فتح بوابة الاشتراك...",
    portalError: "تعذر فتح بوابة الاشتراك. يرجى المحاولة مرة أخرى.",
    earlyAccessRequest: "الاشتراك في Premium",
    createForPremium: "إنشاء حساب لـ Premium",
    earlyAccessHint:
      "تتم عملية الدفع الآمنة عبر Stripe، ويمكنك إدارة اشتراكك في أي وقت.",
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
    saving: "جارٍ فتح Stripe...",
    sendRequest: "إرسال طلب الوصول المبكر",
    loginRequired:
      "يرجى تسجيل الدخول أولاً لطلب الوصول المبكر إلى Premium.",
    requestError:
      "تعذر فتح صفحة الدفع. يرجى المحاولة مرة أخرى.",
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
    manageSubscription: "مدیریت اشتراک",
    portalOpening: "در حال باز کردن پرتال اشتراک...",
    portalError: "پرتال اشتراک باز نشد. دوباره تلاش کنید.",
    earlyAccessRequest: "اشتراک Premium",
    createForPremium: "ایجاد حساب برای Premium",
    earlyAccessHint:
      "پرداخت امن از طریق Stripe انجام می‌شود و می‌توانید اشتراک را هر زمان مدیریت کنید.",
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
    saving: "در حال باز کردن Stripe...",
    sendRequest: "ارسال درخواست دسترسی زودهنگام",
    loginRequired:
      "برای درخواست دسترسی زودهنگام Premium ابتدا وارد شوید.",
    requestError:
      "صفحه پرداخت باز نشد. دوباره تلاش کنید.",
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
  const language = useSyncExternalStore(
    subscribeToStoredLanguage,
    getStoredLanguageSnapshot,
    getServerLanguageSnapshot,
  );
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] =
    useState<SubscriptionPlan>("free");
  const [isLoading, setIsLoading] = useState(true);

  const [isRequesting, setIsRequesting] = useState(false);
  const [isPortalOpening, setIsPortalOpening] = useState(false);
  const [requestError, setRequestError] = useState("");

 
  
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

  async function handleCheckout() {
    setRequestError("");

    if (!user) {
      setRequestError(
        currentCopy.loginRequired,
      );
      return;
    }

    try {
      setIsRequesting(true);

      const idToken =
        await user.getIdToken(true);

      const response = await fetch(
        "/api/stripe/checkout",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            language,
          }),
        },
      );

      const payload = (await response.json()) as {
        success?: boolean;
        url?: string;
        error?: string;
      };

      if (
        !response.ok ||
        !payload.success ||
        !payload.url
      ) {
        throw new Error(
          payload.error ||
            currentCopy.requestError,
        );
      }

      window.location.assign(payload.url);
    } catch (error) {
      console.error(
        "Stripe Checkout başlatılamadı:",
        error,
      );

      setRequestError(
        error instanceof Error
          ? error.message
          : currentCopy.requestError,
      );
      setIsRequesting(false);
    }
  }

  async function handlePortal() {
    setRequestError("");

    if (!user) {
      setRequestError(
        currentCopy.loginRequired,
      );
      return;
    }

    try {
      setIsPortalOpening(true);

      const idToken =
        await user.getIdToken(true);

      const response = await fetch(
        "/api/stripe/portal",
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${idToken}`,
          },
        },
      );

      const payload = (await response.json()) as {
        url?: string;
        error?: string;
      };

      if (
        !response.ok ||
        !payload.url
      ) {
        throw new Error(
          payload.error ||
            currentCopy.portalError,
        );
      }

      window.location.assign(payload.url);
    } catch (error) {
      console.error(
        "Stripe Customer Portal açılamadı:",
        error,
      );

      setRequestError(
        error instanceof Error
          ? error.message
          : currentCopy.portalError,
      );
      setIsPortalOpening(false);
    }
  }

  const isPremium = subscription === "premium"
  const currentCopy = copy[language];
  const direction = isRtlLanguage(language)
    ? "rtl"
    : "ltr";

  return (
    <main dir={direction} className="relative min-h-[100dvh] overflow-x-hidden bg-[#030309] px-3 py-6 text-white sm:px-6 sm:py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute left-1/2 top-[-300px] h-[680px] w-[680px] -translate-x-1/2 rounded-full bg-violet-700/12 blur-[175px]" />
        <div className="absolute right-[-240px] top-[28%] h-[580px] w-[580px] rounded-full bg-fuchsia-700/[0.08] blur-[180px]" />
        <div className="absolute bottom-[-320px] left-[-220px] h-[620px] w-[620px] rounded-full bg-violet-800/[0.08] blur-[180px]" />
        <div className="absolute left-1/2 top-[170px] h-[230px] w-[1100px] -translate-x-1/2 rounded-[50%] border-t border-fuchsia-400/25 shadow-[0_-18px_80px_rgba(168,85,247,0.12)]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <header className="flex min-w-0 flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <Link
            href={user ? "/dashboard" : "/"}
            className="inline-flex min-w-0 items-center gap-3"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-violet-400/25 bg-[radial-gradient(circle_at_30%_25%,rgba(217,70,239,0.55),rgba(124,58,237,0.28)_45%,rgba(9,9,17,0.92)_75%)] text-lg font-black text-white shadow-[0_0_28px_rgba(139,92,246,0.20)]">
              A
            </span>

            <span className="min-w-0">
              <span className="block font-bold tracking-[0.16em] text-white">
                ALQEV
              </span>
              <span className="block text-xs text-zinc-500">
                Premium
              </span>
            </span>
          </Link>

          <Link
            href={user ? "/dashboard" : "/login"}
            className="inline-flex w-full items-center justify-center rounded-xl border border-white/[0.08] bg-[#090911]/75 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:border-violet-400/30 hover:bg-violet-400/[0.05] sm:w-auto"
          >
            {user ? currentCopy.backDashboard : currentCopy.login}
          </Link>
        </header>

        <section className="mx-auto mt-12 max-w-3xl text-center sm:mt-16">
          <div className="inline-flex rounded-full border border-violet-400/20 bg-violet-400/10 px-4 py-2 text-sm font-semibold tracking-[0.16em] text-violet-200">
            ALQEV PREMIUM
          </div>

          <h1 className="mt-6 break-words text-[2.35rem] font-black leading-[1.05] tracking-tight sm:text-6xl">
            {currentCopy.heroTitle}
          </h1>

          <p className="mx-auto mt-5 max-w-2xl break-words text-base leading-7 text-zinc-400 sm:text-lg">
{currentCopy.heroText}
          </p>

          {isLoading ? (
            <p className="mt-5 text-sm text-zinc-500">
              {currentCopy.loadingPlan}
            </p>
          ) : isPremium ? (
            <div className="mx-auto mt-6 max-w-md rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.07] px-5 py-4 text-sm font-semibold text-emerald-200">
              {currentCopy.premiumActive}
            </div>
          ) : null}
        </section>

        <section className="mt-12 grid min-w-0 gap-6 lg:grid-cols-2 sm:mt-14">
          <article className="min-w-0 rounded-[2rem] border border-white/[0.08] bg-[linear-gradient(145deg,rgba(17,17,28,0.94),rgba(8,8,15,0.97))] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)] sm:p-8 lg:p-9">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 sm:flex-nowrap sm:gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  {currentCopy.starter}
                </p>

                <h2 className="mt-3 text-3xl font-bold">
                  Free
                </h2>
              </div>

              {!isPremium ? (
                <span className="rounded-full border border-white/10 bg-[#151522] px-3 py-1 text-xs font-semibold text-zinc-300">
                  {currentCopy.currentPlan}
                </span>
              ) : null}
            </div>

            <div className="mt-7">
              <span className="text-4xl font-black sm:text-5xl">0 €</span>
              <span className="ms-2 text-zinc-500">
                {currentCopy.perMonth}
              </span>
            </div>

            <p className="mt-5 text-sm leading-6 text-zinc-400">
{currentCopy.freeDescription}
            </p>

            <ul className="mt-8 space-y-4">
              {currentCopy.freeFeatures.map((feature) => (
                <li
                  key={feature}
                  className="flex min-w-0 items-start gap-3 text-sm text-zinc-300"
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
              className="mt-9 inline-flex w-full items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 py-3.5 text-sm font-semibold text-zinc-200 transition hover:border-violet-400/25 hover:bg-violet-400/[0.05]"
            >
              {user ? currentCopy.useFree : currentCopy.startFree}
            </Link>
          </article>

          <article className="relative min-w-0 overflow-hidden rounded-[2rem] border border-violet-400/30 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.24),transparent_46%),radial-gradient(circle_at_bottom_right,rgba(217,70,239,0.12),transparent_42%),linear-gradient(145deg,rgba(19,16,35,0.97),rgba(8,8,15,0.98))] p-5 shadow-[0_28px_90px_rgba(91,33,182,0.22)] sm:p-8 lg:p-9">
            <div className="mb-5 inline-flex rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 px-3 py-1 text-xs font-bold text-[#030309] sm:absolute sm:right-5 sm:top-5 sm:mb-0">
              {currentCopy.recommended}
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-300">
                {currentCopy.professional}
              </p>

              <h2 className="mt-3 text-3xl font-bold">
                Premium
              </h2>
            </div>

            <div className="mt-7">
              <span className="break-words text-4xl font-black sm:text-5xl">
                12,90 €
              </span>
              <span className="ms-2 text-zinc-400">
                {currentCopy.perMonth}
              </span>
            </div>

            <p className="mt-5 text-sm leading-6 text-zinc-300">
{currentCopy.premiumDescription}
            </p>

            <ul className="mt-8 space-y-4">
              {currentCopy.premiumFeatures.map((feature) => (
                <li
                  key={feature}
                  className="flex min-w-0 items-start gap-3 text-sm text-zinc-200"
                >
                  <span className="mt-0.5 text-violet-300">
                    ✓
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {isPremium ? (
              <button
                type="button"
                disabled={isPortalOpening}
                onClick={handlePortal}
                className="mt-9 flex w-full items-center justify-center rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(16,185,129,0.14)] transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPortalOpening
                  ? currentCopy.portalOpening
                  : currentCopy.manageSubscription}
              </button>
            ) : user ? (
              <button
                type="button"
                disabled={isRequesting}
                onClick={handleCheckout}
                className="mt-9 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 px-5 py-3.5 text-sm font-bold text-white shadow-[0_12px_34px_rgba(139,92,246,0.24)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRequesting
                  ? currentCopy.saving
                  : currentCopy.earlyAccessRequest}
              </button>
            ) : (
              <Link
                href="/signup"
                className="mt-9 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 px-5 py-3.5 text-sm font-bold text-white shadow-[0_12px_34px_rgba(139,92,246,0.24)] transition hover:brightness-110"
              >
                {currentCopy.createForPremium}
              </Link>
            )}

            {!isPremium ? (
              <p className="mt-3 text-center text-xs text-zinc-500">
{currentCopy.earlyAccessHint}
              </p>
            ) : null}

            {requestError ? (
              <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.08] px-4 py-3 text-sm text-red-200">
                {requestError}
              </div>
            ) : null}
          </article>
        </section>

        <section className="mt-12 min-w-0 rounded-[2rem] border border-white/[0.08] bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.08),transparent_55%),linear-gradient(145deg,rgba(17,17,28,0.90),rgba(8,8,15,0.94))] p-5 text-center shadow-[0_18px_55px_rgba(0,0,0,0.20)] sm:p-9">
          <h2 className="text-2xl font-bold">
            {currentCopy.whyPremium}
          </h2>

          <p className="mx-auto mt-4 max-w-3xl break-words text-sm leading-7 text-zinc-400">
{currentCopy.whyPremiumText}
          </p>
        </section>
      </div>

    </main>
  );
}