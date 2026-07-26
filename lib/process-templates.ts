export type SupportedProcessLanguage =
  | "de"
  | "en"
  | "tr"
  | "ru"
  | "ar"
  | "fa";

export type ProcessDocumentTemplate = {
  key: string;
  title: string;
  description: string;
  required: boolean;
};

export type ProcessTemplate = {
  key: string;
  title: string;
  description: string;
  category: string;
  defaultCountry: string;
  documents: ProcessDocumentTemplate[];
};

type LocalizedText = Record<SupportedProcessLanguage, string>;

type LocalizedDocumentTemplate = {
  key: string;
  title: LocalizedText;
  description: LocalizedText;
  required: boolean;
};

type LocalizedProcessTemplate = {
  key: string;
  title: LocalizedText;
  description: LocalizedText;
  category: string;
  defaultCountry: string;
  documents: LocalizedDocumentTemplate[];
};

const text = (
  tr: string,
  de: string,
  en: string,
  ru: string,
  ar: string,
  fa: string,
): LocalizedText => ({ tr, de, en, ru, ar, fa });

export const countryOptions = [
  { value: "DE", label: "Almanya" },
  { value: "TR", label: "Türkiye" },
  { value: "AT", label: "Avusturya" },
  { value: "CH", label: "İsviçre" },
  { value: "NL", label: "Hollanda" },
  { value: "BE", label: "Belçika" },
  { value: "FR", label: "Fransa" },
  { value: "GB", label: "Birleşik Krallık" },
  { value: "OTHER", label: "Diğer" },
] as const;

const localizedCountryLabels: Record<string, LocalizedText> = {
  DE: text("Almanya", "Deutschland", "Germany", "Германия", "ألمانيا", "آلمان"),
  TR: text("Türkiye", "Türkei", "Türkiye", "Турция", "تركيا", "ترکیه"),
  AT: text("Avusturya", "Österreich", "Austria", "Австрия", "النمسا", "اتریش"),
  CH: text("İsviçre", "Schweiz", "Switzerland", "Швейцария", "سويسرا", "سوئیس"),
  NL: text("Hollanda", "Niederlande", "Netherlands", "Нидерланды", "هولندا", "هلند"),
  BE: text("Belçika", "Belgien", "Belgium", "Бельгия", "بلجيكا", "بلژیک"),
  FR: text("Fransa", "Frankreich", "France", "Франция", "فرنسا", "فرانسه"),
  GB: text("Birleşik Krallık", "Vereinigtes Königreich", "United Kingdom", "Великобритания", "المملكة المتحدة", "بریتانیا"),
  OTHER: text("Diğer", "Andere", "Other", "Другое", "أخرى", "سایر"),
};

export const countryLabels: Record<string, string> = Object.fromEntries(
  countryOptions.map((option) => [option.value, option.label]),
);

const localizedProcessTemplates: LocalizedProcessTemplate[] = [
  {
    key: "residence-renewal",
    title: text("Oturum İzni Uzatma", "Aufenthaltstitel verlängern", "Residence Permit Renewal", "Продление вида на жительство", "تمديد تصريح الإقامة", "تمدید اجازه اقامت"),
    description: text("Mevcut oturum iznini süresi dolmadan yenile.", "Verlängere deinen Aufenthaltstitel vor seinem Ablauf.", "Renew your current residence permit before it expires.", "Продлите действующий вид на жительство до истечения срока.", "جدّد تصريح إقامتك الحالي قبل انتهاء صلاحيته.", "اجازه اقامت فعلی خود را پیش از پایان اعتبار تمدید کنید."),
    category: "residence",
    defaultCountry: "DE",
    documents: [
      { key: "passport", title: text("Geçerli pasaport", "Gültiger Reisepass", "Valid passport", "Действующий паспорт", "جواز سفر ساري", "گذرنامه معتبر"), description: text("Kimlik bilgileri ve geçerlilik süresi görünür olmalı.", "Identitätsdaten und Gültigkeitsdauer müssen sichtbar sein.", "Identity details and expiry date must be visible.", "Должны быть видны личные данные и срок действия.", "يجب أن تكون بيانات الهوية وتاريخ الصلاحية واضحة.", "اطلاعات هویتی و تاریخ اعتبار باید مشخص باشد."), required: true },
      { key: "biometric-photo", title: text("Biyometrik fotoğraf", "Biometrisches Foto", "Biometric photo", "Биометрическая фотография", "صورة بيومترية", "عکس بیومتریک"), description: text("Güncel biyometrik fotoğraf.", "Aktuelles biometrisches Foto.", "Recent biometric photo.", "Актуальная биометрическая фотография.", "صورة بيومترية حديثة.", "عکس بیومتریک جدید."), required: true },
      { key: "address-registration", title: text("Adres kayıt belgesi", "Meldebescheinigung", "Address registration certificate", "Справка о регистрации по месту жительства", "شهادة تسجيل العنوان", "گواهی ثبت نشانی"), description: text("Güncel ikamet adresini gösteren resmî belge.", "Offizielles Dokument mit der aktuellen Wohnadresse.", "Official document showing your current address.", "Официальный документ с текущим адресом проживания.", "وثيقة رسمية توضح عنوان السكن الحالي.", "مدرک رسمی نشان‌دهنده نشانی فعلی محل سکونت."), required: true },
      { key: "health-insurance", title: text("Sağlık sigortası belgesi", "Krankenversicherungsnachweis", "Health insurance certificate", "Подтверждение медицинской страховки", "إثبات التأمين الصحي", "گواهی بیمه درمانی"), description: text("Aktif sağlık sigortasını gösteren belge.", "Nachweis einer aktiven Krankenversicherung.", "Proof of active health insurance.", "Подтверждение действующей медицинской страховки.", "إثبات وجود تأمين صحي ساري.", "مدرک بیمه درمانی فعال."), required: true },
      { key: "income-proof", title: text("Gelir kanıtı", "Einkommensnachweis", "Proof of income", "Подтверждение дохода", "إثبات الدخل", "مدرک درآمد"), description: text("Maaş bordrosu, iş sözleşmesi veya eşdeğer kanıt.", "Gehaltsabrechnung, Arbeitsvertrag oder gleichwertiger Nachweis.", "Payslip, employment contract, or equivalent proof.", "Расчётный лист, трудовой договор или аналогичное подтверждение.", "قسيمة راتب أو عقد عمل أو إثبات مماثل.", "فیش حقوقی، قرارداد کار یا مدرک معادل."), required: true },
    ],
  },
  {
    key: "family-reunion",
    title: text("Aile Birleşimi", "Familiennachzug", "Family Reunification", "Воссоединение семьи", "لمّ الشمل العائلي", "پیوست خانواده"),
    description: text("Eş veya aile üyeleri için aile birleşimi sürecini yönet.", "Verwalte den Familiennachzug für Ehepartner oder Familienangehörige.", "Manage family reunification for a spouse or family members.", "Управляйте процессом воссоединения с супругом или членами семьи.", "أدر إجراءات لمّ الشمل للزوج أو أفراد الأسرة.", "فرایند پیوست همسر یا اعضای خانواده را مدیریت کنید."),
    category: "family",
    defaultCountry: "DE",
    documents: [
      { key: "passport", title: text("Geçerli pasaport", "Gültiger Reisepass", "Valid passport", "Действующий паспорт", "جواز سفر ساري", "گذرنامه معتبر"), description: text("Başvuru sahibinin geçerli pasaportu.", "Gültiger Reisepass der antragstellenden Person.", "Applicant’s valid passport.", "Действующий паспорт заявителя.", "جواز السفر الساري لمقدم الطلب.", "گذرنامه معتبر متقاضی."), required: true },
      { key: "marriage-certificate", title: text("Evlilik veya aile bağını gösteren belge", "Heirats- oder Verwandtschaftsnachweis", "Marriage or family relationship certificate", "Свидетельство о браке или родстве", "وثيقة الزواج أو صلة القرابة", "مدرک ازدواج یا رابطه خانوادگی"), description: text("Apostil ve tercüme gerekebilir.", "Apostille und Übersetzung können erforderlich sein.", "An apostille and translation may be required.", "Могут потребоваться апостиль и перевод.", "قد يلزم التصديق والترجمة.", "ممکن است آپوستیل و ترجمه لازم باشد."), required: true },
      { key: "sponsor-residence", title: text("Sponsor oturum belgesi", "Aufenthaltsnachweis der Bezugsperson", "Sponsor residence document", "Документ о проживании приглашающего лица", "وثيقة إقامة الكفيل", "مدرک اقامت حامی"), description: text("Almanya'daki aile üyesinin oturum veya kimlik belgesi.", "Aufenthalts- oder Identitätsnachweis des Familienmitglieds in Deutschland.", "Residence permit or ID of the family member in Germany.", "Вид на жительство или удостоверение личности члена семьи в Германии.", "تصريح إقامة أو هوية فرد الأسرة في ألمانيا.", "مدرک اقامت یا هویت عضو خانواده در آلمان."), required: true },
      { key: "housing-proof", title: text("Konut kanıtı", "Wohnraumnachweis", "Proof of accommodation", "Подтверждение жилья", "إثبات السكن", "مدرک محل سکونت"), description: text("Yeterli yaşam alanını gösteren kira sözleşmesi.", "Mietvertrag als Nachweis ausreichenden Wohnraums.", "Rental agreement proving sufficient living space.", "Договор аренды, подтверждающий достаточную жилую площадь.", "عقد إيجار يثبت توفر مساحة سكن كافية.", "قرارداد اجاره برای اثبات فضای کافی سکونت."), required: true },
      { key: "language-certificate", title: text("Dil sertifikası", "Sprachzertifikat", "Language certificate", "Языковой сертификат", "شهادة اللغة", "مدرک زبان"), description: text("Süreç türüne göre gerekli dil seviyesi belgesi.", "Nachweis des je nach Verfahren erforderlichen Sprachniveaus.", "Proof of the language level required for the process.", "Подтверждение требуемого языкового уровня.", "إثبات مستوى اللغة المطلوب حسب الإجراء.", "مدرک سطح زبان موردنیاز فرایند."), required: false },
    ],
  },
  {
    key: "work-permit",
    title: text("Çalışma İzni", "Arbeitserlaubnis", "Work Permit", "Разрешение на работу", "تصريح العمل", "مجوز کار"),
    description: text("İş teklifi veya mevcut iş için çalışma izni sürecini takip et.", "Verfolge das Arbeitserlaubnisverfahren für ein Angebot oder eine bestehende Stelle.", "Track the work permit process for a job offer or current employment.", "Отслеживайте оформление разрешения на работу.", "تابع إجراءات تصريح العمل لعرض أو وظيفة حالية.", "فرایند مجوز کار برای پیشنهاد یا شغل فعلی را پیگیری کنید."),
    category: "employment",
    defaultCountry: "DE",
    documents: [
      { key: "passport", title: text("Geçerli pasaport", "Gültiger Reisepass", "Valid passport", "Действующий паспорт", "جواز سفر ساري", "گذرنامه معتبر"), description: text("Kimlik ve geçerlilik sayfaları.", "Seiten mit Identitätsdaten und Gültigkeit.", "Identity and validity pages.", "Страницы с личными данными и сроком действия.", "صفحات الهوية والصلاحية.", "صفحات هویت و اعتبار."), required: true },
      { key: "employment-contract", title: text("İş sözleşmesi", "Arbeitsvertrag", "Employment contract", "Трудовой договор", "عقد العمل", "قرارداد کار"), description: text("İmzalı iş sözleşmesi veya bağlayıcı iş teklifi.", "Unterschriebener Arbeitsvertrag oder verbindliches Stellenangebot.", "Signed employment contract or binding job offer.", "Подписанный трудовой договор или обязательное предложение.", "عقد عمل موقّع أو عرض عمل ملزم.", "قرارداد امضاشده یا پیشنهاد شغلی الزام‌آور."), required: true },
      { key: "qualification", title: text("Mesleki yeterlilik belgesi", "Qualifikationsnachweis", "Professional qualification certificate", "Подтверждение квалификации", "شهادة المؤهل المهني", "مدرک صلاحیت حرفه‌ای"), description: text("Diploma, sertifika veya mesleki denklik belgesi.", "Diplom, Zertifikat oder berufliche Anerkennung.", "Diploma, certificate, or professional recognition.", "Диплом, сертификат или подтверждение признания квалификации.", "دبلوم أو شهادة أو اعتراف مهني.", "دیپلم، گواهی یا تأیید معادل‌سازی حرفه‌ای."), required: true },
      { key: "job-description", title: text("Görev tanımı", "Stellenbeschreibung", "Job description", "Описание должности", "الوصف الوظيفي", "شرح شغل"), description: text("Pozisyon, çalışma süresi ve görevleri açıklayan belge.", "Dokument mit Position, Arbeitszeit und Aufgaben.", "Document describing the position, hours, and duties.", "Документ с должностью, рабочим временем и обязанностями.", "وثيقة توضح المنصب وساعات العمل والمهام.", "مدرکی شامل سمت، ساعات کار و وظایف."), required: false },
    ],
  },
  {
    key: "eu-blue-card",
    title: text("AB Mavi Kart", "Blaue Karte EU", "EU Blue Card", "Голубая карта ЕС", "البطاقة الزرقاء للاتحاد الأوروبي", "کارت آبی اتحادیه اروپا"),
    description: text("Nitelikli çalışanlar için AB Mavi Kart başvurusunu yönet.", "Verwalte den Antrag auf die Blaue Karte EU für qualifizierte Fachkräfte.", "Manage the EU Blue Card application for qualified workers.", "Управляйте заявлением на Голубую карту ЕС.", "أدر طلب البطاقة الزرقاء للعمال المؤهلين.", "درخواست کارت آبی اتحادیه اروپا را مدیریت کنید."),
    category: "employment",
    defaultCountry: "DE",
    documents: [
      { key: "passport", title: text("Geçerli pasaport", "Gültiger Reisepass", "Valid passport", "Действующий паспорт", "جواز سفر ساري", "گذرنامه معتبر"), description: text("Kimlik ve geçerlilik sayfaları.", "Seiten mit Identitätsdaten und Gültigkeit.", "Identity and validity pages.", "Страницы с личными данными и сроком действия.", "صفحات الهوية والصلاحية.", "صفحات هویت و اعتبار."), required: true },
      { key: "employment-contract", title: text("İş sözleşmesi", "Arbeitsvertrag", "Employment contract", "Трудовой договор", "عقد العمل", "قرارداد کار"), description: text("Maaş ve pozisyon bilgilerini içeren imzalı sözleşme.", "Unterschriebener Vertrag mit Gehalts- und Positionsangaben.", "Signed contract containing salary and position details.", "Подписанный договор с данными о зарплате и должности.", "عقد موقّع يتضمن الراتب والمنصب.", "قرارداد امضاشده شامل حقوق و سمت."), required: true },
      { key: "degree", title: text("Üniversite diploması", "Hochschulabschluss", "University degree", "Диплом о высшем образовании", "الشهادة الجامعية", "مدرک دانشگاهی"), description: text("Tanınan diploma veya denklik belgesi.", "Anerkannter Abschluss oder Gleichwertigkeitsnachweis.", "Recognized degree or equivalency certificate.", "Признанный диплом или подтверждение эквивалентности.", "شهادة معترف بها أو إثبات معادلة.", "مدرک معتبر یا گواهی معادل‌سازی."), required: true },
      { key: "recognition-proof", title: text("Diploma tanınma kanıtı", "Nachweis der Abschlussanerkennung", "Proof of degree recognition", "Подтверждение признания диплома", "إثبات الاعتراف بالشهادة", "مدرک تأیید مدرک تحصیلی"), description: text("Anabin sonucu veya resmî denklik belgesi.", "Anabin-Auskunft oder offizieller Anerkennungsbescheid.", "Anabin result or official recognition certificate.", "Результат Anabin или официальное подтверждение признания.", "نتيجة Anabin أو قرار اعتراف رسمي.", "نتیجه Anabin یا گواهی رسمی معادل‌سازی."), required: true },
    ],
  },
  {
    key: "student-visa",
    title: text("Öğrenci Vizesi", "Studentenvisum", "Student Visa", "Студенческая виза", "تأشيرة الطالب", "ویزای دانشجویی"),
    description: text("Eğitim başlangıcına kadar öğrenci vizesi adımlarını takip et.", "Verfolge die Schritte zum Studentenvisum bis zum Studienbeginn.", "Track student visa steps until your studies begin.", "Отслеживайте этапы получения студенческой визы.", "تابع خطوات تأشيرة الطالب حتى بدء الدراسة.", "مراحل ویزای دانشجویی را تا شروع تحصیل پیگیری کنید."),
    category: "education",
    defaultCountry: "DE",
    documents: [
      { key: "passport", title: text("Geçerli pasaport", "Gültiger Reisepass", "Valid passport", "Действующий паспорт", "جواز سفر ساري", "گذرنامه معتبر"), description: text("Başvuru sahibinin geçerli pasaportu.", "Gültiger Reisepass der antragstellenden Person.", "Applicant’s valid passport.", "Действующий паспорт заявителя.", "جواز السفر الساري لمقدم الطلب.", "گذرنامه معتبر متقاضی."), required: true },
      { key: "admission-letter", title: text("Kabul mektubu", "Zulassungsbescheid", "Admission letter", "Письмо о зачислении", "خطاب القبول", "نامه پذیرش"), description: text("Üniversite veya eğitim kurumundan kabul belgesi.", "Zulassung einer Hochschule oder Bildungseinrichtung.", "Admission from a university or educational institution.", "Подтверждение зачисления из учебного заведения.", "قبول من جامعة أو مؤسسة تعليمية.", "پذیرش دانشگاه یا مؤسسه آموزشی."), required: true },
      { key: "financial-proof", title: text("Maddi yeterlilik kanıtı", "Finanzierungsnachweis", "Proof of financial means", "Подтверждение финансовых средств", "إثبات القدرة المالية", "مدرک تمکن مالی"), description: text("Bloke hesap, burs veya sponsor belgesi.", "Sperrkonto, Stipendium oder Verpflichtungserklärung.", "Blocked account, scholarship, or sponsor document.", "Блокированный счёт, стипендия или спонсорский документ.", "حساب مغلق أو منحة أو وثيقة كفالة.", "حساب مسدود، بورسیه یا مدرک حامی."), required: true },
      { key: "health-insurance", title: text("Sağlık sigortası belgesi", "Krankenversicherungsnachweis", "Health insurance certificate", "Подтверждение медицинской страховки", "إثبات التأمين الصحي", "گواهی بیمه درمانی"), description: text("Geçerli öğrenci sağlık sigortası.", "Gültige studentische Krankenversicherung.", "Valid student health insurance.", "Действующая студенческая медицинская страховка.", "تأمين صحي طلابي ساري.", "بیمه درمانی معتبر دانشجویی."), required: true },
      { key: "language-proof", title: text("Dil yeterlilik belgesi", "Sprachnachweis", "Language proficiency certificate", "Сертификат владения языком", "إثبات إتقان اللغة", "مدرک مهارت زبان"), description: text("Program diline uygun sertifika.", "Zertifikat passend zur Unterrichtssprache.", "Certificate matching the program language.", "Сертификат по языку программы.", "شهادة مناسبة للغة البرنامج.", "مدرک متناسب با زبان دوره."), required: false },
    ],
  },
  {
    key: "citizenship",
    title: text("Vatandaşlık Başvurusu", "Einbürgerungsantrag", "Citizenship Application", "Заявление на гражданство", "طلب الحصول على الجنسية", "درخواست شهروندی"),
    description: text("Vatandaşlık uygunluğu, belgeler ve başvuru tarihlerini yönet.", "Verwalte Voraussetzungen, Dokumente und Termine der Einbürgerung.", "Manage citizenship eligibility, documents, and application dates.", "Управляйте требованиями, документами и сроками заявления.", "أدر شروط الجنسية والوثائق ومواعيد الطلب.", "شرایط، مدارک و تاریخ‌های درخواست شهروندی را مدیریت کنید."),
    category: "citizenship",
    defaultCountry: "DE",
    documents: [
      { key: "passport", title: text("Pasaport ve kimlik belgeleri", "Reisepass und Identitätsdokumente", "Passport and identity documents", "Паспорт и документы, удостоверяющие личность", "جواز السفر ووثائق الهوية", "گذرنامه و مدارک هویتی"), description: text("Mevcut vatandaşlığı gösteren belgeler.", "Dokumente zum Nachweis der aktuellen Staatsangehörigkeit.", "Documents showing current citizenship.", "Документы, подтверждающие текущее гражданство.", "وثائق تثبت الجنسية الحالية.", "مدارک نشان‌دهنده تابعیت فعلی."), required: true },
      { key: "residence-history", title: text("İkamet geçmişi", "Aufenthaltsverlauf", "Residence history", "История проживания", "سجل الإقامة", "سابقه اقامت"), description: text("Yasal ikamet süresini kanıtlayan belgeler.", "Dokumente zum Nachweis der rechtmäßigen Aufenthaltsdauer.", "Documents proving the period of legal residence.", "Документы, подтверждающие срок законного проживания.", "وثائق تثبت مدة الإقامة القانونية.", "مدارک اثبات مدت اقامت قانونی."), required: true },
      { key: "language-certificate", title: text("Dil sertifikası", "Sprachzertifikat", "Language certificate", "Языковой сертификат", "شهادة اللغة", "مدرک زبان"), description: text("Gerekli dil seviyesini gösteren belge.", "Nachweis des erforderlichen Sprachniveaus.", "Proof of the required language level.", "Подтверждение требуемого уровня языка.", "إثبات مستوى اللغة المطلوب.", "مدرک سطح زبان موردنیاز."), required: true },
      { key: "citizenship-test", title: text("Vatandaşlık testi belgesi", "Einbürgerungstest-Nachweis", "Citizenship test certificate", "Сертификат о тесте на гражданство", "شهادة اختبار الجنسية", "گواهی آزمون شهروندی"), description: text("Başarı belgesi veya muafiyet kanıtı.", "Bestandenennachweis oder Befreiungsnachweis.", "Pass certificate or proof of exemption.", "Сертификат о сдаче или подтверждение освобождения.", "شهادة النجاح أو إثبات الإعفاء.", "گواهی قبولی یا مدرک معافیت."), required: true },
      { key: "income-proof", title: text("Gelir ve geçim kanıtı", "Einkommens- und Lebensunterhaltsnachweis", "Proof of income and livelihood", "Подтверждение дохода и средств к существованию", "إثبات الدخل والمعيشة", "مدرک درآمد و تأمین معاش"), description: text("Gelir, vergi ve sosyal yardım durumunu gösteren belgeler.", "Dokumente zu Einkommen, Steuern und Sozialleistungen.", "Documents showing income, tax, and benefit status.", "Документы о доходах, налогах и социальных выплатах.", "وثائق توضح الدخل والضرائب والمساعدات الاجتماعية.", "مدارک مربوط به درآمد، مالیات و کمک‌های اجتماعی."), required: true },
    ],
  },
];

export function normalizeProcessLanguage(
  language?: string,
): SupportedProcessLanguage {
  return language === "de" ||
    language === "en" ||
    language === "tr" ||
    language === "ru" ||
    language === "ar" ||
    language === "fa"
    ? language
    : "tr";
}

export function getLocalizedCountryLabel(
  countryCode: string,
  language: string,
): string {
  const normalizedLanguage = normalizeProcessLanguage(language);
  return localizedCountryLabels[countryCode]?.[normalizedLanguage] ?? countryCode;
}

export function getLocalizedProcessTemplates(
  language: string,
): ProcessTemplate[] {
  const normalizedLanguage = normalizeProcessLanguage(language);

  return localizedProcessTemplates.map((template) => ({
    key: template.key,
    title: template.title[normalizedLanguage],
    description: template.description[normalizedLanguage],
    category: template.category,
    defaultCountry: template.defaultCountry,
    documents: template.documents.map((document) => ({
      key: document.key,
      title: document.title[normalizedLanguage],
      description: document.description[normalizedLanguage],
      required: document.required,
    })),
  }));
}

/**
 * Eski kullanım biçimini bozmamak için Türkçe şablonlar korunur.
 * Yeni ekranlarda getLocalizedProcessTemplates(language) kullanılmalıdır.
 */
export const processTemplates: ProcessTemplate[] =
  getLocalizedProcessTemplates("tr");

export function getProcessTemplate(
  templateKey: string,
  language = "tr",
): ProcessTemplate | undefined {
  return getLocalizedProcessTemplates(language).find(
    (template) => template.key === templateKey,
  );
}

function findTemplateByStoredTitle(
  storedTitle: string,
): LocalizedProcessTemplate | undefined {
  const normalizedTitle = storedTitle.trim().toLocaleLowerCase();

  return localizedProcessTemplates.find((template) =>
    Object.values(template.title).some(
      (title) =>
        title.trim().toLocaleLowerCase() === normalizedTitle,
    ),
  );
}

export function getLocalizedProcessTitle(
  input: {
    templateKey?: string | null;
    title?: string | null;
  },
  language: string,
): string {
  const normalizedLanguage = normalizeProcessLanguage(language);

  const template =
    localizedProcessTemplates.find(
      (item) => item.key === input.templateKey,
    ) ??
    (input.title
      ? findTemplateByStoredTitle(input.title)
      : undefined);

  return (
    template?.title[normalizedLanguage] ??
    input.title ??
    ""
  );
}

export function getLocalizedProcessDescription(
  input: {
    templateKey?: string | null;
    processTitle?: string | null;
    processDescription?: string | null;
  },
  language: string,
): string {
  const normalizedLanguage = normalizeProcessLanguage(language);

  const template =
    localizedProcessTemplates.find(
      (item) => item.key === input.templateKey,
    ) ??
    (input.processTitle
      ? findTemplateByStoredTitle(input.processTitle)
      : undefined);

  return (
    template?.description[normalizedLanguage] ??
    input.processDescription ??
    ""
  );
}

export function getLocalizedDocumentTitle(
  input: {
    templateKey?: string | null;
    processTitle?: string | null;
    documentKey?: string | null;
    documentTitle?: string | null;
  },
  language: string,
): string {
  const normalizedLanguage = normalizeProcessLanguage(language);

  const template =
    localizedProcessTemplates.find(
      (item) => item.key === input.templateKey,
    ) ??
    (input.processTitle
      ? findTemplateByStoredTitle(input.processTitle)
      : undefined);

  const document = template?.documents.find(
    (item) => item.key === input.documentKey,
  );

  return (
    document?.title[normalizedLanguage] ??
    input.documentTitle ??
    ""
  );
}

export function getLocalizedDocumentDescription(
  input: {
    templateKey?: string | null;
    processTitle?: string | null;
    documentKey?: string | null;
    documentDescription?: string | null;
  },
  language: string,
): string {
  const normalizedLanguage =
    normalizeProcessLanguage(language);

  const template =
    localizedProcessTemplates.find(
      (item) => item.key === input.templateKey,
    ) ??
    (input.processTitle
      ? findTemplateByStoredTitle(
          input.processTitle,
        )
      : undefined);

  const document = template?.documents.find(
    (item) => item.key === input.documentKey,
  );

  return (
    document?.description[normalizedLanguage] ??
    input.documentDescription ??
    ""
  );
}