"use client";

type IntelligenceSeverity =
  | "info"
  | "warning"
  | "critical";

export type DocumentIntelligenceItem = {
  code: string;
  severity: IntelligenceSeverity;
  message: string;
};

export type DocumentIntelligenceField = {
  key: string;
  label: string;
  value: string;
  confidence: number;
};

export type DocumentIntelligenceResult = {
  rawText: string;
  documentType: string;
  fields: DocumentIntelligenceField[];
  intelligence?: {
    documentType: string;
    documentMatch:
      | "match"
      | "possible_match"
      | "mismatch"
      | "unknown";
    qualityScore: number;
    isReadable: boolean;
    mrzDetected: boolean;
    expiryStatus:
      | "valid"
      | "expiring_soon"
      | "expired"
      | "not_applicable"
      | "unknown";
    summary: string;
    nextAction: string;
    warnings: DocumentIntelligenceItem[];
    risks: DocumentIntelligenceItem[];
  };
  analyzedAt: string;
};

type Language =
  | "tr"
  | "de"
  | "en"
  | "ru"
  | "ar"
  | "fa";

type Props = {
  result: DocumentIntelligenceResult;
  language: Language;
  isBusy?: boolean;
  onReanalyze: () => void;
};

const copy = {
  tr: {
    title: "AI Belge Analizi",
    documentType: "Belge türü",
    match: "Eşleşme",
    quality: "Kalite",
    readability: "Okunabilirlik",
    mrz: "MRZ",
    expiry: "Geçerlilik",
    summary: "AI özeti",
    nextAction: "Sonraki adım",
    warnings: "Uyarılar",
    risks: "Riskler",
    extractedFields: "Çıkarılan bilgiler",
    fullText: "Okunan tam metni göster",
    reanalyze: "Yeniden analiz et",
    found: "Bulundu",
    notFound: "Bulunamadı",
    readable: "Okunabilir",
    unreadable: "Okunabilir değil",
    confidence: "Güven",
    matchValues: {
      match: "Beklenen belgeyle eşleşiyor",
      possible_match: "Olası eşleşme",
      mismatch: "Beklenen belgeyle eşleşmiyor",
      unknown: "Belirlenemedi",
    },
    expiryValues: {
      valid: "Geçerli",
      expiring_soon: "Yakında sona eriyor",
      expired: "Süresi dolmuş",
      not_applicable: "Uygulanamaz",
      unknown: "Belirlenemedi",
    },
  },
  de: {
    title: "KI-Dokumentenanalyse",
    documentType: "Dokumenttyp",
    match: "Übereinstimmung",
    quality: "Qualität",
    readability: "Lesbarkeit",
    mrz: "MRZ",
    expiry: "Gültigkeit",
    summary: "KI-Zusammenfassung",
    nextAction: "Nächster Schritt",
    warnings: "Hinweise",
    risks: "Risiken",
    extractedFields: "Erkannte Angaben",
    fullText: "Vollständigen Text anzeigen",
    reanalyze: "Erneut analysieren",
    found: "Gefunden",
    notFound: "Nicht gefunden",
    readable: "Lesbar",
    unreadable: "Nicht lesbar",
    confidence: "Sicherheit",
    matchValues: {
      match: "Entspricht dem erwarteten Dokument",
      possible_match: "Mögliche Übereinstimmung",
      mismatch: "Entspricht nicht dem erwarteten Dokument",
      unknown: "Nicht bestimmbar",
    },
    expiryValues: {
      valid: "Gültig",
      expiring_soon: "Läuft bald ab",
      expired: "Abgelaufen",
      not_applicable: "Nicht zutreffend",
      unknown: "Nicht bestimmbar",
    },
  },
  en: {
    title: "AI Document Intelligence",
    documentType: "Document type",
    match: "Match",
    quality: "Quality",
    readability: "Readability",
    mrz: "MRZ",
    expiry: "Validity",
    summary: "AI summary",
    nextAction: "Next action",
    warnings: "Warnings",
    risks: "Risks",
    extractedFields: "Extracted information",
    fullText: "Show full extracted text",
    reanalyze: "Analyze again",
    found: "Found",
    notFound: "Not found",
    readable: "Readable",
    unreadable: "Not readable",
    confidence: "Confidence",
    matchValues: {
      match: "Matches the expected document",
      possible_match: "Possible match",
      mismatch: "Does not match the expected document",
      unknown: "Could not be determined",
    },
    expiryValues: {
      valid: "Valid",
      expiring_soon: "Expiring soon",
      expired: "Expired",
      not_applicable: "Not applicable",
      unknown: "Could not be determined",
    },
  },
  ru: {
    title: "ИИ-анализ документа",
    documentType: "Тип документа",
    match: "Соответствие",
    quality: "Качество",
    readability: "Читаемость",
    mrz: "MRZ",
    expiry: "Срок действия",
    summary: "Резюме ИИ",
    nextAction: "Следующий шаг",
    warnings: "Предупреждения",
    risks: "Риски",
    extractedFields: "Извлечённые данные",
    fullText: "Показать полный текст",
    reanalyze: "Повторить анализ",
    found: "Найдено",
    notFound: "Не найдено",
    readable: "Читаемо",
    unreadable: "Нечитаемо",
    confidence: "Уверенность",
    matchValues: {
      match: "Соответствует ожидаемому документу",
      possible_match: "Возможное соответствие",
      mismatch: "Не соответствует ожидаемому документу",
      unknown: "Не удалось определить",
    },
    expiryValues: {
      valid: "Действителен",
      expiring_soon: "Скоро истекает",
      expired: "Срок истёк",
      not_applicable: "Не применимо",
      unknown: "Не удалось определить",
    },
  },
  ar: {
    title: "تحليل المستند بالذكاء الاصطناعي",
    documentType: "نوع المستند",
    match: "المطابقة",
    quality: "الجودة",
    readability: "قابلية القراءة",
    mrz: "MRZ",
    expiry: "الصلاحية",
    summary: "ملخص الذكاء الاصطناعي",
    nextAction: "الخطوة التالية",
    warnings: "تنبيهات",
    risks: "مخاطر",
    extractedFields: "البيانات المستخرجة",
    fullText: "عرض النص الكامل",
    reanalyze: "إعادة التحليل",
    found: "موجود",
    notFound: "غير موجود",
    readable: "مقروء",
    unreadable: "غير مقروء",
    confidence: "الثقة",
    matchValues: {
      match: "يطابق المستند المتوقع",
      possible_match: "مطابقة محتملة",
      mismatch: "لا يطابق المستند المتوقع",
      unknown: "تعذر التحديد",
    },
    expiryValues: {
      valid: "صالح",
      expiring_soon: "سينتهي قريبًا",
      expired: "منتهي الصلاحية",
      not_applicable: "غير منطبق",
      unknown: "تعذر التحديد",
    },
  },
  fa: {
    title: "تحلیل مدرک با هوش مصنوعی",
    documentType: "نوع مدرک",
    match: "تطابق",
    quality: "کیفیت",
    readability: "خوانایی",
    mrz: "MRZ",
    expiry: "اعتبار",
    summary: "خلاصه هوش مصنوعی",
    nextAction: "گام بعدی",
    warnings: "هشدارها",
    risks: "ریسک‌ها",
    extractedFields: "اطلاعات استخراج‌شده",
    fullText: "نمایش متن کامل",
    reanalyze: "تحلیل دوباره",
    found: "یافت شد",
    notFound: "یافت نشد",
    readable: "خوانا",
    unreadable: "ناخوانا",
    confidence: "اطمینان",
    matchValues: {
      match: "با مدرک مورد انتظار مطابقت دارد",
      possible_match: "تطابق احتمالی",
      mismatch: "با مدرک مورد انتظار مطابقت ندارد",
      unknown: "قابل تشخیص نیست",
    },
    expiryValues: {
      valid: "معتبر",
      expiring_soon: "به‌زودی منقضی می‌شود",
      expired: "منقضی شده",
      not_applicable: "قابل اعمال نیست",
      unknown: "قابل تشخیص نیست",
    },
  },
} as const;

function statusClass(
  status: string,
): string {
  if (
    status === "match" ||
    status === "valid"
  ) {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-100";
  }

  if (
    status === "mismatch" ||
    status === "expired"
  ) {
    return "border-red-400/20 bg-red-400/10 text-red-100";
  }

  return "border-amber-400/20 bg-amber-400/10 text-amber-100";
}

function issueClass(
  severity: IntelligenceSeverity,
): string {
  if (severity === "critical") {
    return "border-red-400/20 bg-red-400/[0.08] text-red-100";
  }

  if (severity === "warning") {
    return "border-amber-400/20 bg-amber-400/[0.08] text-amber-100";
  }

  return "border-sky-400/20 bg-sky-400/[0.08] text-sky-100";
}

export default function DocumentIntelligenceCard({
  result,
  language,
  isBusy = false,
  onReanalyze,
}: Props) {
  const t = copy[language];
  const intelligence = result.intelligence;
  const fields = Array.isArray(result.fields)
    ? result.fields.filter(
        (field) =>
          field.value &&
          String(field.value).trim(),
      )
    : [];

  if (!intelligence) {
    return (
      <section className="mt-4 min-w-0 w-full rounded-2xl border border-violet-400/20 bg-violet-400/[0.06] p-4">
        <div className="flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="break-words text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">
              {t.title}
            </p>
            <p className="mt-1 break-words text-sm font-semibold text-violet-100">
              {result.documentType}
            </p>
          </div>
          <button
            type="button"
            onClick={onReanalyze}
            disabled={isBusy}
            className="w-full rounded-lg border border-violet-300/20 px-3 py-2 text-xs font-semibold text-violet-200 transition hover:bg-violet-400/10 disabled:opacity-50 sm:w-auto"
          >
            {t.reanalyze}
          </button>
        </div>
      </section>
    );
  }

  const matchLabel =
    t.matchValues[intelligence.documentMatch];
  const expiryLabel =
    t.expiryValues[intelligence.expiryStatus];

  return (
    <section className="mt-4 min-w-0 w-full overflow-hidden rounded-2xl border border-violet-400/20 bg-violet-400/[0.055]">
      <div className="border-b border-white/10 p-4 sm:p-5">
        <div className="flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="break-words text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">
              {t.title}
            </p>
            <p className="mt-1 break-words text-base font-semibold text-violet-50">
              {intelligence.documentType ||
                result.documentType}
            </p>
          </div>

          <button
            type="button"
            onClick={onReanalyze}
            disabled={isBusy}
            className="w-full rounded-lg border border-violet-300/20 px-3 py-2 text-xs font-semibold text-violet-200 transition hover:bg-violet-400/10 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {t.reanalyze}
          </button>
        </div>
      </div>

      <div className="grid min-w-0 gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
        <div className="min-w-0 rounded-xl border border-white/10 bg-slate-950/40 p-3">
          <p className="text-[11px] text-slate-500">
            {t.match}
          </p>
          <p
            className={`mt-2 inline-flex max-w-full whitespace-normal break-words rounded-2xl border px-2.5 py-1 text-center text-xs font-medium leading-5 ${statusClass(
              intelligence.documentMatch,
            )}`}
          >
            {matchLabel}
          </p>
        </div>

        <div className="min-w-0 rounded-xl border border-white/10 bg-slate-950/40 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500">
              {t.quality}
            </p>
            <span className="text-sm font-semibold text-white">
              {Math.round(
                intelligence.qualityScore,
              )}
              /100
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-violet-400 transition-all"
              style={{
                width: `${Math.max(
                  0,
                  Math.min(
                    100,
                    intelligence.qualityScore,
                  ),
                )}%`,
              }}
            />
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-white/10 bg-slate-950/40 p-3">
          <p className="text-[11px] text-slate-500">
            {t.readability}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-100">
            {intelligence.isReadable
              ? `✓ ${t.readable}`
              : `⚠ ${t.unreadable}`}
          </p>
        </div>

        <div className="min-w-0 rounded-xl border border-white/10 bg-slate-950/40 p-3">
          <p className="text-[11px] text-slate-500">
            {t.mrz}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-100">
            {intelligence.mrzDetected
              ? `✓ ${t.found}`
              : `— ${t.notFound}`}
          </p>
        </div>

        <div className="min-w-0 rounded-xl border border-white/10 bg-slate-950/40 p-3 sm:col-span-2">
          <p className="text-[11px] text-slate-500">
            {t.expiry}
          </p>
          <p
            className={`mt-2 inline-flex max-w-full whitespace-normal break-words rounded-2xl border px-2.5 py-1 text-center text-xs font-medium leading-5 ${statusClass(
              intelligence.expiryStatus,
            )}`}
          >
            {expiryLabel}
          </p>
        </div>
      </div>

      {intelligence.summary ? (
        <div className="border-t border-white/10 px-4 py-4 sm:px-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {t.summary}
          </p>
          <p className="break-words mt-2 text-sm leading-6 text-slate-200">
            {intelligence.summary}
          </p>
        </div>
      ) : null}

      {intelligence.warnings.length > 0 ? (
        <div className="border-t border-white/10 px-4 py-4 sm:px-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-300">
            {t.warnings}
          </p>
          <div className="mt-3 space-y-2">
            {intelligence.warnings.map(
              (warning, index) => (
                <div
                  key={`${warning.code}-${index}`}
                  className={`min-w-0 break-words rounded-xl border px-3 py-2.5 text-sm leading-5 ${issueClass(
                    warning.severity,
                  )}`}
                >
                  {warning.message}
                </div>
              ),
            )}
          </div>
        </div>
      ) : null}

      {intelligence.risks.length > 0 ? (
        <div className="border-t border-white/10 px-4 py-4 sm:px-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-red-300">
            {t.risks}
          </p>
          <div className="mt-3 space-y-2">
            {intelligence.risks.map(
              (risk, index) => (
                <div
                  key={`${risk.code}-${index}`}
                  className={`min-w-0 break-words rounded-xl border px-3 py-2.5 text-sm leading-5 ${issueClass(
                    risk.severity,
                  )}`}
                >
                  {risk.message}
                </div>
              ),
            )}
          </div>
        </div>
      ) : null}

      {intelligence.nextAction ? (
        <div className="border-t border-white/10 bg-indigo-400/[0.06] px-4 py-4 sm:px-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-300">
            {t.nextAction}
          </p>
          <p className="break-words mt-2 text-sm font-medium leading-6 text-indigo-50">
            → {intelligence.nextAction}
          </p>
        </div>
      ) : null}

      {fields.length > 0 ? (
        <div className="border-t border-white/10 px-4 py-4 sm:px-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
            {t.extractedFields}
          </p>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {fields.map((field) => (
              <div
                key={`${field.key}-${field.value}`}
                className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2.5"
              >
                <dt className="grid min-w-0 grid-cols-1 gap-1 text-[11px] text-slate-500 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-2">
                  <span className="min-w-0 break-all sm:break-words">{field.label}</span>
                  <span className="min-w-0 break-words sm:whitespace-nowrap">
                    {t.confidence}:{" "}
                    {Math.round(
                      field.confidence * 100,
                    )}
                    %
                  </span>
                </dt>
                <dd className="mt-1 min-w-0 break-all text-sm text-slate-200 sm:break-words">
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {result.rawText ? (
        <details className="border-t border-white/10 px-4 py-4 sm:px-5">
          <summary className="cursor-pointer text-xs font-semibold text-violet-200">
            {t.fullText}
          </summary>
          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-slate-950/60 p-3 text-xs leading-5 text-slate-300">
            {result.rawText}
          </pre>
        </details>
      ) : null}
    </section>
  );
}