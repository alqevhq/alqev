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

export const LANGUAGE_STORAGE_KEY = "humanity-language";

export function isSupportedLanguage(
  value: string,
): value is Language {
  return supportedLanguages.includes(value as Language);
}

export function isRtlLanguage(language: Language): boolean {
  return rtlLanguages.includes(language);
}

export function readStoredLanguage(
  fallback: Language = "tr",
): Language {
  if (typeof window === "undefined") {
    return fallback;
  }

  const storedLanguage = window.localStorage.getItem(
    LANGUAGE_STORAGE_KEY,
  );

  return storedLanguage &&
    isSupportedLanguage(storedLanguage)
    ? storedLanguage
    : fallback;
}

export function storeLanguage(language: Language): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    LANGUAGE_STORAGE_KEY,
    language,
  );

  document.documentElement.lang = language;
  document.documentElement.dir = isRtlLanguage(language)
    ? "rtl"
    : "ltr";
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
    newProcess: {
      loading: "Süreç seçenekleri hazırlanıyor...",
      backToProcesses: "Süreçlere dön",
      title: "Yeni süreç başlat",
      description:
        "Süreç türünü seç. ALQEV gerekli belge listesini otomatik oluştursun ve ilerlemeyi takip etsin.",
      freeLimit: "FREE PLAN LİMİTİ",
      limitReached: "Mevcut süreç limitine ulaştın",
      limitDescription:
        "Free planında en fazla 1 süreç oluşturabilirsin. Yeni bir süreç başlatmak ve tüm süreçlerini aynı anda yönetmek için Premium plana geç.",
      upgrade: "Premium'a yükselt",
      returnToCurrent: "Mevcut sürece dön",
      processType: "1. Süreç türü",
      deadline: "Hedef tarih",
      optional: "isteğe bağlı",
      notes: "Notlar",
      notesPlaceholder:
        "Bu süreçle ilgili önemli bilgileri ekle...",
      generatedDocuments:
        "Otomatik oluşturulacak belge listesi",
      requiredDocument: "Zorunlu belge",
      conditionalDocument: "Duruma göre gerekli",
      creating: "Süreç oluşturuluyor...",
      start: "Süreci başlat",
      noSession:
        "Oturum bulunamadı. Lütfen tekrar giriş yap.",
      freeLimitError:
        "Free planında en fazla 1 süreç oluşturabilirsin. Yeni bir süreç başlatmak için Premium plana geçmelisin.",
      selectProcess: "Lütfen bir süreç türü seç.",
      selectCountry:
        "Lütfen sürecin yürütüleceği ülkeyi seç.",
      loadError:
        "Plan ve süreç bilgileri yüklenemedi. Lütfen sayfayı yenileyip tekrar dene.",
      createError:
        "Süreç oluşturulamadı. Lütfen tekrar dene.",
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
    newProcess: {
      loading: "Vorgangsoptionen werden vorbereitet...",
      backToProcesses: "Zurück zu den Vorgängen",
      title: "Neuen Vorgang starten",
      description:
        "Wähle einen Vorgangstyp. ALQEV erstellt automatisch die Dokumentenliste und verfolgt den Fortschritt.",
      freeLimit: "LIMIT DES KOSTENLOSEN TARIFS",
      limitReached: "Du hast dein Vorgangslimit erreicht",
      limitDescription:
        "Im kostenlosen Tarif kannst du höchstens einen Vorgang erstellen. Wechsle zu Premium, um weitere Vorgänge gleichzeitig zu verwalten.",
      upgrade: "Auf Premium upgraden",
      returnToCurrent: "Zum aktuellen Vorgang",
      processType: "1. Vorgangstyp",
      deadline: "Frist",
      optional: "optional",
      notes: "Notizen",
      notesPlaceholder:
        "Füge wichtige Informationen zu diesem Vorgang hinzu...",
      generatedDocuments:
        "Automatisch erstellte Dokumentenliste",
      requiredDocument: "Pflichtdokument",
      conditionalDocument: "Je nach Fall erforderlich",
      creating: "Vorgang wird erstellt...",
      start: "Vorgang starten",
      noSession:
        "Keine Sitzung gefunden. Bitte melde dich erneut an.",
      freeLimitError:
        "Im kostenlosen Tarif kannst du höchstens einen Vorgang erstellen. Für einen weiteren Vorgang ist Premium erforderlich.",
      selectProcess: "Bitte wähle einen Vorgangstyp.",
      selectCountry:
        "Bitte wähle das Land des Vorgangs.",
      loadError:
        "Tarif- und Vorgangsdaten konnten nicht geladen werden. Bitte lade die Seite neu.",
      createError:
        "Der Vorgang konnte nicht erstellt werden. Bitte versuche es erneut.",
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
    newProcess: {
      loading: "Preparing process options...",
      backToProcesses: "Back to processes",
      title: "Start a new process",
      description:
        "Choose a process type. ALQEV will automatically create the document list and track progress.",
      freeLimit: "FREE PLAN LIMIT",
      limitReached: "You have reached your process limit",
      limitDescription:
        "The free plan allows one process. Upgrade to Premium to start another process and manage all processes together.",
      upgrade: "Upgrade to Premium",
      returnToCurrent: "Return to current process",
      processType: "1. Process type",
      deadline: "Target date",
      optional: "optional",
      notes: "Notes",
      notesPlaceholder:
        "Add important information about this process...",
      generatedDocuments:
        "Documents to be created automatically",
      requiredDocument: "Required document",
      conditionalDocument: "Required depending on the case",
      creating: "Creating process...",
      start: "Start process",
      noSession:
        "No session was found. Please sign in again.",
      freeLimitError:
        "The free plan allows one process. Upgrade to Premium to start another process.",
      selectProcess: "Please select a process type.",
      selectCountry:
        "Please select the country where the process will take place.",
      loadError:
        "Plan and process information could not be loaded. Please refresh the page.",
      createError:
        "The process could not be created. Please try again.",
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
    newProcess: {
      loading: "Подготовка вариантов процессов...",
      backToProcesses: "Назад к процессам",
      title: "Начать новый процесс",
      description:
        "Выберите тип процесса. ALQEV автоматически создаст список документов и будет отслеживать прогресс.",
      freeLimit: "ЛИМИТ БЕСПЛАТНОГО ТАРИФА",
      limitReached: "Вы достигли лимита процессов",
      limitDescription:
        "Бесплатный тариф позволяет создать один процесс. Перейдите на Premium, чтобы запустить новый процесс и управлять всеми процессами вместе.",
      upgrade: "Перейти на Premium",
      returnToCurrent: "Вернуться к текущему процессу",
      processType: "1. Тип процесса",
      deadline: "Целевая дата",
      optional: "необязательно",
      notes: "Заметки",
      notesPlaceholder:
        "Добавьте важную информацию об этом процессе...",
      generatedDocuments:
        "Список документов, который будет создан автоматически",
      requiredDocument: "Обязательный документ",
      conditionalDocument: "Требуется в зависимости от ситуации",
      creating: "Создание процесса...",
      start: "Начать процесс",
      noSession:
        "Сессия не найдена. Пожалуйста, войдите снова.",
      freeLimitError:
        "Бесплатный тариф позволяет создать один процесс. Для нового процесса перейдите на Premium.",
      selectProcess: "Выберите тип процесса.",
      selectCountry:
        "Выберите страну, в которой будет проходить процесс.",
      loadError:
        "Не удалось загрузить данные тарифа и процессов. Обновите страницу.",
      createError:
        "Не удалось создать процесс. Повторите попытку.",
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
    newProcess: {
      loading: "جارٍ تجهيز خيارات الإجراءات...",
      backToProcesses: "العودة إلى الإجراءات",
      title: "بدء إجراء جديد",
      description:
        "اختر نوع الإجراء. سيُنشئ ALQEV قائمة الوثائق تلقائيًا ويتابع التقدم.",
      freeLimit: "حد الخطة المجانية",
      limitReached: "لقد وصلت إلى حد الإجراءات",
      limitDescription:
        "تسمح الخطة المجانية بإجراء واحد. انتقل إلى Premium لبدء إجراء جديد وإدارة جميع إجراءاتك معًا.",
      upgrade: "الترقية إلى Premium",
      returnToCurrent: "العودة إلى الإجراء الحالي",
      processType: "1. نوع الإجراء",
      deadline: "التاريخ المستهدف",
      optional: "اختياري",
      notes: "ملاحظات",
      notesPlaceholder:
        "أضف معلومات مهمة عن هذا الإجراء...",
      generatedDocuments:
        "قائمة الوثائق التي ستُنشأ تلقائيًا",
      requiredDocument: "وثيقة إلزامية",
      conditionalDocument: "مطلوبة حسب الحالة",
      creating: "جارٍ إنشاء الإجراء...",
      start: "بدء الإجراء",
      noSession:
        "لم يتم العثور على جلسة. يرجى تسجيل الدخول مرة أخرى.",
      freeLimitError:
        "تسمح الخطة المجانية بإجراء واحد. يلزم Premium لبدء إجراء جديد.",
      selectProcess: "يرجى اختيار نوع الإجراء.",
      selectCountry:
        "يرجى اختيار البلد الذي سيُنفذ فيه الإجراء.",
      loadError:
        "تعذر تحميل معلومات الخطة والإجراءات. يرجى تحديث الصفحة.",
      createError:
        "تعذر إنشاء الإجراء. يرجى المحاولة مرة أخرى.",
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
    newProcess: {
      loading: "گزینه‌های فرایند در حال آماده‌سازی است...",
      backToProcesses: "بازگشت به فرایندها",
      title: "شروع فرایند جدید",
      description:
        "نوع فرایند را انتخاب کنید. ALQEV فهرست مدارک را به‌طور خودکار ایجاد و پیشرفت را پیگیری می‌کند.",
      freeLimit: "محدودیت طرح رایگان",
      limitReached: "به محدودیت فرایند رسیده‌اید",
      limitDescription:
        "طرح رایگان یک فرایند را اجازه می‌دهد. برای شروع فرایند جدید و مدیریت همه فرایندها به Premium ارتقا دهید.",
      upgrade: "ارتقا به Premium",
      returnToCurrent: "بازگشت به فرایند فعلی",
      processType: "۱. نوع فرایند",
      deadline: "تاریخ هدف",
      optional: "اختیاری",
      notes: "یادداشت‌ها",
      notesPlaceholder:
        "اطلاعات مهم این فرایند را اضافه کنید...",
      generatedDocuments:
        "فهرست مدارکی که خودکار ایجاد می‌شود",
      requiredDocument: "مدرک الزامی",
      conditionalDocument: "بسته به شرایط لازم است",
      creating: "در حال ایجاد فرایند...",
      start: "شروع فرایند",
      noSession:
        "نشست یافت نشد. لطفاً دوباره وارد شوید.",
      freeLimitError:
        "طرح رایگان یک فرایند را اجازه می‌دهد. برای شروع فرایند جدید Premium لازم است.",
      selectProcess: "لطفاً نوع فرایند را انتخاب کنید.",
      selectCountry:
        "لطفاً کشور اجرای فرایند را انتخاب کنید.",
      loadError:
        "اطلاعات طرح و فرایندها بارگذاری نشد. صفحه را تازه‌سازی کنید.",
      createError:
        "فرایند ایجاد نشد. دوباره تلاش کنید.",
    },
  },
} as const;

export function getTranslations(language: Language) {
  return translations[language];
}