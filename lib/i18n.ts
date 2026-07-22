export const supportedLanguages = [
  "de",
  "en",
  "tr",
  "ru",
  "ar",
  "fa",
] as const;

export type Language = (typeof supportedLanguages)[number];

export const languageNames: Record<Language, string> = {
  de: "Deutsch",
  en: "English",
  tr: "Türkçe",
  ru: "Русский",
  ar: "العربية",
  fa: "فارسی",
};

export const rtlLanguages: Language[] = ["ar", "fa"];

export function isSupportedLanguage(
  value: string,
): value is Language {
  return supportedLanguages.includes(value as Language);
}

export function isRtlLanguage(language: Language): boolean {
  return rtlLanguages.includes(language);
}

export const translations = {
  tr: {
    common: {
      login: "Giriş yap",
      signup: "Hesap oluştur",
      logout: "Çıkış yap",
      loading: "Yükleniyor...",
      save: "Kaydet",
      cancel: "İptal",
      continue: "Devam et",
      back: "Geri",
      language: "Dil",
      country: "Ülke",
      profile: "Profil",
      freePlan: "Ücretsiz plan",
    },
    dashboard: {
      personalDashboard: "Kişisel Panel",
      dailyLifeCenter: "Günlük yaşam merkezi",
      welcome: "Hoş geldin",
      description:
        "Bugünkü önceliklerini, eksik belgelerini ve yaklaşan tarihlerini tek ekrandan yönet.",
      newProcess: "Yeni süreç başlat",
      viewProcesses: "Süreçlerimi görüntüle",
      activeProcesses: "Aktif süreçler",
      documents: "Belgeler",
      criticalTasks: "Kritik görevler",
      missingDocuments: "Eksik belgeler",
      aiReadiness: "AI hazırlık analizi",
      todaysPriorities: "Bugünkü önceliklerin",
      nextStep: "Sonraki adım",
      riskAnalysis: "Risk analizi",
      estimatedPreparation: "Tahmini hazırlık",
      upcomingDate: "Yaklaşan önemli tarih",
    },
  },

  de: {
    common: {
      login: "Anmelden",
      signup: "Konto erstellen",
      logout: "Abmelden",
      loading: "Wird geladen...",
      save: "Speichern",
      cancel: "Abbrechen",
      continue: "Weiter",
      back: "Zurück",
      language: "Sprache",
      country: "Land",
      profile: "Profil",
      freePlan: "Kostenloser Tarif",
    },
    dashboard: {
      personalDashboard: "Persönliches Dashboard",
      dailyLifeCenter: "Zentrale für den Alltag",
      welcome: "Willkommen",
      description:
        "Verwalte deine heutigen Prioritäten, fehlenden Dokumente und bevorstehenden Termine an einem Ort.",
      newProcess: "Neuen Vorgang starten",
      viewProcesses: "Meine Vorgänge anzeigen",
      activeProcesses: "Aktive Vorgänge",
      documents: "Dokumente",
      criticalTasks: "Kritische Aufgaben",
      missingDocuments: "Fehlende Dokumente",
      aiReadiness: "KI-Bereitschaftsanalyse",
      todaysPriorities: "Deine heutigen Prioritäten",
      nextStep: "Nächster Schritt",
      riskAnalysis: "Risikoanalyse",
      estimatedPreparation: "Geschätzte Vorbereitung",
      upcomingDate: "Nächster wichtiger Termin",
    },
  },

  en: {
    common: {
      login: "Sign in",
      signup: "Create account",
      logout: "Sign out",
      loading: "Loading...",
      save: "Save",
      cancel: "Cancel",
      continue: "Continue",
      back: "Back",
      language: "Language",
      country: "Country",
      profile: "Profile",
      freePlan: "Free plan",
    },
    dashboard: {
      personalDashboard: "Personal Dashboard",
      dailyLifeCenter: "Daily life center",
      welcome: "Welcome",
      description:
        "Manage today’s priorities, missing documents and upcoming deadlines from one place.",
      newProcess: "Start a new process",
      viewProcesses: "View my processes",
      activeProcesses: "Active processes",
      documents: "Documents",
      criticalTasks: "Critical tasks",
      missingDocuments: "Missing documents",
      aiReadiness: "AI readiness analysis",
      todaysPriorities: "Today’s priorities",
      nextStep: "Next step",
      riskAnalysis: "Risk analysis",
      estimatedPreparation: "Estimated preparation",
      upcomingDate: "Upcoming important date",
    },
  },

  ru: {
    common: {
      login: "Войти",
      signup: "Создать аккаунт",
      logout: "Выйти",
      loading: "Загрузка...",
      save: "Сохранить",
      cancel: "Отмена",
      continue: "Продолжить",
      back: "Назад",
      language: "Язык",
      country: "Страна",
      profile: "Профиль",
      freePlan: "Бесплатный тариф",
    },
    dashboard: {
      personalDashboard: "Личная панель",
      dailyLifeCenter: "Центр повседневных дел",
      welcome: "Добро пожаловать",
      description:
        "Управляйте сегодняшними приоритетами, недостающими документами и предстоящими сроками в одном месте.",
      newProcess: "Начать новый процесс",
      viewProcesses: "Мои процессы",
      activeProcesses: "Активные процессы",
      documents: "Документы",
      criticalTasks: "Критические задачи",
      missingDocuments: "Недостающие документы",
      aiReadiness: "Анализ готовности AI",
      todaysPriorities: "Приоритеты на сегодня",
      nextStep: "Следующий шаг",
      riskAnalysis: "Анализ рисков",
      estimatedPreparation: "Оценка подготовки",
      upcomingDate: "Ближайшая важная дата",
    },
  },

  ar: {
    common: {
      login: "تسجيل الدخول",
      signup: "إنشاء حساب",
      logout: "تسجيل الخروج",
      loading: "جارٍ التحميل...",
      save: "حفظ",
      cancel: "إلغاء",
      continue: "متابعة",
      back: "رجوع",
      language: "اللغة",
      country: "البلد",
      profile: "الملف الشخصي",
      freePlan: "الخطة المجانية",
    },
    dashboard: {
      personalDashboard: "لوحة التحكم الشخصية",
      dailyLifeCenter: "مركز الحياة اليومية",
      welcome: "مرحبًا",
      description:
        "أدر أولوياتك اليومية والمستندات الناقصة والمواعيد القادمة من مكان واحد.",
      newProcess: "بدء إجراء جديد",
      viewProcesses: "عرض إجراءاتي",
      activeProcesses: "الإجراءات النشطة",
      documents: "المستندات",
      criticalTasks: "المهام الحرجة",
      missingDocuments: "المستندات الناقصة",
      aiReadiness: "تحليل الجاهزية بالذكاء الاصطناعي",
      todaysPriorities: "أولويات اليوم",
      nextStep: "الخطوة التالية",
      riskAnalysis: "تحليل المخاطر",
      estimatedPreparation: "مدة التحضير المتوقعة",
      upcomingDate: "الموعد المهم القادم",
    },
  },

  fa: {
    common: {
      login: "ورود",
      signup: "ایجاد حساب",
      logout: "خروج",
      loading: "در حال بارگذاری...",
      save: "ذخیره",
      cancel: "لغو",
      continue: "ادامه",
      back: "بازگشت",
      language: "زبان",
      country: "کشور",
      profile: "پروفایل",
      freePlan: "طرح رایگان",
    },
    dashboard: {
      personalDashboard: "داشبورد شخصی",
      dailyLifeCenter: "مرکز امور روزمره",
      welcome: "خوش آمدید",
      description:
        "اولویت‌های امروز، مدارک ناقص و تاریخ‌های پیش رو را از یک مکان مدیریت کنید.",
      newProcess: "شروع فرایند جدید",
      viewProcesses: "مشاهده فرایندهای من",
      activeProcesses: "فرایندهای فعال",
      documents: "مدارک",
      criticalTasks: "وظایف مهم",
      missingDocuments: "مدارک ناقص",
      aiReadiness: "تحلیل آمادگی هوش مصنوعی",
      todaysPriorities: "اولویت‌های امروز",
      nextStep: "مرحله بعدی",
      riskAnalysis: "تحلیل ریسک",
      estimatedPreparation: "زمان تقریبی آماده‌سازی",
      upcomingDate: "تاریخ مهم بعدی",
    },
  },
} as const;

export function getTranslations(language: Language) {
  return translations[language];
}