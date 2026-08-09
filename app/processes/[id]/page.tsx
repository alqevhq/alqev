"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import ProcessAiPanel from "@/components/process/ProcessAiPanel";
import DocumentIntelligenceCard, {
  type DocumentIntelligenceResult,
} from "@/components/process/DocumentIntelligenceCard";
import {
  getLocalizedCountryLabel,
  getLocalizedDocumentDescription,
  getLocalizedDocumentTitle,
  getLocalizedProcessTitle,
} from "@/lib/process-templates";
import {
  isRtlLanguage,
  readStoredLanguage,
  type Language,
} from "@/lib/i18n";

const subscribeToStoredLanguage = () => () => {};

const getStoredLanguageSnapshot = (): Language =>
  readStoredLanguage("tr");

const getServerLanguageSnapshot = (): Language => "tr";

type OcrResult = DocumentIntelligenceResult;

type RequiredDocument = {
  key: string;
  title: string;
  description?: string;
  required?: boolean;
  status?: string;
  fileName?: string;
  fileUrl?: string;
  storagePath?: string;
  fileSize?: number;
  contentType?: string;
  uploadedAt?: Timestamp | null;
  ocr?: OcrResult | null;
  ocrError?: string;
};

type Process = {
  id: string;
  templateKey?: string;
  title: string;
  description: string;
  category: string;
  country: string;
  status: string;
  progress: number;
  deadline: string | null;
  notes: string;
  requiredDocuments: RequiredDocument[];
  completedDocumentCount: number;
  totalDocumentCount: number;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
};

type UploadState = {
  documentKey: string;
  progress: number;
};

type OcrState = {
  documentKey: string;
  mode: "analyzing" | "saving";
};


const pageCopy = {
  tr: {
    loading: "Süreç bilgileri yükleniyor...",
    loadFailed: "Süreç görüntülenemedi",
    noProcessInfo: "Süreç bilgileri bulunamadı.",
    back: "Süreçlere dön",
    detail: "Süreç detayları",
    overallProgress: "Genel ilerleme",
    documentsWord: "belge",
    country: "Ülke",
    deadline: "Hedef tarih",
    created: "Oluşturulma",
    category: "Kategori",
    unspecified: "Belirtilmedi",
    documents: "Belgeler",
    requiredList: "Gerekli belge listesi",
    uploadInfo: "PDF, JPG, PNG veya WEBP · En fazla 10 MB",
    bulkUpload: "Çoklu yükle",
    uploadingCount: "{current}/{total} yükleniyor",
    deleting: "Siliniyor...",
    deleteSelected: "Seçilenleri sil ({count})",
    search: "Belge ara...",
    allStatuses: "Tüm durumlar",
    missing: "Eksik",
    uploaded: "Yüklendi",
    approved: "Onaylandı",
    defaultSort: "Varsayılan sıralama",
    sortName: "Ada göre",
    sortStatus: "Duruma göre",
    sortDate: "Yükleme tarihine göre",
    noDocuments: "Bu süreç için henüz belge listesi oluşturulmamış.",
    conditional: "Duruma göre gerekli",
    required: "Zorunlu belge",
    save: "Kaydet",
    cancel: "Vazgeç",
    uploading: "Yükleniyor...",
    aiSaving: "AI sonucu kaydediliyor...",
    aiAnalyzing: "AI belgeyi analiz ediyor...",
    extracting: "Metin ve belge alanları çıkarılıyor.",
    aiOcrResult: "AI OCR sonucu",
    document: "Belge",
    reanalyze: "Yeniden analiz et",
    showFullText: "Okunan tam metni göster",
    aiFailed: "AI analizi tamamlanamadı",
    retry: "Tekrar dene",
    analyzeAi: "AI ile analiz et",
    uploadNew: "Yeni dosya yükle",
    chooseFile: "Dosya seç",
    useCamera: "Kamerayı kullan",
    preview: "Önizle",
    rename: "Yeniden adlandır",
    delete: "Sil",
    notes: "Notlar",
    previewLabel: "Belge önizleme",
    openNewTab: "Yeni sekmede aç",
    close: "Kapat",
    active: "Aktif",
    completed: "Tamamlandı",
    paused: "Beklemede",
    cancelled: "İptal edildi",
    rejected: "Reddedildi",
  },
  de: {
    loading: "Vorgang wird geladen...",
    loadFailed: "Vorgang konnte nicht angezeigt werden",
    noProcessInfo: "Vorgangsinformationen wurden nicht gefunden.",
    back: "Zurück zu den Vorgängen",
    detail: "Vorgangsdetails",
    overallProgress: "Gesamtfortschritt",
    documentsWord: "Dokumente",
    country: "Land",
    deadline: "Frist",
    created: "Erstellt",
    category: "Kategorie",
    unspecified: "Nicht angegeben",
    documents: "Dokumente",
    requiredList: "Erforderliche Dokumente",
    uploadInfo: "PDF, JPG, PNG oder WEBP · Maximal 10 MB",
    bulkUpload: "Mehrere hochladen",
    uploadingCount: "{current}/{total} werden hochgeladen",
    deleting: "Wird gelöscht...",
    deleteSelected: "Ausgewählte löschen ({count})",
    search: "Dokument suchen...",
    allStatuses: "Alle Status",
    missing: "Fehlt",
    uploaded: "Hochgeladen",
    approved: "Genehmigt",
    defaultSort: "Standardsortierung",
    sortName: "Nach Name",
    sortStatus: "Nach Status",
    sortDate: "Nach Upload-Datum",
    noDocuments: "Für diesen Vorgang wurde noch keine Dokumentenliste erstellt.",
    conditional: "Je nach Fall erforderlich",
    required: "Pflichtdokument",
    save: "Speichern",
    cancel: "Abbrechen",
    uploading: "Wird hochgeladen...",
    aiSaving: "KI-Ergebnis wird gespeichert...",
    aiAnalyzing: "KI analysiert das Dokument...",
    extracting: "Text und Dokumentfelder werden extrahiert.",
    aiOcrResult: "KI-OCR-Ergebnis",
    document: "Dokument",
    reanalyze: "Erneut analysieren",
    showFullText: "Vollständigen Text anzeigen",
    aiFailed: "KI-Analyse fehlgeschlagen",
    retry: "Erneut versuchen",
    analyzeAi: "Mit KI analysieren",
    uploadNew: "Neue Datei hochladen",
    chooseFile: "Datei auswählen",
    useCamera: "Kamera verwenden",
    preview: "Vorschau",
    rename: "Umbenennen",
    delete: "Löschen",
    notes: "Notizen",
    previewLabel: "Dokumentvorschau",
    openNewTab: "In neuem Tab öffnen",
    close: "Schließen",
    active: "Aktiv",
    completed: "Abgeschlossen",
    paused: "Pausiert",
    cancelled: "Abgebrochen",
    rejected: "Abgelehnt",
  },
  en: {
    loading: "Loading process information...",
    loadFailed: "Process could not be displayed",
    noProcessInfo: "Process information was not found.",
    back: "Back to processes",
    detail: "Process Details",
    overallProgress: "Overall progress",
    documentsWord: "documents",
    country: "Country",
    deadline: "Target date",
    created: "Created",
    category: "Category",
    unspecified: "Not specified",
    documents: "Documents",
    requiredList: "Required document list",
    uploadInfo: "PDF, JPG, PNG or WEBP · Maximum 10 MB",
    bulkUpload: "Upload multiple",
    uploadingCount: "Uploading {current}/{total}",
    deleting: "Deleting...",
    deleteSelected: "Delete selected ({count})",
    search: "Search documents...",
    allStatuses: "All statuses",
    missing: "Missing",
    uploaded: "Uploaded",
    approved: "Approved",
    defaultSort: "Default sorting",
    sortName: "By name",
    sortStatus: "By status",
    sortDate: "By upload date",
    noDocuments: "No document list has been created for this process yet.",
    conditional: "Required depending on the case",
    required: "Required document",
    save: "Save",
    cancel: "Cancel",
    uploading: "Uploading...",
    aiSaving: "Saving AI result...",
    aiAnalyzing: "AI is analyzing the document...",
    extracting: "Extracting text and document fields.",
    aiOcrResult: "AI OCR result",
    document: "Document",
    reanalyze: "Analyze again",
    showFullText: "Show full extracted text",
    aiFailed: "AI analysis could not be completed",
    retry: "Try again",
    analyzeAi: "Analyze with AI",
    uploadNew: "Upload new file",
    chooseFile: "Choose file",
    useCamera: "Use camera",
    preview: "Preview",
    rename: "Rename",
    delete: "Delete",
    notes: "Notes",
    previewLabel: "Document preview",
    openNewTab: "Open in new tab",
    close: "Close",
    active: "Active",
    completed: "Completed",
    paused: "Paused",
    cancelled: "Cancelled",
    rejected: "Rejected",
  },
  ru: {
    loading: "Загрузка информации о процессе...",
    loadFailed: "Не удалось отобразить процесс",
    noProcessInfo: "Информация о процессе не найдена.",
    back: "Назад к процессам",
    detail: "Детали процесса",
    overallProgress: "Общий прогресс",
    documentsWord: "документов",
    country: "Страна",
    deadline: "Целевая дата",
    created: "Создан",
    category: "Категория",
    unspecified: "Не указано",
    documents: "Документы",
    requiredList: "Список необходимых документов",
    uploadInfo: "PDF, JPG, PNG или WEBP · Не более 10 МБ",
    bulkUpload: "Загрузить несколько",
    uploadingCount: "Загрузка {current}/{total}",
    deleting: "Удаление...",
    deleteSelected: "Удалить выбранные ({count})",
    search: "Поиск документа...",
    allStatuses: "Все статусы",
    missing: "Отсутствует",
    uploaded: "Загружено",
    approved: "Одобрено",
    defaultSort: "Сортировка по умолчанию",
    sortName: "По названию",
    sortStatus: "По статусу",
    sortDate: "По дате загрузки",
    noDocuments: "Для этого процесса список документов ещё не создан.",
    conditional: "Требуется в зависимости от ситуации",
    required: "Обязательный документ",
    save: "Сохранить",
    cancel: "Отмена",
    uploading: "Загрузка...",
    aiSaving: "Сохранение результата ИИ...",
    aiAnalyzing: "ИИ анализирует документ...",
    extracting: "Извлекаются текст и поля документа.",
    aiOcrResult: "Результат OCR ИИ",
    document: "Документ",
    reanalyze: "Повторить анализ",
    showFullText: "Показать полный распознанный текст",
    aiFailed: "Не удалось завершить анализ ИИ",
    retry: "Повторить",
    analyzeAi: "Анализировать с ИИ",
    uploadNew: "Загрузить новый файл",
    chooseFile: "Выбрать файл",
    useCamera: "Использовать камеру",
    preview: "Предпросмотр",
    rename: "Переименовать",
    delete: "Удалить",
    notes: "Заметки",
    previewLabel: "Предпросмотр документа",
    openNewTab: "Открыть в новой вкладке",
    close: "Закрыть",
    active: "Активен",
    completed: "Завершён",
    paused: "Приостановлен",
    cancelled: "Отменён",
    rejected: "Отклонено",
  },
  ar: {
    loading: "جارٍ تحميل معلومات الإجراء...",
    loadFailed: "تعذر عرض الإجراء",
    noProcessInfo: "لم يتم العثور على معلومات الإجراء.",
    back: "العودة إلى الإجراءات",
    detail: "تفاصيل الإجراء",
    overallProgress: "التقدم العام",
    documentsWord: "وثائق",
    country: "البلد",
    deadline: "التاريخ المستهدف",
    created: "تاريخ الإنشاء",
    category: "الفئة",
    unspecified: "غير محدد",
    documents: "الوثائق",
    requiredList: "قائمة الوثائق المطلوبة",
    uploadInfo: "PDF أو JPG أو PNG أو WEBP · بحد أقصى 10 ميغابايت",
    bulkUpload: "رفع متعدد",
    uploadingCount: "جارٍ رفع {current}/{total}",
    deleting: "جارٍ الحذف...",
    deleteSelected: "حذف المحدد ({count})",
    search: "البحث عن وثيقة...",
    allStatuses: "جميع الحالات",
    missing: "ناقص",
    uploaded: "مرفوع",
    approved: "معتمد",
    defaultSort: "الترتيب الافتراضي",
    sortName: "حسب الاسم",
    sortStatus: "حسب الحالة",
    sortDate: "حسب تاريخ الرفع",
    noDocuments: "لم يتم إنشاء قائمة وثائق لهذا الإجراء بعد.",
    conditional: "مطلوبة حسب الحالة",
    required: "وثيقة إلزامية",
    save: "حفظ",
    cancel: "إلغاء",
    uploading: "جارٍ الرفع...",
    aiSaving: "جارٍ حفظ نتيجة الذكاء الاصطناعي...",
    aiAnalyzing: "الذكاء الاصطناعي يحلل الوثيقة...",
    extracting: "جارٍ استخراج النص وحقول الوثيقة.",
    aiOcrResult: "نتيجة OCR بالذكاء الاصطناعي",
    document: "وثيقة",
    reanalyze: "إعادة التحليل",
    showFullText: "عرض النص الكامل",
    aiFailed: "تعذر إكمال تحليل الذكاء الاصطناعي",
    retry: "إعادة المحاولة",
    analyzeAi: "تحليل بالذكاء الاصطناعي",
    uploadNew: "رفع ملف جديد",
    chooseFile: "اختيار ملف",
    useCamera: "استخدام الكاميرا",
    preview: "معاينة",
    rename: "إعادة تسمية",
    delete: "حذف",
    notes: "ملاحظات",
    previewLabel: "معاينة الوثيقة",
    openNewTab: "فتح في علامة تبويب جديدة",
    close: "إغلاق",
    active: "نشط",
    completed: "مكتمل",
    paused: "متوقف مؤقتًا",
    cancelled: "ملغى",
    rejected: "مرفوض",
  },
  fa: {
    loading: "در حال بارگذاری اطلاعات فرایند...",
    loadFailed: "نمایش فرایند ممکن نشد",
    noProcessInfo: "اطلاعات فرایند یافت نشد.",
    back: "بازگشت به فرایندها",
    detail: "جزئیات فرایند",
    overallProgress: "پیشرفت کلی",
    documentsWord: "مدرک",
    country: "کشور",
    deadline: "تاریخ هدف",
    created: "تاریخ ایجاد",
    category: "دسته‌بندی",
    unspecified: "مشخص نشده",
    documents: "مدارک",
    requiredList: "فهرست مدارک لازم",
    uploadInfo: "PDF، JPG، PNG یا WEBP · حداکثر ۱۰ مگابایت",
    bulkUpload: "بارگذاری چندگانه",
    uploadingCount: "در حال بارگذاری {current}/{total}",
    deleting: "در حال حذف...",
    deleteSelected: "حذف موارد انتخاب‌شده ({count})",
    search: "جستجوی مدرک...",
    allStatuses: "همه وضعیت‌ها",
    missing: "ناقص",
    uploaded: "بارگذاری‌شده",
    approved: "تأییدشده",
    defaultSort: "مرتب‌سازی پیش‌فرض",
    sortName: "بر اساس نام",
    sortStatus: "بر اساس وضعیت",
    sortDate: "بر اساس تاریخ بارگذاری",
    noDocuments: "هنوز فهرست مدرکی برای این فرایند ایجاد نشده است.",
    conditional: "بسته به شرایط لازم است",
    required: "مدرک الزامی",
    save: "ذخیره",
    cancel: "لغو",
    uploading: "در حال بارگذاری...",
    aiSaving: "در حال ذخیره نتیجه هوش مصنوعی...",
    aiAnalyzing: "هوش مصنوعی در حال تحلیل مدرک است...",
    extracting: "متن و فیلدهای مدرک استخراج می‌شوند.",
    aiOcrResult: "نتیجه OCR هوش مصنوعی",
    document: "مدرک",
    reanalyze: "تحلیل دوباره",
    showFullText: "نمایش متن کامل",
    aiFailed: "تحلیل هوش مصنوعی تکمیل نشد",
    retry: "تلاش دوباره",
    analyzeAi: "تحلیل با هوش مصنوعی",
    uploadNew: "بارگذاری فایل جدید",
    chooseFile: "انتخاب فایل",
    useCamera: "استفاده از دوربین",
    preview: "پیش‌نمایش",
    rename: "تغییر نام",
    delete: "حذف",
    notes: "یادداشت‌ها",
    previewLabel: "پیش‌نمایش مدرک",
    openNewTab: "باز کردن در برگه جدید",
    close: "بستن",
    active: "فعال",
    completed: "تکمیل شده",
    paused: "متوقف",
    cancelled: "لغو شده",
    rejected: "رد شده",
  },
} as const;

function fillTemplate(
  value: string,
  variables: Record<string, string | number>,
): string {
  return Object.entries(variables).reduce(
    (result, [key, replacement]) =>
      result.replaceAll(`{${key}}`, String(replacement)),
    value,
  );
}

function getDateLocale(language: Language): string {
  switch (language) {
    case "de":
      return "de-DE";
    case "en":
      return "en-GB";
    case "ru":
      return "ru-RU";
    case "ar":
      return "ar";
    case "fa":
      return "fa-IR";
    default:
      return "tr-TR";
  }
}


const localizedProcessDescriptions: Record<
  string,
  Record<Language, string>
> = {
  "residence-renewal": {
    tr: "Mevcut oturum iznini süresi dolmadan yenile.",
    de: "Verlängere deinen Aufenthaltstitel vor seinem Ablauf.",
    en: "Renew your current residence permit before it expires.",
    ru: "Продлите действующий вид на жительство до истечения срока.",
    ar: "جدّد تصريح إقامتك الحالي قبل انتهاء صلاحيته.",
    fa: "اجازه اقامت فعلی خود را پیش از پایان اعتبار تمدید کنید.",
  },
  "family-reunion": {
    tr: "Eş veya aile üyeleri için aile birleşimi sürecini yönet.",
    de: "Verwalte den Familiennachzug für Ehepartner oder Familienangehörige.",
    en: "Manage family reunification for a spouse or family members.",
    ru: "Управляйте процессом воссоединения с супругом или членами семьи.",
    ar: "أدر إجراءات لمّ الشمل للزوج أو أفراد الأسرة.",
    fa: "فرایند پیوست همسر یا اعضای خانواده را مدیریت کنید.",
  },
  "work-permit": {
    tr: "İş teklifi veya mevcut iş için çalışma izni sürecini takip et.",
    de: "Verfolge das Arbeitserlaubnisverfahren für ein Angebot oder eine bestehende Stelle.",
    en: "Track the work permit process for a job offer or current employment.",
    ru: "Отслеживайте оформление разрешения на работу.",
    ar: "تابع إجراءات تصريح العمل لعرض أو وظيفة حالية.",
    fa: "فرایند مجوز کار برای پیشنهاد یا شغل فعلی را پیگیری کنید.",
  },
  "eu-fuchsia-card": {
    tr: "Nitelikli çalışanlar için AB Mavi Kart başvurusunu yönet.",
    de: "Verwalte den Antrag auf die Blaue Karte EU für qualifizierte Fachkräfte.",
    en: "Manage the EU Blue Card application for qualified workers.",
    ru: "Управляйте заявлением на Голубую карту ЕС.",
    ar: "أدر طلب البطاقة الزرقاء للعمال المؤهلين.",
    fa: "درخواست کارت آبی اتحادیه اروپا را مدیریت کنید.",
  },
  "student-visa": {
    tr: "Eğitim başlangıcına kadar öğrenci vizesi adımlarını takip et.",
    de: "Verfolge die Schritte zum Studentenvisum bis zum Studienbeginn.",
    en: "Track student visa steps until your studies begin.",
    ru: "Отслеживайте этапы получения студенческой визы.",
    ar: "تابع خطوات تأشيرة الطالب حتى بدء الدراسة.",
    fa: "مراحل ویزای دانشجویی را تا شروع تحصیل پیگیری کنید.",
  },
  citizenship: {
    tr: "Vatandaşlık uygunluğu, belgeler ve başvuru tarihlerini yönet.",
    de: "Verwalte Voraussetzungen, Dokumente und Termine der Einbürgerung.",
    en: "Manage citizenship eligibility, documents, and application dates.",
    ru: "Управляйте требованиями, документами и сроками заявления.",
    ar: "أدر شروط الجنسية والوثائق ومواعيد الطلب.",
    fa: "شرایط، مدارک و تاریخ‌های درخواست شهروندی را مدیریت کنید.",
  },
};

const localizedCategoryLabels: Record<
  string,
  Record<Language, string>
> = {
  residence: {
    tr: "Oturum",
    de: "Aufenthalt",
    en: "Residence",
    ru: "Проживание",
    ar: "الإقامة",
    fa: "اقامت",
  },
  family: {
    tr: "Aile",
    de: "Familie",
    en: "Family",
    ru: "Семья",
    ar: "الأسرة",
    fa: "خانواده",
  },
  employment: {
    tr: "Çalışma",
    de: "Beschäftigung",
    en: "Employment",
    ru: "Работа",
    ar: "العمل",
    fa: "اشتغال",
  },
  education: {
    tr: "Eğitim",
    de: "Bildung",
    en: "Education",
    ru: "Образование",
    ar: "التعليم",
    fa: "تحصیل",
  },
  citizenship: {
    tr: "Vatandaşlık",
    de: "Einbürgerung",
    en: "Citizenship",
    ru: "Гражданство",
    ar: "الجنسية",
    fa: "شهروندی",
  },
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

function sanitizeFileName(fileName: string) {
  const extensionIndex = fileName.lastIndexOf(".");
  const extension =
    extensionIndex >= 0 ? fileName.slice(extensionIndex).toLowerCase() : "";
  const baseName =
    extensionIndex >= 0 ? fileName.slice(0, extensionIndex) : fileName;

  const safeBaseName =
    baseName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "document";

  return `${safeBaseName}${extension}`;
}

function calculateProcessStats(documents: RequiredDocument[]) {
  const completedDocumentCount = documents.filter(
    (item) => item.status === "uploaded" || item.status === "approved",
  ).length;

  const totalDocumentCount = documents.length;
  const progress =
    totalDocumentCount > 0
      ? Math.round((completedDocumentCount / totalDocumentCount) * 100)
      : 0;

  return {
    completedDocumentCount,
    totalDocumentCount,
    progress,
  };
}

function getStatusLabel(status: string, language: Language) {
  const copy = pageCopy[language];

  switch (status) {
    case "active":
      return copy.active;
    case "completed":
      return copy.completed;
    case "paused":
      return copy.paused;
    case "cancelled":
      return copy.cancelled;
    default:
      return status || copy.unspecified;
  }
}

function getDocumentStatusLabel(
  status: string | undefined,
  language: Language,
) {
  const copy = pageCopy[language];

  switch (status) {
    case "uploaded":
      return copy.uploaded;
    case "approved":
      return copy.approved;
    case "rejected":
      return copy.rejected;
    case "missing":
    default:
      return copy.missing;
  }
}

function formatDate(
  value: Timestamp | null | undefined,
  language: Language,
) {
  if (!value) {
    return pageCopy[language].unspecified;
  }

  return new Intl.DateTimeFormat(
    getDateLocale(language),
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    },
  ).format(value.toDate());
}

function formatDeadline(
  value: string | null,
  language: Language,
) {
  if (!value) {
    return pageCopy[language].unspecified;
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    getDateLocale(language),
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    },
  ).format(date);
}

function normalizeOcrResponse(
  value: unknown,
): Omit<OcrResult, "analyzedAt"> {
  if (!value || typeof value !== "object") {
    throw new Error(
      "OCR servisi geçersiz bir yanıt döndürdü.",
    );
  }

  const root = value as Record<string, unknown>;
  const response =
    root.data &&
    typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root;

  const rawText =
    typeof response.rawText === "string"
      ? response.rawText
      : "";

  const documentType =
    typeof response.documentType === "string" &&
    response.documentType.trim()
      ? response.documentType.trim()
      : "unknown";

  const fields = Array.isArray(response.fields)
    ? response.fields
        .filter(
          (
            item,
          ): item is Record<string, unknown> =>
            Boolean(item) &&
            typeof item === "object",
        )
        .map((item) => ({
          key:
            typeof item.key === "string"
              ? item.key.trim()
              : "",
          label:
            typeof item.label === "string"
              ? item.label.trim()
              : "",
          value:
            typeof item.value === "string"
              ? item.value.trim()
              : "",
          confidence:
            typeof item.confidence === "number"
              ? Math.min(
                  1,
                  Math.max(0, item.confidence),
                )
              : 0.5,
        }))
        .filter(
          (item) =>
            item.key &&
            item.label &&
            item.value,
        )
    : [];

  const intelligenceSource =
    response.intelligence &&
    typeof response.intelligence === "object"
      ? (response.intelligence as Record<
          string,
          unknown
        >)
      : null;

  const normalizeIssues = (
    issues: unknown,
  ): NonNullable<
    DocumentIntelligenceResult["intelligence"]
  >["warnings"] => {
    if (!Array.isArray(issues)) {
      return [];
    }

    return issues
      .filter(
        (
          item,
        ): item is Record<string, unknown> =>
          Boolean(item) &&
          typeof item === "object",
      )
      .map((item) => {
        const severity:
          | "info"
          | "warning"
          | "critical" =
          item.severity === "critical" ||
          item.severity === "warning" ||
          item.severity === "info"
            ? item.severity
            : "warning";

        return {
          code:
            typeof item.code === "string"
              ? item.code
              : "GENERAL",
          severity,
          message:
            typeof item.message === "string"
              ? item.message
              : "",
        };
      })
      .filter((item) => item.message);
  };

  const intelligence: DocumentIntelligenceResult["intelligence"] = intelligenceSource
    ? {
        documentType:
          typeof intelligenceSource.documentType ===
          "string"
            ? intelligenceSource.documentType
            : documentType,
        documentMatch:
          intelligenceSource.documentMatch ===
            "match" ||
          intelligenceSource.documentMatch ===
            "possible_match" ||
          intelligenceSource.documentMatch ===
            "mismatch" ||
          intelligenceSource.documentMatch ===
            "unknown"
            ? intelligenceSource.documentMatch
            : ("unknown" as const),
        qualityScore:
          typeof intelligenceSource.qualityScore ===
          "number"
            ? Math.min(
                100,
                Math.max(
                  0,
                  intelligenceSource.qualityScore,
                ),
              )
            : 0,
        isReadable:
          typeof intelligenceSource.isReadable ===
          "boolean"
            ? intelligenceSource.isReadable
            : Boolean(rawText),
        mrzDetected:
          typeof intelligenceSource.mrzDetected ===
          "boolean"
            ? intelligenceSource.mrzDetected
            : false,
        expiryStatus:
          intelligenceSource.expiryStatus ===
            "valid" ||
          intelligenceSource.expiryStatus ===
            "expiring_soon" ||
          intelligenceSource.expiryStatus ===
            "expired" ||
          intelligenceSource.expiryStatus ===
            "not_applicable" ||
          intelligenceSource.expiryStatus ===
            "unknown"
            ? intelligenceSource.expiryStatus
            : ("unknown" as const),
        summary:
          typeof intelligenceSource.summary ===
          "string"
            ? intelligenceSource.summary
            : "",
        nextAction:
          typeof intelligenceSource.nextAction ===
          "string"
            ? intelligenceSource.nextAction
            : "",
        warnings: normalizeIssues(
          intelligenceSource.warnings,
        ),
        risks: normalizeIssues(
          intelligenceSource.risks,
        ),
      }
    : undefined;

  return {
    rawText,
    documentType,
    fields,
    intelligence,
  };
}

export default function ProcessDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const processId = typeof params.id === "string" ? params.id : params.id?.[0];

  const language = useSyncExternalStore(
    subscribeToStoredLanguage,
    getStoredLanguageSnapshot,
    getServerLanguageSnapshot,
  );
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [process, setProcess] = useState<Process | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const [ocrState, setOcrState] = useState<OcrState | null>(null);
  const [deletingDocumentKey, setDeletingDocumentKey] = useState<string | null>(
    null,
  );
  const [renamingDocumentKey, setRenamingDocumentKey] = useState<string | null>(
    null,
  );
  const [renameValue, setRenameValue] = useState("");
  const [previewDocument, setPreviewDocument] =
    useState<RequiredDocument | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "missing" | "uploaded" | "approved"
  >("all");
  const [sortMode, setSortMode] = useState<
    "default" | "name" | "status" | "date"
  >("default");
  const [selectedDocumentKeys, setSelectedDocumentKeys] = useState<string[]>(
    [],
  );
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [draggedDocumentKey, setDraggedDocumentKey] = useState<string | null>(
    null,
  );
  const [bulkProgress, setBulkProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const bulkInputRef = useRef<HTMLInputElement | null>(null);
  const processRef = useRef<Process | null>(null);

  

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (isMounted) {
          setCurrentUser(null);
          setErrorMessage("Bu sayfayı görmek için giriş yapmalısın.");
          setIsLoading(false);
        }

        router.replace("/login");
        return;
      }

      if (isMounted) {
        setCurrentUser(user);
      }

      if (!processId) {
        if (isMounted) {
          setErrorMessage("Geçerli bir süreç kimliği bulunamadı.");
          setIsLoading(false);
        }

        return;
      }

      try {
        const processReference = doc(
          db,
          "users",
          user.uid,
          "processes",
          processId,
        );

        const snapshot = await getDoc(processReference);

        if (!isMounted) {
          return;
        }

        if (!snapshot.exists()) {
          setErrorMessage("Bu süreç bulunamadı.");
          setIsLoading(false);
          return;
        }

        const data = snapshot.data();

        const requiredDocuments = Array.isArray(data.requiredDocuments)
          ? (data.requiredDocuments as RequiredDocument[])
          : [];

        const completedDocumentCount =
          typeof data.completedDocumentCount === "number"
            ? data.completedDocumentCount
            : requiredDocuments.filter(
                (item) =>
                  item.status === "uploaded" || item.status === "approved",
              ).length;

        const totalDocumentCount =
          typeof data.totalDocumentCount === "number"
            ? data.totalDocumentCount
            : requiredDocuments.length;

        const calculatedProgress =
          totalDocumentCount > 0
            ? Math.round((completedDocumentCount / totalDocumentCount) * 100)
            : 0;

        const loadedProcess: Process = {
          id: snapshot.id,
          templateKey:
            typeof data.templateKey === "string"
              ? data.templateKey
              : undefined,
          title:
            typeof data.title === "string" ? data.title : "Başlıksız Süreç",
          description:
            typeof data.description === "string" ? data.description : "",
          category: typeof data.category === "string" ? data.category : "",
          country:
            typeof data.country === "string" ? data.country : "Belirtilmedi",
          status: typeof data.status === "string" ? data.status : "active",
          progress:
            typeof data.progress === "number"
              ? data.progress
              : calculatedProgress,
          deadline: typeof data.deadline === "string" ? data.deadline : null,
          notes: typeof data.notes === "string" ? data.notes : "",
          requiredDocuments,
          completedDocumentCount,
          totalDocumentCount,
          createdAt:
            data.createdAt instanceof Timestamp ? data.createdAt : null,
          updatedAt:
            data.updatedAt instanceof Timestamp ? data.updatedAt : null,
        };

        processRef.current = loadedProcess;
        setProcess(loadedProcess);
      } catch (error) {
        console.error("Süreç detayı alınamadı:", error);

        if (isMounted) {
          setErrorMessage("Süreç bilgileri yüklenirken bir hata oluştu.");
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
  }, [processId, router]);

  async function analyzeDocumentWithOcr(
    documentKey: string,
    fileUrl: string,
    fileName: string,
    contentType: string,
    quiet = false,
  ) {
    const activeProcess = processRef.current;
    if (!activeProcess || !currentUser || !processId) return false;

    if (!quiet) {
      setSuccessMessage("");
      setUploadError("");
    }

    setOcrState({ documentKey, mode: "analyzing" });

    try {
      const idToken = await currentUser.getIdToken(true);

      const response = await fetch("/api/ocr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          processId,
          documentKey,
          documentTitle:
            activeProcess.requiredDocuments.find(
              (item) => item.key === documentKey,
            )?.title || fileName,
          fileUrl,
          fileName,
          contentType,
          language,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | Record<string, unknown>
        | null;

      if (!response.ok) {
        const message =
          payload && typeof payload.error === "string"
            ? payload.error
            : "Belge AI tarafından analiz edilemedi.";
        throw new Error(message);
      }

      const normalized = normalizeOcrResponse(payload);
      const ocr: OcrResult = {
        ...normalized,
        analyzedAt: new Date().toISOString(),
      };

      setOcrState({ documentKey, mode: "saving" });

      const latestProcess = processRef.current;
      if (!latestProcess) return false;

      const updatedDocuments = latestProcess.requiredDocuments.map((item) =>
        item.key === documentKey
          ? { ...item, ocr, ocrError: "" }
          : item,
      );

      await persistDocuments(updatedDocuments);

      if (!quiet) {
        setSuccessMessage(`“${fileName}” AI tarafından analiz edildi.`);
      }

      return true;
    } catch (error) {
      console.error("OCR analizi tamamlanamadı:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Belge AI tarafından analiz edilemedi.";

      const latestProcess = processRef.current;
      if (latestProcess) {
        const updatedDocuments = latestProcess.requiredDocuments.map((item) =>
          item.key === documentKey
            ? { ...item, ocrError: message }
            : item,
        );

        try {
          await persistDocuments(updatedDocuments);
        } catch (persistError) {
          console.error("OCR hatası Firestore'a kaydedilemedi:", persistError);
        }
      }

      if (!quiet) setUploadError(message);
      return false;
    } finally {
      setOcrState(null);
    }
  }

  async function uploadFile(file: File, documentKey: string, quiet = false) {
    if (!quiet) {
      setSuccessMessage("");
      setUploadError("");
    }

    const activeProcess = processRef.current;
    if (!currentUser || !activeProcess || !processId) return false;

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setUploadError(
        `“${file.name}” desteklenmiyor. Yalnızca PDF, JPG, PNG veya WEBP yükleyebilirsin.`,
      );
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      setUploadError(`“${file.name}” 10 MB sınırını aşıyor.`);
      return false;
    }

    const selectedDocument = activeProcess.requiredDocuments.find(
      (item) => item.key === documentKey,
    );
    if (!selectedDocument) return false;

    const safeFileName = sanitizeFileName(file.name);
  const storagePath = `users/${currentUser.uid}/processes/${processId}/documents/${crypto.randomUUID()}-${safeFileName}`;
    const storageReference = ref(storage, storagePath);
    const previousStoragePath = selectedDocument.storagePath;

    setUploadState({ documentKey, progress: 0 });

    try {
      const uploadTask = uploadBytesResumable(storageReference, file, {
        contentType: file.type,
        customMetadata: { processId, documentKey, ownerId: currentUser.uid },
      });

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress =
              snapshot.totalBytes > 0
                ? Math.round(
                    (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
                  )
                : 0;
            setUploadState({ documentKey, progress });
          },
          reject,
          resolve,
        );
      });

      const fileUrl = await getDownloadURL(uploadTask.snapshot.ref);
      const uploadedAt = Timestamp.now();
      const latestDocuments = activeProcess.requiredDocuments.map((item) =>
        item.key === documentKey
          ? {
              ...item,
              status: "uploaded",
              fileName: file.name,
              fileUrl,
              storagePath,
              fileSize: file.size,
              contentType: file.type,
              uploadedAt,
            }
          : item,
      );

      await persistDocuments(latestDocuments);

      await analyzeDocumentWithOcr(
        documentKey,
        fileUrl,
        file.name,
        file.type,
        quiet,
      );

      if (previousStoragePath && previousStoragePath !== storagePath) {
        try {
          await deleteObject(ref(storage, previousStoragePath));
        } catch (error) {
          console.warn("Eski dosya silinemedi:", error);
        }
      }

      if (!quiet) setSuccessMessage(`“${file.name}” başarıyla yüklendi.`);
      return true;
    } catch (error) {
      console.error("Belge yüklenemedi:", error);
      setUploadError(`“${file.name}” yüklenemedi.`);
      return false;
    } finally {
      setUploadState(null);
      setDraggedDocumentKey(null);
    }
  }

  async function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
    documentKey: string,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) await uploadFile(file, documentKey);
  }

  async function handleDrop(
    event: DragEvent<HTMLElement>,
    documentKey: string,
  ) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && !uploadState) await uploadFile(file, documentKey);
  }

  async function handleBulkUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length || !process) return;

    const targets = process.requiredDocuments.filter(
      (item) => item.status !== "uploaded" && item.status !== "approved",
    );
    if (!targets.length) {
      setUploadError("Yüklenecek eksik belge bulunmuyor.");
      return;
    }

    const queue = files.slice(0, targets.length);
    setBulkProgress({ current: 0, total: queue.length });
    let successCount = 0;
    for (let index = 0; index < queue.length; index += 1) {
      setBulkProgress({ current: index + 1, total: queue.length });
      const ok = await uploadFile(queue[index], targets[index].key, true);
      if (ok) successCount += 1;
    }
    setBulkProgress(null);
    setSuccessMessage(`${successCount} belge başarıyla yüklendi.`);
  }

  async function persistDocuments(updatedDocuments: RequiredDocument[]) {
    if (!currentUser || !processId) {
      throw new Error("Kullanıcı veya süreç bulunamadı.");
    }

    const stats = calculateProcessStats(updatedDocuments);
    const processReference = doc(
      db,
      "users",
      currentUser.uid,
      "processes",
      processId,
    );

    await updateDoc(processReference, {
      requiredDocuments: updatedDocuments,
      completedDocumentCount: stats.completedDocumentCount,
      totalDocumentCount: stats.totalDocumentCount,
      progress: stats.progress,
      updatedAt: serverTimestamp(),
    });

    setProcess((currentProcess) => {
      if (!currentProcess) return currentProcess;
      const nextProcess = {
        ...currentProcess,
        requiredDocuments: updatedDocuments,
        completedDocumentCount: stats.completedDocumentCount,
        totalDocumentCount: stats.totalDocumentCount,
        progress: stats.progress,
      };
      processRef.current = nextProcess;
      return nextProcess;
    });
  }

  async function handleDeleteDocument(item: RequiredDocument) {
    if (!process || !item.fileUrl) {
      return;
    }

    const confirmed = window.confirm(
      `“${item.fileName || item.title}” dosyasını silmek istediğine emin misin?`,
    );

    if (!confirmed) {
      return;
    }

    setSuccessMessage("");
    setUploadError("");
    setDeletingDocumentKey(item.key);

    try {
      if (item.storagePath) {
        await deleteObject(ref(storage, item.storagePath));
      }

      const updatedDocuments = process.requiredDocuments.map((documentItem) =>
        documentItem.key === item.key
          ? {
              ...documentItem,
              status: "missing",
              fileName: "",
              fileUrl: "",
              storagePath: "",
              fileSize: 0,
              contentType: "",
              uploadedAt: null,
              ocr: null,
              ocrError: "",
            }
          : documentItem,
      );

      await persistDocuments(updatedDocuments);

      if (previewDocument?.key === item.key) {
        setPreviewDocument(null);
      }

      setSuccessMessage("Belge başarıyla silindi.");
    } catch (error) {
      console.error("Belge silinemedi:", error);
      setUploadError(
        "Belge silinemedi. Storage ve Firestore kurallarını kontrol et.",
      );
    } finally {
      setDeletingDocumentKey(null);
    }
  }

  function startRename(item: RequiredDocument) {
    setRenamingDocumentKey(item.key);
    setRenameValue(item.fileName || item.title);
    setSuccessMessage("");
    setUploadError("");
  }

  async function handleRenameDocument(item: RequiredDocument) {
    if (!process) {
      return;
    }

    const trimmedName = renameValue.trim();

    if (!trimmedName) {
      setUploadError("Dosya adı boş bırakılamaz.");
      return;
    }

    try {
      const updatedDocuments = process.requiredDocuments.map((documentItem) =>
        documentItem.key === item.key
          ? { ...documentItem, fileName: trimmedName }
          : documentItem,
      );

      await persistDocuments(updatedDocuments);
      setRenamingDocumentKey(null);
      setRenameValue("");
      setSuccessMessage("Dosya adı başarıyla güncellendi.");
    } catch (error) {
      console.error("Dosya adı güncellenemedi:", error);
      setUploadError("Dosya adı güncellenirken bir hata oluştu.");
    }
  }

  const visibleDocuments = useMemo(() => {
    if (!process) return [];
    const term = searchTerm.trim().toLocaleLowerCase("tr-TR");
    const docs = process.requiredDocuments.filter((item) => {
      const status = item.status || "missing";
      const filterMatch =
        statusFilter === "all" ||
        (statusFilter === "missing"
          ? status !== "uploaded" && status !== "approved"
          : status === statusFilter);
      const searchMatch =
        !term ||
        item.title.toLocaleLowerCase("tr-TR").includes(term) ||
        item.fileName?.toLocaleLowerCase("tr-TR").includes(term) ||
        item.description?.toLocaleLowerCase("tr-TR").includes(term);
      return filterMatch && Boolean(searchMatch);
    });
    return [...docs].sort((a, b) => {
      if (sortMode === "name") return a.title.localeCompare(b.title, "tr");
      if (sortMode === "status")
        return (a.status || "missing").localeCompare(b.status || "missing");
      if (sortMode === "date")
        return (
          (b.uploadedAt?.toMillis?.() || 0) - (a.uploadedAt?.toMillis?.() || 0)
        );
      return 0;
    });
  }, [process, searchTerm, sortMode, statusFilter]);

  async function handleBulkDelete() {
    if (!process || selectedDocumentKeys.length === 0) return;
    if (
      !window.confirm(
        `${selectedDocumentKeys.length} belgeyi silmek istediğine emin misin?`,
      )
    )
      return;
    setIsBulkDeleting(true);
    setUploadError("");
    try {
      const selected = process.requiredDocuments.filter(
        (item) => selectedDocumentKeys.includes(item.key) && item.fileUrl,
      );
      await Promise.all(
        selected.map(async (item) => {
          if (item.storagePath) {
            try {
              await deleteObject(ref(storage, item.storagePath));
            } catch (error) {
              console.warn("Dosya silinemedi:", error);
            }
          }
        }),
      );
      const updated = process.requiredDocuments.map((item) =>
        selectedDocumentKeys.includes(item.key)
          ? {
              ...item,
              status: "missing",
              fileName: "",
              fileUrl: "",
              storagePath: "",
              fileSize: 0,
              contentType: "",
              uploadedAt: null,
              ocr: null,
              ocrError: "",
            }
          : item,
      );
      await persistDocuments(updated);
      setSelectedDocumentKeys([]);
      setSuccessMessage(`${selected.length} belge silindi.`);
    } catch (error) {
      console.error(error);
      setUploadError("Toplu silme işlemi tamamlanamadı.");
    } finally {
      setIsBulkDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <main dir={isRtlLanguage(language) ? "rtl" : "ltr"} className="flex min-h-[100dvh] items-center justify-center bg-[#030309] px-4 text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-violet-400" />

          <p className="mt-4 text-sm text-zinc-400">
            {pageCopy[language].loading}
          </p>
        </div>
      </main>
    );
  }

  if (errorMessage || !process) {
    return (
      <main dir={isRtlLanguage(language) ? "rtl" : "ltr"} className="flex min-h-[100dvh] items-center justify-center bg-[#030309] px-4 text-white">
        <section className="w-full max-w-lg rounded-3xl border border-red-400/20 bg-red-400/10 p-8 text-center">
          <h1 className="text-2xl font-semibold">{pageCopy[language].loadFailed}</h1>

          <p className="mt-3 text-sm leading-6 text-red-100/80">
            {errorMessage || pageCopy[language].noProcessInfo}
          </p>

          <Link
            href="/processes"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(139,92,246,0.20)] transition hover:brightness-110"
          >
            {pageCopy[language].back}
          </Link>
        </section>
      </main>
    );
  }

  const copy = pageCopy[language];
  const direction = isRtlLanguage(language)
    ? "rtl"
    : "ltr";

  const localizedProcessTitle =
    getLocalizedProcessTitle(
      {
        templateKey: process.templateKey,
        title: process.title,
      },
      language,
    ) || process.title;

  const localizedProcessDescription =
    (process.templateKey
      ? localizedProcessDescriptions[
          process.templateKey
        ]?.[language]
      : undefined) || process.description;

  const localizedCategory =
    localizedCategoryLabels[
      process.category
    ]?.[language] ||
    process.category ||
    copy.unspecified;

  const progress = Math.min(100, Math.max(0, Math.round(process.progress)));

  return (
    <main dir={direction} className="relative min-h-[100dvh] overflow-x-hidden bg-[#030309] px-3 py-6 text-white sm:px-6 sm:py-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-280px] h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-violet-700/12 blur-[165px]" />

        <div className="absolute right-[-240px] top-[28%] h-[560px] w-[560px] rounded-full bg-fuchsia-700/[0.08] blur-[175px]" />
        <div className="absolute bottom-[-320px] left-[-220px] h-[620px] w-[620px] rounded-full bg-violet-800/[0.08] blur-[180px]" />
        <div className="absolute left-1/2 top-[150px] h-[220px] w-[1050px] -translate-x-1/2 rounded-[50%] border-t border-fuchsia-400/25 shadow-[0_-18px_80px_rgba(168,85,247,0.12)]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <Link
          href="/processes"
          className="inline-flex max-w-full items-center gap-2 rounded-xl border border-white/[0.08] bg-[#090911]/80 px-4 py-2.5 text-sm font-semibold text-zinc-300 shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl transition hover:border-violet-400/30 hover:bg-violet-400/[0.06] hover:text-white"
        >
          <span aria-hidden="true">{direction === "rtl" ? "→" : "←"}</span>
          {pageCopy[language].back}
        </Link>

        <section className="mt-8 min-w-0 overflow-hidden rounded-[2rem] border border-violet-300/15 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.14),transparent_42%),linear-gradient(145deg,rgba(17,17,29,0.96),rgba(7,7,14,0.98))] p-5 shadow-[0_28px_90px_rgba(46,16,101,0.18)] backdrop-blur-2xl sm:p-8 lg:p-10">
          <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-violet-300">
                {copy.detail}
              </p>

              <h1 className="mt-4 break-words text-[2rem] font-bold leading-tight tracking-tight sm:text-5xl">
                {localizedProcessTitle}
              </h1>

              {process.description ? (
                <p className="mt-4 break-words leading-7 text-zinc-400">
                  {localizedProcessDescription}
                </p>
              ) : null}
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {getStatusLabel(process.status, language)}
            </div>
          </div>

          <div className="mt-10">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-zinc-400">{copy.overallProgress}</p>

                <p className="mt-1 text-3xl font-bold">%{progress}</p>
              </div>

              <p className="text-sm text-zinc-400">
                {process.completedDocumentCount} / {process.totalDocumentCount}{" "}
                {copy.documentsWord}
              </p>
            </div>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#151522]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0 rounded-2xl border border-white/[0.07] bg-black/10 p-4 sm:p-5">
              <p className="text-sm text-zinc-500">{copy.country}</p>
              <p className="mt-2 break-words font-semibold text-zinc-100">
                {getLocalizedCountryLabel(process.country, language)}
              </p>
            </div>

            <div className="min-w-0 rounded-2xl border border-white/[0.07] bg-black/10 p-4 sm:p-5">
              <p className="text-sm text-zinc-500">{copy.deadline}</p>
              <p className="mt-2 break-words font-semibold text-zinc-100">
                {formatDeadline(process.deadline, language)}
              </p>
            </div>

            <div className="min-w-0 rounded-2xl border border-white/[0.07] bg-black/10 p-4 sm:p-5">
              <p className="text-sm text-zinc-500">{copy.created}</p>
              <p className="mt-2 break-words font-semibold text-zinc-100">
                {formatDate(process.createdAt, language)}
              </p>
            </div>

            <div className="min-w-0 rounded-2xl border border-white/[0.07] bg-black/10 p-4 sm:p-5">
              <p className="text-sm text-zinc-500">{copy.category}</p>
              <p className="mt-2 break-words font-semibold text-zinc-100">
                {localizedCategory}
              </p>
            </div>
          </div>
        </section>

        <ProcessAiPanel process={process} />

        <section className="mt-6 min-w-0 rounded-[2rem] border border-white/[0.08] bg-[linear-gradient(145deg,rgba(17,17,28,0.93),rgba(8,8,15,0.96))] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.24)] backdrop-blur-2xl sm:p-8 lg:p-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-violet-300">
                {copy.documents}
              </p>

              <h2 className="mt-3 text-2xl font-bold">{copy.requiredList}</h2>

              <p className="mt-2 text-sm text-zinc-500">
                {copy.uploadInfo}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => bulkInputRef.current?.click()}
                disabled={Boolean(uploadState || bulkProgress)}
                className="w-full rounded-xl bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(139,92,246,0.20)] transition hover:brightness-110 disabled:opacity-50 sm:w-auto"
              >
                {bulkProgress
                  ? `${bulkProgress.current}/${bulkProgress.total} yükleniyor`
                  : copy.bulkUpload}
              </button>
              <input
                ref={bulkInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => void handleBulkUpload(event)}
              />
              {selectedDocumentKeys.length > 0 ? (
                <button
                  type="button"
                  onClick={() => void handleBulkDelete()}
                  disabled={isBulkDeleting}
                  className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-sm font-semibold text-red-200 disabled:opacity-50"
                >
                  {isBulkDeleting
                    ? copy.deleting
                    : fillTemplate(copy.deleteSelected, { count: selectedDocumentKeys.length })}
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-6 grid min-w-0 gap-3 md:grid-cols-3">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={copy.search}
              className="h-11 rounded-xl border border-white/10 bg-[#030309]/70 px-4 text-sm outline-none focus:border-violet-400/50"
            />
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as typeof statusFilter)
              }
              className="h-11 rounded-xl border border-white/10 bg-[#030309]/70 px-4 text-sm outline-none"
            >
              <option value="all">{copy.allStatuses}</option>
              <option value="missing">{copy.missing}</option>
              <option value="uploaded">{copy.uploaded}</option>
              <option value="approved">{copy.approved}</option>
            </select>
            <select
              value={sortMode}
              onChange={(event) =>
                setSortMode(event.target.value as typeof sortMode)
              }
              className="h-11 rounded-xl border border-white/10 bg-[#030309]/70 px-4 text-sm outline-none"
            >
              <option value="default">{copy.defaultSort}</option>
              <option value="name">{copy.sortName}</option>
              <option value="status">{copy.sortStatus}</option>
              <option value="date">{copy.sortDate}</option>
            </select>
          </div>

          {successMessage ? (
            <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
              {successMessage}
            </div>
          ) : null}

          {uploadError ? (
            <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
              {uploadError}
            </div>
          ) : null}

          {process.requiredDocuments.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-violet-400/20 bg-violet-500/[0.025] p-6 text-center text-sm text-zinc-500 sm:p-8">
              {copy.noDocuments}
            </div>
          ) : (
            <div className="mt-8 grid min-w-0 gap-4 md:grid-cols-2">
              {visibleDocuments.map((item, index) => {
                const isCompleted =
                  item.status === "uploaded" || item.status === "approved";

                const isUploading = uploadState?.documentKey === item.key;
                const isAnalyzing = ocrState?.documentKey === item.key;
                const localizedDocumentTitle =
                  getLocalizedDocumentTitle(
                    {
                      templateKey: process.templateKey,
                      processTitle: process.title,
                      documentKey: item.key,
                      documentTitle: item.title,
                    },
                    language,
                  ) || item.title;
                const localizedDocumentDescription =
                  getLocalizedDocumentDescription(
                    {
                      templateKey: process.templateKey,
                      processTitle: process.title,
                      documentKey: item.key,
                      documentDescription: item.description,
                    },
                    language,
                  );

                return (
                  <article
                    key={item.key || `${localizedDocumentTitle}-${index}`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDraggedDocumentKey(item.key);
                    }}
                    onDragLeave={() => setDraggedDocumentKey(null)}
                    onDrop={(event) => void handleDrop(event, item.key)}
                    className={`min-w-0 w-full max-w-full rounded-2xl border p-5 transition ${draggedDocumentKey === item.key ? "border-violet-400/60 bg-violet-500/10" : "border-white/[0.08] bg-black/10"}`}
                  >
                    <div className="flex flex-wrap items-start gap-3 sm:flex-nowrap sm:gap-4">
                      <input
                        type="checkbox"
                        checked={selectedDocumentKeys.includes(item.key)}
                        disabled={!item.fileUrl}
                        onChange={(event) =>
                          setSelectedDocumentKeys((current) =>
                            event.target.checked
                              ? [...current, item.key]
                              : current.filter((key) => key !== item.key),
                          )
                        }
                        className="mt-3 h-4 w-4 accent-violet-500 disabled:opacity-30"
                        aria-label={`${localizedDocumentTitle} belgesini seç`}
                      />
                      <div
                        className={
                          isCompleted
                            ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300"
                            : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-[#151522] text-zinc-400"
                        }
                      >
                        {isCompleted ? "✓" : index + 1}
                      </div>

                      <div className="min-w-0 basis-full flex-1 sm:basis-0">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="break-words font-semibold text-zinc-100">
                              {localizedDocumentTitle}
                            </h3>

                            <p className="mt-1 text-xs text-zinc-500">
                              {item.required === false
                                ? copy.conditional
                                : copy.required}
                            </p>
                          </div>

                          <span
                            className={
                              isCompleted
                                ? "rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200"
                                : "rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-200"
                            }
                          >
                            {getDocumentStatusLabel(item.status, language)}
                          </span>
                        </div>

                        {localizedDocumentDescription ? (
                          <p className="mt-3 break-words text-sm leading-6 text-zinc-400">
                            {localizedDocumentDescription}
                          </p>
                        ) : null}

                        {renamingDocumentKey === item.key ? (
                          <div className="mt-4 rounded-xl border border-violet-400/20 bg-[#030309]/70 p-3">
                            <input
                              autoFocus
                              value={renameValue}
                              onChange={(event) =>
                                setRenameValue(event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  void handleRenameDocument(item);
                                }
                                if (event.key === "Escape") {
                                  setRenamingDocumentKey(null);
                                  setRenameValue("");
                                }
                              }}
                              className="w-full rounded-lg border border-white/10 bg-[#090911] px-3 py-2 text-sm text-white outline-none focus:border-violet-400/60"
                            />
                            <div className="mt-3 flex gap-2">
                              <button
                                type="button"
                                onClick={() => void handleRenameDocument(item)}
                                className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 px-3 py-2 text-xs font-semibold text-white transition hover:brightness-110"
                              >
                                Kaydet
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRenamingDocumentKey(null);
                                  setRenameValue("");
                                }}
                                className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-white/5"
                              >
                                Vazgeç
                              </button>
                            </div>
                          </div>
                        ) : item.fileName ? (
                          <div className="mt-4 rounded-xl border border-white/10 bg-[#030309]/50 p-3">
                            <p className="max-w-full break-all text-sm leading-5 text-violet-200">
                              {item.fileName}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {item.fileSize
                                ? `${(item.fileSize / 1024 / 1024).toFixed(1)} MB`
                                : ""}
                              {item.uploadedAt
                                ? ` · ${formatDate(item.uploadedAt, language)}`
                                : ""}
                            </p>
                          </div>
                        ) : null}

                        {isUploading ? (
                          <div className="mt-4">
                            <div className="flex items-center justify-between text-xs text-zinc-400">
                              <span>{copy.uploading}</span>
                              <span>%{uploadState.progress}</span>
                            </div>

                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#151522]">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 transition-all"
                                style={{
                                  width: `${uploadState.progress}%`,
                                }}
                              />
                            </div>
                          </div>
                        ) : null}

                        {isAnalyzing ? (
                          <div className="mt-4 rounded-xl border border-violet-400/20 bg-violet-400/[0.07] p-4">
                            <div className="flex items-center gap-3">
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-300/30 border-t-violet-300" />
                              <div>
                                <p className="text-sm font-semibold text-violet-100">
                                  {ocrState.mode === "saving"
                                    ? copy.aiSaving
                                    : copy.aiAnalyzing}
                                </p>
                                <p className="mt-1 text-xs text-violet-200/60">
                                  {copy.extracting}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : item.ocr ? (
                          <DocumentIntelligenceCard
                            result={item.ocr}
                            language={language}
                            isBusy={Boolean(uploadState || ocrState)}
                            onReanalyze={() =>
                              void analyzeDocumentWithOcr(
                                item.key,
                                item.fileUrl || "",
                                item.fileName || localizedDocumentTitle,
                                item.contentType || "application/pdf",
                              )
                            }
                          />
                        ) : item.ocrError ? (
                          <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4">
                            <p className="text-sm font-semibold text-amber-100">
                              AI analizi tamamlanamadı
                            </p>
                            <p className="mt-1 text-xs leading-5 text-amber-200/70">
                              {item.ocrError}
                            </p>
                            {item.fileUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void analyzeDocumentWithOcr(
                                    item.key,
                                    item.fileUrl || "",
                                    item.fileName || localizedDocumentTitle,
                                    item.contentType || "application/pdf",
                                  )
                                }
                                disabled={Boolean(uploadState || ocrState)}
                                className="mt-3 rounded-lg border border-amber-300/20 px-3 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-400/10 disabled:opacity-50"
                              >
                                Tekrar dene
                              </button>
                            ) : null}
                          </div>
                        ) : item.fileUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              void analyzeDocumentWithOcr(
                                item.key,
                                item.fileUrl || "",
                                item.fileName || localizedDocumentTitle,
                                item.contentType || "application/pdf",
                              )
                            }
                            disabled={Boolean(uploadState || ocrState)}
                            className="mt-4 inline-flex items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/[0.06] px-4 py-2.5 text-sm font-semibold text-violet-200 transition hover:bg-violet-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            AI ile analiz et
                          </button>
                        ) : null}

                        <div className="mt-4 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:gap-3">
                          <label
                            className={
                              uploadState || ocrState
                                ? "inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-[#252536] px-4 py-2.5 text-sm font-semibold text-zinc-400 sm:w-auto"
                                : "inline-flex w-full cursor-pointer items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(139,92,246,0.16)] transition hover:brightness-110 sm:w-auto"
                            }
                          >
                            {isCompleted ? copy.uploadNew : copy.chooseFile}

                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                              className="hidden"
                              disabled={Boolean(uploadState || ocrState)}
                              onChange={(event) =>
                                handleFileChange(event, item.key)
                              }
                            />
                          </label>

                          <label
                            className={
                              uploadState || ocrState
                                ? "inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl border border-cyan-400/10 bg-[#252536] px-4 py-2.5 text-sm font-semibold text-zinc-400 sm:w-auto"
                                : "inline-flex w-full cursor-pointer items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/[0.08] px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/[0.14] sm:w-auto"
                            }
                          >
                            {copy.useCamera}

                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              capture="environment"
                              className="hidden"
                              disabled={Boolean(uploadState || ocrState)}
                              onChange={(event) =>
                                handleFileChange(event, item.key)
                              }
                            />
                          </label>

                          {item.fileUrl ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setPreviewDocument(item)}
                                className="inline-flex w-full items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:bg-white/10 sm:w-auto"
                              >
                                {copy.preview}
                              </button>
                              <button
                                type="button"
                                onClick={() => startRename(item)}
                                disabled={Boolean(
                                  uploadState || deletingDocumentKey,
                                )}
                                className="inline-flex w-full items-center justify-center rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                              >
                                {copy.rename}
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteDocument(item)}
                                disabled={Boolean(
                                  uploadState || deletingDocumentKey,
                                )}
                                className="inline-flex w-full items-center justify-center rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                              >
                                {deletingDocumentKey === item.key
                                  ? copy.deleting
                                  : copy.delete}
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {process.notes ? (
          <section className="mt-6 min-w-0 rounded-[2rem] border border-white/[0.08] bg-[linear-gradient(145deg,rgba(17,17,28,0.93),rgba(8,8,15,0.96))] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.24)] backdrop-blur-2xl sm:p-8 lg:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-violet-300">
              Notlar
            </p>

            <p className="mt-4 whitespace-pre-wrap break-words leading-7 text-zinc-300">
              {process.notes}
            </p>
          </section>
        ) : null}
      </div>

      {previewDocument?.fileUrl ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={copy.previewLabel}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setPreviewDocument(null)}
        >
          <div
            className="flex h-[88dvh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-[#05050b] shadow-[0_30px_100px_rgba(0,0,0,0.60)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-col gap-3 border-b border-white/[0.08] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="min-w-0">
                <p className="break-all font-semibold text-white">
                  {previewDocument.fileName || previewDocument.title}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {previewDocument.contentType || copy.document}
                </p>
              </div>
              <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto">
                <a
                  href={previewDocument.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-white/[0.08] px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-white/5"
                >
                  Yeni sekmede aç
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDocument(null)}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                >
                  {copy.close}
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 bg-[#090911]">
              {previewDocument.contentType?.startsWith("image/") ? (
                <div className="flex h-full items-center justify-center overflow-auto p-4">
                  <div className="relative h-full w-full">
                    <Image
                      src={previewDocument.fileUrl}
                      alt={previewDocument.fileName || previewDocument.title}
                      fill
                      unoptimized
                      sizes="100vw"
                      className="rounded-xl object-contain"
                    />
                  </div>
                </div>
              ) : (
                <iframe
                  src={previewDocument.fileUrl}
                  title={previewDocument.fileName || previewDocument.title}
                  className="h-full w-full border-0"
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}