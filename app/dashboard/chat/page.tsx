"use client";

import {
  FormEvent,
  KeyboardEvent,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { Capacitor, registerPlugin } from "@capacitor/core";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import {
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
  readStoredLanguage,
  storeLanguage,
} from "@/lib/i18n";

type Language =
  | "tr"
  | "de"
  | "en"
  | "ru"
  | "ar"
  | "fa";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  attachmentName?: string;
  category?: string;
  topic?: string;
  suggestedActions?: string[];
  officialBodies?: string[];
  importantNotice?: string;
  createdAt: string;
};

type ChatAttachment = {
  name: string;
  mimeType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp";
  data: string;
  kind: "image" | "pdf";
};

type NativeDocumentCameraResult = {
  base64: string;
  mimeType: "image/jpeg";
  name: string;
};

type NativeDocumentCameraPlugin = {
  capture(): Promise<NativeDocumentCameraResult>;
};

const NativeDocumentCamera =
  registerPlugin<NativeDocumentCameraPlugin>("NativeDocumentCamera");

type Profile = {
  fullName: string;
  country: string;
  federalState: string;
  city: string;
  language: Language;
  maritalStatus: string;
  childrenCount?: number;
  employmentStatus: string;
  healthInsurance: string;
  taxClass: string;
  residenceStatus: string;
  subscription: string;
};

type ProcessItem = {
  id: string;
  title: string;
  status: string;
  progress?: number;
  deadline?: string;
  requiredDocuments: Array<{
    title: string;
    status: string;
    required?: boolean;
  }>;
};

type DocumentItem = {
  title: string;
  documentType: string;
  status: string;
  expiryDate: string;
  summary: string;
};

type ChatApiResponse = {
  success?: boolean;
  error?: string;
  retryable?: boolean;
  data?: {
    answer: string;
    category: string;
    topic: string;
    confidence: "high" | "medium" | "low";
    needsClarification: boolean;
    followUpQuestions: string[];
    suggestedActions: string[];
    officialBodies: string[];
    importantNotice: string;
    language: Language;
    createdAt: string;
  };
};

const supportedLanguages: {
  code: Language;
  label: string;
}[] = [
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
  { code: "tr", label: "Türkçe" },
  { code: "ru", label: "Русский" },
  { code: "ar", label: "العربية" },
  { code: "fa", label: "فارسی" },
];

const copy: Record<
  Language,
  Record<string, string>
> = {
  tr: {
    title: "AL Yaşam Asistanı",
    subtitle:
      "Almanya'daki resmî işlemler, sosyal haklar, vergi, sağlık, iş, konut ve günlük yaşam hakkında sor.",
    placeholder: "AL'e bir soru yaz...",
    send: "Gönder",
    sending: "AL düşünüyor...",
    newChat: "Yeni sohbet",
    back: "Ana ekrana dön",
    welcomeTitle: "Merhaba {name} 👋",
    welcomeText:
      "Bugün sana hangi konuda yardımcı olabilirim?",
    warning:
      "AL genel yönlendirme sunar. Önemli kararlarda resmî kurum veya uzman desteğini kontrol et.",
    actions: "Önerilen adımlar",
    bodies: "İlgili kurumlar",
    notice: "Önemli not",
    retry: "Tekrar dene",
    error: "Bir hata oluştu.",
    topics: "Örnek sorular",
    q1: "Kindergeld başvurusu için neler gerekiyor?",
    q2: "Ev sahibim Kaution'u geri vermiyor. Ne yapmalıyım?",
    q3: "Steuererklärung için hangi belgeler gerekli?",
    q4: "Krankenkasse diş protezinin ne kadarını karşılar?",
    attach: "Ekle",
    camera: "Kamerayı kullan",
    chooseAttachment: "Fotoğraf veya dosya seç",
    removeAttachment: "Eki kaldır",
    attachmentReady: "Ek hazır",
    preparingAttachment: "Dosya hazırlanıyor...",
    attachmentTooLarge: "Dosya çok büyük. PDF en fazla 2 MB olmalı; fotoğraflar otomatik küçültülür.",
    attachmentTypeError: "Yalnızca PDF, JPG, PNG veya WEBP dosyaları destekleniyor.",
    cameraError: "Kamera açılamadı. Tekrar deneyebilir veya mevcut bir fotoğraf seçebilirsin.",
    documentPrompt: "Bu belgeyi incele. Ne olduğunu, önemli bilgileri, riskleri ve benim atmam gereken sonraki adımları açıkla.",
  },
  de: {
    title: "AL Lebensassistent",
    subtitle:
      "Frage zu Behörden, Sozialleistungen, Steuern, Gesundheit, Arbeit, Wohnen und Alltag in Deutschland.",
    placeholder: "Schreibe AL deine Frage...",
    send: "Senden",
    sending: "AL denkt nach...",
    newChat: "Neuer Chat",
    back: "Zur Startseite",
    welcomeTitle: "Hallo {name} 👋",
    welcomeText:
      "Wobei kann ich dir heute helfen?",
    warning:
      "AL bietet allgemeine Orientierung. Prüfe wichtige Entscheidungen bei der zuständigen Behörde oder einer Fachperson.",
    actions: "Empfohlene Schritte",
    bodies: "Zuständige Stellen",
    notice: "Wichtiger Hinweis",
    retry: "Erneut versuchen",
    error: "Ein Fehler ist aufgetreten.",
    topics: "Beispielfragen",
    q1: "Welche Unterlagen brauche ich für Kindergeld?",
    q2: "Mein Vermieter zahlt die Kaution nicht zurück. Was kann ich tun?",
    q3: "Welche Unterlagen brauche ich für die Steuererklärung?",
    q4: "Wie viel zahlt die Krankenkasse für Zahnersatz?",
    attach: "Anhängen",
    camera: "Kamera verwenden",
    chooseAttachment: "Foto oder Datei auswählen",
    removeAttachment: "Anhang entfernen",
    attachmentReady: "Anhang bereit",
    preparingAttachment: "Datei wird vorbereitet...",
    attachmentTooLarge: "Die Datei ist zu groß. PDFs dürfen höchstens 2 MB groß sein; Fotos werden automatisch verkleinert.",
    attachmentTypeError: "Unterstützt werden nur PDF, JPG, PNG oder WEBP.",
    cameraError: "Die Kamera konnte nicht geöffnet werden. Versuche es erneut oder wähle ein vorhandenes Foto.",
    documentPrompt: "Analysiere dieses Dokument. Erkläre, was es ist, welche wichtigen Informationen und Risiken es enthält und was ich als Nächstes tun sollte.",
  },
  en: {
    title: "AL Life Assistant",
    subtitle:
      "Ask about public services, benefits, taxes, health, work, housing and daily life in Germany.",
    placeholder: "Ask AL a question...",
    send: "Send",
    sending: "AL is thinking...",
    newChat: "New chat",
    back: "Back to home",
    welcomeTitle: "Hello {name} 👋",
    welcomeText:
      "How can I help you today?",
    warning:
      "AL provides general guidance. Verify important decisions with the responsible authority or a qualified professional.",
    actions: "Suggested actions",
    bodies: "Relevant authorities",
    notice: "Important note",
    retry: "Try again",
    error: "Something went wrong.",
    topics: "Example questions",
    q1: "What documents are required for Kindergeld?",
    q2: "My landlord is not returning my deposit. What should I do?",
    q3: "Which documents do I need for a tax return?",
    q4: "How much does health insurance pay for dentures?",
    attach: "Attach",
    camera: "Use camera",
    chooseAttachment: "Choose photo or file",
    removeAttachment: "Remove attachment",
    attachmentReady: "Attachment ready",
    preparingAttachment: "Preparing file...",
    attachmentTooLarge: "The file is too large. PDFs may be up to 2 MB; photos are automatically reduced.",
    attachmentTypeError: "Only PDF, JPG, PNG or WEBP files are supported.",
    cameraError: "The camera could not be opened. Try again or choose an existing photo.",
    documentPrompt: "Analyze this document. Explain what it is, the important information and risks, and what I should do next.",
  },
  ru: {
    title: "AL — помощник по жизни",
    subtitle:
      "Задавайте вопросы о ведомствах, пособиях, налогах, здоровье, работе, жилье и повседневной жизни в Германии.",
    placeholder: "Напишите вопрос для AL...",
    send: "Отправить",
    sending: "AL готовит ответ...",
    newChat: "Новый чат",
    back: "На главную",
    welcomeTitle: "Здравствуйте, {name} 👋",
    welcomeText:
      "Чем я могу помочь сегодня?",
    warning:
      "AL предоставляет общую информацию. Важные решения следует уточнять в официальном ведомстве или у специалиста.",
    actions: "Рекомендуемые шаги",
    bodies: "Ответственные ведомства",
    notice: "Важное примечание",
    retry: "Повторить",
    error: "Произошла ошибка.",
    topics: "Примеры вопросов",
    q1: "Какие документы нужны для Kindergeld?",
    q2: "Арендодатель не возвращает залог. Что делать?",
    q3: "Какие документы нужны для налоговой декларации?",
    q4: "Сколько касса оплачивает за зубные протезы?",
    attach: "Прикрепить",
    camera: "Использовать камеру",
    chooseAttachment: "Выбрать фото или файл",
    removeAttachment: "Удалить вложение",
    attachmentReady: "Вложение готово",
    preparingAttachment: "Подготовка файла...",
    attachmentTooLarge: "Файл слишком большой. PDF — не более 2 МБ; фотографии автоматически уменьшаются.",
    attachmentTypeError: "Поддерживаются только PDF, JPG, PNG и WEBP.",
    cameraError: "Не удалось открыть камеру. Попробуйте ещё раз или выберите готовое фото.",
    documentPrompt: "Проанализируй этот документ. Объясни, что это, какие важные сведения и риски он содержит и что мне делать дальше.",
  },
  ar: {
    title: "مساعد الحياة AL",
    subtitle:
      "اسأل عن الدوائر الرسمية والمساعدات والضرائب والصحة والعمل والسكن والحياة اليومية في ألمانيا.",
    placeholder: "اكتب سؤالك إلى AL...",
    send: "إرسال",
    sending: "AL يجهز الإجابة...",
    newChat: "محادثة جديدة",
    back: "العودة إلى الصفحة الرئيسية",
    welcomeTitle: "مرحبًا {name} 👋",
    welcomeText:
      "كيف يمكنني مساعدتك اليوم؟",
    warning:
      "يقدم AL إرشادات عامة. تحقق من القرارات المهمة لدى الجهة الرسمية أو المختص.",
    actions: "الخطوات المقترحة",
    bodies: "الجهات المختصة",
    notice: "ملاحظة مهمة",
    retry: "إعادة المحاولة",
    error: "حدث خطأ.",
    topics: "أسئلة نموذجية",
    q1: "ما الوثائق المطلوبة لطلب Kindergeld؟",
    q2: "المالك لا يعيد مبلغ التأمين. ماذا أفعل؟",
    q3: "ما الوثائق المطلوبة للإقرار الضريبي؟",
    q4: "كم تدفع شركة التأمين الصحي لطقم الأسنان؟",
    attach: "إرفاق",
    camera: "استخدام الكاميرا",
    chooseAttachment: "اختيار صورة أو ملف",
    removeAttachment: "إزالة المرفق",
    attachmentReady: "المرفق جاهز",
    preparingAttachment: "جارٍ تجهيز الملف...",
    attachmentTooLarge: "الملف كبير جدًا. الحد الأقصى لملفات PDF هو 2 ميغابايت، ويتم تصغير الصور تلقائيًا.",
    attachmentTypeError: "يتم دعم PDF وJPG وPNG وWEBP فقط.",
    cameraError: "تعذر فتح الكاميرا. حاول مرة أخرى أو اختر صورة موجودة.",
    documentPrompt: "حلّل هذا المستند. اشرح ما هو، والمعلومات والمخاطر المهمة فيه، وما الخطوات التالية التي ينبغي علي اتخاذها.",
  },
  fa: {
    title: "دستیار زندگی AL",
    subtitle:
      "درباره ادارات، کمک‌هزینه‌ها، مالیات، سلامت، کار، مسکن و زندگی روزمره در آلمان بپرسید.",
    placeholder: "پرسش خود را برای AL بنویسید...",
    send: "ارسال",
    sending: "AL در حال آماده‌سازی پاسخ است...",
    newChat: "گفت‌وگوی جدید",
    back: "بازگشت به خانه",
    welcomeTitle: "سلام {name} 👋",
    welcomeText:
      "امروز چگونه می‌توانم کمک کنم؟",
    warning:
      "AL راهنمایی عمومی ارائه می‌دهد. تصمیم‌های مهم را با اداره مسئول یا متخصص بررسی کنید.",
    actions: "گام‌های پیشنهادی",
    bodies: "مراجع مرتبط",
    notice: "نکته مهم",
    retry: "تلاش دوباره",
    error: "خطایی رخ داد.",
    topics: "پرسش‌های نمونه",
    q1: "برای درخواست Kindergeld چه مدارکی لازم است؟",
    q2: "صاحبخانه ودیعه را پس نمی‌دهد. چه کنم؟",
    q3: "برای اظهارنامه مالیاتی چه مدارکی لازم است؟",
    q4: "بیمه درمانی چه مقدار از هزینه پروتز دندان را می‌پردازد؟",
    attach: "پیوست",
    camera: "استفاده از دوربین",
    chooseAttachment: "انتخاب عکس یا فایل",
    removeAttachment: "حذف پیوست",
    attachmentReady: "پیوست آماده است",
    preparingAttachment: "در حال آماده‌سازی فایل...",
    attachmentTooLarge: "فایل بیش از حد بزرگ است. PDF حداکثر ۲ مگابایت؛ عکس‌ها به‌صورت خودکار کوچک می‌شوند.",
    attachmentTypeError: "فقط PDF، JPG، PNG یا WEBP پشتیبانی می‌شود.",
    cameraError: "دوربین باز نشد. دوباره تلاش کنید یا یک عکس موجود را انتخاب کنید.",
    documentPrompt: "این سند را تحلیل کن. توضیح بده چیست، چه اطلاعات و ریسک‌های مهمی دارد و قدم بعدی من چه باید باشد.",
  },
};

const MAX_PDF_ATTACHMENT_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_ATTACHMENT_BYTES = 1_500_000;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = () => reject(reader.error || new Error("FileReader failed"));
    reader.readAsDataURL(file);
  });
}

async function compressImageFile(file: File): Promise<ChatAttachment> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new window.Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Image could not be decoded"));
      element.src = objectUrl;
    });

    const maxDimension = 1600;
    const scale = Math.min(
      1,
      maxDimension / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable");

    context.drawImage(image, 0, 0, width, height);

    let quality = 0.78;
    let blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );

    while (blob && blob.size > MAX_IMAGE_ATTACHMENT_BYTES && quality > 0.48) {
      quality -= 0.1;
      blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      );
    }

    if (!blob || blob.size > MAX_IMAGE_ATTACHMENT_BYTES) {
      throw new Error("IMAGE_TOO_LARGE");
    }

    return {
      name: file.name.replace(/\.[^.]+$/, "") + ".jpg",
      mimeType: "image/jpeg",
      data: await fileToBase64(blob),
      kind: "image",
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function prepareAttachment(file: File): Promise<ChatAttachment> {
  if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
    throw new Error("TYPE");
  }

  if (file.type === "application/pdf") {
    if (file.size > MAX_PDF_ATTACHMENT_BYTES) {
      throw new Error("TOO_LARGE");
    }

    return {
      name: file.name,
      mimeType: "application/pdf",
      data: await fileToBase64(file),
      kind: "pdf",
    };
  }

  return compressImageFile(file);
}

function normalizeLanguage(
  value: unknown,
): Language {
  return supportedLanguages.some(
    (item) => item.code === value,
  )
    ? (value as Language)
    : "tr";
}

function readString(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function createMessage(
  role: ChatRole,
  content: string,
  extra?: Partial<ChatMessage>,
): ChatMessage {
  return {
    id:
      typeof crypto !== "undefined" &&
      "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
    role,
    content,
    createdAt: new Date().toISOString(),
    ...extra,
  };
}

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scrollAnchorRef =
    useRef<HTMLDivElement | null>(null);
  const initialQuestionHandled =
    useRef(false);
  const initialAttachmentActionHandled =
    useRef(false);
  const attachmentInputRef =
    useRef<HTMLInputElement | null>(null);

  const [user, setUser] =
    useState<User | null>(null);
  const [profile, setProfile] =
    useState<Profile | null>(null);
  const [processes, setProcesses] =
    useState<ProcessItem[]>([]);
  const [documents, setDocuments] =
    useState<DocumentItem[]>([]);
  const [language, setLanguage] =
  useState<Language>(() =>
    normalizeLanguage(readStoredLanguage("tr")),
  );
  const [messages, setMessages] =
    useState<ChatMessage[]>([]);
  const [draft, setDraft] =
    useState("");
  const [isLoading, setIsLoading] =
    useState(true);
  const [isSending, setIsSending] =
    useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");
  const [attachment, setAttachment] =
    useState<ChatAttachment | null>(null);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] =
    useState(false);
  const [isPreparingAttachment, setIsPreparingAttachment] =
    useState(false);

  const t = copy[language];
  const isRtl =
    language === "ar" ||
    language === "fa";

  const displayName = useMemo(() => {
    const fullName =
      profile?.fullName ||
      user?.displayName ||
      user?.email?.split("@")[0] ||
      "ALQEV";

    return fullName.split(/\s+/)[0];
  }, [profile, user]);

  const exampleQuestions = [
    t.q1,
    t.q2,
    t.q3,
    t.q4,
  ];

  

  useEffect(() => {
    let mounted = true;

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (currentUser) => {
          if (!currentUser) {
            router.replace("/login");
            return;
          }

          if (!mounted) return;

          setUser(currentUser);

          try {
            const userRef = doc(
              db,
              "users",
              currentUser.uid,
            );

            const processRef =
              collection(
                db,
                "users",
                currentUser.uid,
                "processes",
              );

            const [
              userSnapshot,
              processSnapshot,
            ] = await Promise.all([
              getDoc(userRef),
              getDocs(
                query(
                  processRef,
                  orderBy(
                    "createdAt",
                    "desc",
                  ),
                ),
              ).catch(() =>
                getDocs(processRef),
              ),
            ]);

            if (!mounted) return;

            if (
              userSnapshot.exists()
            ) {
              const data =
                userSnapshot.data();

              const savedLanguage =
                normalizeLanguage(
                  readStoredLanguage(
                    normalizeLanguage(
                      data.language,
                    ),
                  ),
                );

              setLanguage(savedLanguage);

              setProfile({
                fullName:
                  readString(
                    data.fullName,
                  ) ||
                  currentUser.displayName ||
                  currentUser.email?.split(
                    "@",
                  )[0] ||
                  "ALQEV",
                country:
                  readString(
                    data.country,
                  ),
                federalState:
                  readString(
                    data.federalState,
                  ),
                city: readString(
                  data.city,
                ),
                language:
                  savedLanguage,
                maritalStatus:
                  readString(
                    data.maritalStatus,
                  ),
                childrenCount:
                  typeof data.childrenCount ===
                    "number"
                    ? data.childrenCount
                    : undefined,
                employmentStatus:
                  readString(
                    data.employmentStatus,
                  ),
                healthInsurance:
                  readString(
                    data.healthInsurance,
                  ),
                taxClass:
                  readString(
                    data.taxClass,
                  ),
                residenceStatus:
                  readString(
                    data.residenceStatus,
                  ),
                subscription:
                  readString(
                    data.subscription,
                  ) || "free",
              });
            }

            const normalizedProcesses =
              processSnapshot.docs.map(
                (processDocument) => {
                  const data =
                    processDocument.data();

                  const requiredDocuments =
                    Array.isArray(
                      data.requiredDocuments,
                    )
                      ? data.requiredDocuments
                          .filter(
                            (
                              item: unknown,
                            ): item is Record<
                              string,
                              unknown
                            > =>
                              Boolean(
                                item,
                              ) &&
                              typeof item ===
                                "object",
                          )
                          .map(
                            (item) => ({
                              title:
                                readString(
                                  item.title,
                                ),
                              status:
                                readString(
                                  item.status,
                                ),
                              required:
                                typeof item.required ===
                                "boolean"
                                  ? item.required
                                  : undefined,
                            }),
                          )
                      : [];

                  return {
                    id:
                      processDocument.id,
                    title:
                      readString(
                        data.title,
                      ),
                    status:
                      readString(
                        data.status,
                      ),
                    progress:
                      typeof data.progress ===
                      "number"
                        ? data.progress
                        : undefined,
                    deadline:
                      readString(
                        data.deadline,
                      ),
                    requiredDocuments,
                  };
                },
              );

            setProcesses(
              normalizedProcesses,
            );

            const normalizedDocuments =
              normalizedProcesses.flatMap(
                (processItem) =>
                  processItem.requiredDocuments.map(
                    (item) => ({
                      title:
                        item.title,
                      documentType: "",
                      status:
                        item.status,
                      expiryDate: "",
                      summary: "",
                    }),
                  ),
              );

            setDocuments(
              normalizedDocuments,
            );
          } catch (error) {
            console.error(
              "Chat bağlamı yüklenemedi:",
              error,
            );
          } finally {
            if (mounted) {
              setIsLoading(false);
            }
          }
        },
      );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView(
      {
        behavior: "smooth",
      },
    );
  }, [messages, isSending]);

  const handleAttachmentFile = useCallback(
    async (file: File | undefined) => {
      if (!file || isSending || isPreparingAttachment) return;

      setErrorMessage("");
      setIsPreparingAttachment(true);
      setIsAttachmentMenuOpen(false);

      try {
        const prepared = await prepareAttachment(file);
        setAttachment(prepared);
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        setErrorMessage(
          code === "TYPE"
            ? t.attachmentTypeError
            : t.attachmentTooLarge,
        );
      } finally {
        setIsPreparingAttachment(false);
      }
    },
    [isPreparingAttachment, isSending, t.attachmentTooLarge, t.attachmentTypeError],
  );

  const handleNativeCamera = useCallback(async () => {
    if (isSending || isPreparingAttachment) return;

    setErrorMessage("");
    setIsAttachmentMenuOpen(false);
    setIsPreparingAttachment(true);

    try {
      if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
        throw new Error("NATIVE_CAMERA_UNAVAILABLE");
      }

      const result = await NativeDocumentCamera.capture();

      if (!result.base64) {
        throw new Error("NO_DATA");
      }

      const approximateBytes = Math.floor(result.base64.length * 0.75);
      if (approximateBytes > MAX_IMAGE_ATTACHMENT_BYTES) {
        throw new Error("TOO_LARGE");
      }

      setAttachment({
        name: result.name || `camera-${Date.now()}.jpg`,
        mimeType: "image/jpeg",
        data: result.base64,
        kind: "image",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (/CAMERA_CANCELLED|cancel|canceled|cancelled/i.test(message)) {
        return;
      }

      setErrorMessage(
        /TOO_LARGE|IMAGE_TOO_LARGE/i.test(message)
          ? t.attachmentTooLarge
          : t.cameraError,
      );
    } finally {
      setIsPreparingAttachment(false);
    }
  }, [isPreparingAttachment, isSending, t.attachmentTooLarge, t.cameraError]);

  const sendMessage = useCallback(
    async (rawMessage: string) => {
      const typedMessage = rawMessage.trim();
      const activeAttachment = attachment;
      const message =
        typedMessage || (activeAttachment ? t.documentPrompt : "");

      if (!message || isSending || isPreparingAttachment) {
        return;
      }

      const userMessage =
        createMessage("user", message, {
          attachmentName: activeAttachment?.name,
        });

      const previousMessages =
        messages.slice(-20);

      setMessages((current) => [
        ...current,
        userMessage,
      ]);
      setDraft("");
      setAttachment(null);
      setIsAttachmentMenuOpen(false);
      setErrorMessage("");
      setIsSending(true);

      try {
        if (!user) {
          throw new Error(t.error);
        }

     const idToken = await user.getIdToken(true);

        const response = await fetch(
          "/api/chat",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              message,
              language,
              attachment: activeAttachment,
              history:
                previousMessages.map(
                  (item) => ({
                    role: item.role,
                    content:
                      item.content,
                  }),
                ),
            }),
          },
        );

        const payload =
          (await response.json()) as ChatApiResponse;

        if (
          !response.ok ||
          !payload.success ||
          !payload.data
        ) {
          throw new Error(
            payload.error ||
              t.error,
          );
        }

        const assistantMessage =
          createMessage(
            "assistant",
            payload.data.answer,
            {
              category:
                payload.data.category,
              topic:
                payload.data.topic,
              suggestedActions:
                payload.data
                  .suggestedActions,
              officialBodies:
                payload.data
                  .officialBodies,
              importantNotice:
                payload.data
                  .importantNotice,
            },
          );

        setMessages((current) => [
          ...current,
          assistantMessage,
        ]);
      } catch (error) {
        const messageText =
          error instanceof Error
            ? error.message
            : t.error;

        setErrorMessage(messageText);
      } finally {
        setIsSending(false);
      }
    },
    [
      attachment,
      displayName,
      documents,
      isPreparingAttachment,
      isSending,
      language,
      messages,
      processes,
      profile,
      t.documentPrompt,
      t.error,
      user,
    ],
  );

  useEffect(() => {
    if (
      isLoading ||
      initialAttachmentActionHandled.current
    ) {
      return;
    }

    const action = searchParams.get("action");
    if (action !== "camera" && action !== "file") {
      return;
    }

    initialAttachmentActionHandled.current = true;

    const timer = window.setTimeout(() => {
      setIsAttachmentMenuOpen(true);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isLoading, searchParams]);

  useEffect(() => {
    if (
      isLoading ||
      initialQuestionHandled.current
    ) {
      return;
    }

    const initialQuestion =
      searchParams.get("question")?.trim();

    initialQuestionHandled.current = true;

    if (initialQuestion) {
      const timer = window.setTimeout(() => {
        void sendMessage(
          initialQuestion,
        );
      }, 0);

      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [isLoading, searchParams, sendMessage]);

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    void sendMessage(draft);
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      void sendMessage(draft);
    }
  }

  function handleLanguageChange(
    nextLanguage: Language,
  ) {
    setLanguage(nextLanguage);
    storeLanguage(nextLanguage);
  }

  function resetChat() {
    setMessages([]);
    setDraft("");
    setAttachment(null);
    setIsAttachmentMenuOpen(false);
    setErrorMessage("");
    router.replace("/dashboard/chat");
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#060b1b] px-6 text-white">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
          <span className="h-3 w-3 animate-pulse rounded-full bg-indigo-400" />
          <span className="text-sm text-slate-300">
            ALQEV...
          </span>
        </div>
      </main>
    );
  }

  return (
    <main
      dir={isRtl ? "rtl" : "ltr"}
      className="min-h-screen bg-[#060b1b] text-white"
    >
      <div className="mx-auto flex min-h-screen max-w-[1500px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/[0.035] px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-400/30 bg-indigo-500/15 text-lg font-bold text-indigo-100">
              AL
            </div>

            <div>
              <h1 className="font-semibold text-white">
                {t.title}
              </h1>
              <p className="text-xs text-slate-400">
                ALQEV
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <select
              value={language}
              onChange={(event) =>
                handleLanguageChange(
                  event.target
                    .value as Language,
                )
              }
              className="rounded-xl border border-white/10 bg-[#0b1227] px-3 py-2 text-sm text-slate-200 outline-none"
              aria-label="Language"
            >
              {supportedLanguages.map(
                (item) => (
                  <option
                    key={item.code}
                    value={item.code}
                  >
                    {item.label}
                  </option>
                ),
              )}
            </select>

            <button
              type="button"
              onClick={resetChat}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:border-indigo-400/40 hover:text-white"
            >
              {t.newChat}
            </button>

            <Link
              href="/dashboard"
              className="rounded-xl bg-indigo-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
            >
              {t.back}
            </Link>
          </div>
        </header>

        <section className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-h-[72vh] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0a1126]">
            <div className="border-b border-white/10 px-5 py-5 sm:px-7">
              <h2 className="text-2xl font-bold sm:text-3xl">
                {t.welcomeTitle.replace(
                  "{name}",
                  displayName,
                )}
              </h2>
              <p className="mt-2 text-slate-300">
                {t.welcomeText}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-7">
              {messages.length === 0 ? (
                <div className="mx-auto flex h-full max-w-3xl flex-col justify-center py-8">
                  <p className="text-center text-sm font-medium text-slate-400">
                    {t.topics}
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {exampleQuestions.map(
                      (question) => (
                        <button
                          key={question}
                          type="button"
                          onClick={() =>
                            void sendMessage(
                              question,
                            )
                          }
                          className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-start text-sm leading-6 text-slate-200 transition hover:-translate-y-0.5 hover:border-indigo-400/40 hover:bg-indigo-400/[0.07]"
                        >
                          {question}
                          <span className="mt-3 block text-indigo-300">
                            →
                          </span>
                        </button>
                      ),
                    )}
                  </div>
                </div>
              ) : (
                <div className="mx-auto max-w-4xl space-y-5">
                  {messages.map(
                    (message) => (
                      <article
                        key={message.id}
                        className={`flex ${
                          message.role ===
                          "user"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[92%] rounded-3xl border px-5 py-4 sm:max-w-[82%] ${
                            message.role ===
                            "user"
                              ? "border-indigo-400/30 bg-indigo-500 text-white"
                              : "border-white/10 bg-white/[0.045] text-slate-100"
                          }`}
                        >
                          {message.attachmentName ? (
                            <div className="mb-3 inline-flex max-w-full items-center gap-2 rounded-xl border border-white/15 bg-black/10 px-3 py-2 text-xs">
                              <span aria-hidden="true">📎</span>
                              <span className="truncate">
                                {message.attachmentName}
                              </span>
                            </div>
                          ) : null}

                          <p className="whitespace-pre-wrap text-sm leading-7 sm:text-[15px]">
                            {
                              message.content
                            }
                          </p>

                          {message
                            .suggestedActions &&
                            message
                              .suggestedActions
                              .length > 0 && (
                              <div className="mt-5 border-t border-white/10 pt-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-300">
                                  {
                                    t.actions
                                  }
                                </p>
                                <div className="mt-3 space-y-2">
                                  {message.suggestedActions.map(
                                    (
                                      item,
                                      index,
                                    ) => (
                                      <div
                                        key={`${item}-${index}`}
                                        className="flex gap-3 text-sm leading-6 text-slate-300"
                                      >
                                        <span className="text-indigo-300">
                                          {index +
                                            1}.
                                        </span>
                                        <span>
                                          {
                                            item
                                          }
                                        </span>
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}

                          {message
                            .officialBodies &&
                            message
                              .officialBodies
                              .length > 0 && (
                              <div className="mt-5">
                                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                                  {
                                    t.bodies
                                  }
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {message.officialBodies.map(
                                    (item) => (
                                      <span
                                        key={item}
                                        className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300"
                                      >
                                        {
                                          item
                                        }
                                      </span>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}

                          {message
                            .importantNotice && (
                            <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-3">
                              <p className="text-xs font-semibold text-amber-200">
                                {
                                  t.notice
                                }
                              </p>
                              <p className="mt-1 text-xs leading-5 text-amber-100/80">
                                {
                                  message.importantNotice
                                }
                              </p>
                            </div>
                          )}
                        </div>
                      </article>
                    ),
                  )}

                  {isSending && (
                    <div className="flex justify-start">
                      <div className="rounded-3xl border border-white/10 bg-white/[0.045] px-5 py-4">
                        <div className="flex items-center gap-3 text-sm text-slate-300">
                          <span className="flex gap-1">
                            <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-300 [animation-delay:-0.3s]" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-300 [animation-delay:-0.15s]" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-300" />
                          </span>
                          {t.sending}
                        </div>
                      </div>
                    </div>
                  )}

                  <div
                    ref={scrollAnchorRef}
                  />
                </div>
              )}
            </div>

            <div className="border-t border-white/10 bg-[#080f22] p-4 sm:p-5">
              {errorMessage && (
                <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/[0.07] px-4 py-3 text-sm text-rose-100">
                  <span>
                    {errorMessage}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setErrorMessage("")
                    }
                    className="text-rose-200"
                  >
                    ×
                  </button>
                </div>
              )}

              {(attachment || isPreparingAttachment) && (
                <div className="mx-auto mb-3 flex max-w-5xl items-center justify-between gap-3 rounded-2xl border border-indigo-400/25 bg-indigo-400/[0.07] px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-300">
                      {isPreparingAttachment ? t.preparingAttachment : t.attachmentReady}
                    </p>
                    {attachment ? (
                      <p className="mt-1 truncate text-sm text-slate-200">
                        📎 {attachment.name}
                      </p>
                    ) : null}
                  </div>

                  {attachment && !isSending ? (
                    <button
                      type="button"
                      onClick={() => setAttachment(null)}
                      className="shrink-0 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/5"
                    >
                      {t.removeAttachment}
                    </button>
                  ) : null}
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                className="mx-auto max-w-5xl"
              >
                <div className="rounded-3xl border border-white/10 bg-[#050a18] p-3 focus-within:border-indigo-400/40">
                  <textarea
                    value={draft}
                    onChange={(event) =>
                      setDraft(
                        event.target.value,
                      )
                    }
                    onKeyDown={
                      handleKeyDown
                    }
                    rows={3}
                    maxLength={4000}
                    placeholder={
                      t.placeholder
                    }
                    className="w-full resize-none bg-transparent px-2 py-2 text-sm leading-6 text-white outline-none placeholder:text-slate-600"
                  />

                  <div className="mt-2 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                    <div className="relative flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setIsAttachmentMenuOpen((current) => !current)
                        }
                        disabled={isSending || isPreparingAttachment}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-xl text-slate-200 transition hover:border-indigo-400/40 hover:bg-indigo-400/[0.08] disabled:opacity-40"
                        aria-label={t.attach}
                        title={t.attach}
                      >
                        +
                      </button>

                      {isAttachmentMenuOpen ? (
                        <div
                          className={`absolute bottom-12 z-30 w-64 rounded-2xl border border-white/10 bg-[#0b1227] p-2 shadow-2xl ${
                            isRtl ? "right-0" : "left-0"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => void handleNativeCamera()}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-start text-sm text-slate-200 transition hover:bg-white/[0.06]"
                          >
                            <span aria-hidden="true">📷</span>
                            <span>{t.camera}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsAttachmentMenuOpen(false);
                              attachmentInputRef.current?.click();
                            }}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-start text-sm text-slate-200 transition hover:bg-white/[0.06]"
                          >
                            <span aria-hidden="true">📎</span>
                            <span>{t.chooseAttachment}</span>
                          </button>
                        </div>
                      ) : null}

                      <input
                        ref={attachmentInputRef}
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          void handleAttachmentFile(file);
                        }}
                      />

                      <p className="hidden text-xs text-slate-500 sm:block">
                        {t.warning}
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={
                        isSending ||
                        isPreparingAttachment ||
                        (!draft.trim() && !attachment)
                      }
                      className="ms-auto rounded-2xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isSending
                        ? t.sending
                        : `${t.send} →`}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          <aside className="hidden rounded-[28px] border border-white/10 bg-white/[0.025] p-5 lg:block">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/15 font-semibold text-indigo-200">
                AL
              </div>
              <div>
                <p className="font-semibold">
                  {t.title}
                </p>
                <p className="text-xs text-emerald-300">
                  ● Online
                </p>
              </div>
            </div>

            <p className="mt-5 text-sm leading-6 text-slate-400">
              {t.subtitle}
            </p>

            <div className="mt-6 rounded-2xl border border-white/10 bg-[#080f22] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                ALQEV
              </p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">
                    Language
                  </span>
                  <span className="text-slate-200">
                    {
                      supportedLanguages.find(
                        (item) =>
                          item.code ===
                          language,
                      )?.label
                    }
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">
                    Processes
                  </span>
                  <span className="text-slate-200">
                    {processes.length}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">
                    Documents
                  </span>
                  <span className="text-slate-200">
                    {documents.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] p-4 text-xs leading-5 text-amber-100/75">
              {t.warning}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#060b1b] px-6 text-white">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
            <span className="h-3 w-3 animate-pulse rounded-full bg-indigo-400" />
            <span className="text-sm text-slate-300">
              ALQEV...
            </span>
          </div>
        </main>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}