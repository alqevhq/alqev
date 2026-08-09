"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import {
  analyzeProcess,
  type AdvisorProcess,
  type AdvisorRecommendation,
  type AdvisorSeverity,
} from "@/lib/ai/process-advisor";
import { auth, db } from "@/lib/firebase";
import { normalizeSubscriptionPlan } from "@/lib/subscription";
import {
  getLocalizedDocumentTitle,
} from "@/lib/process-templates";
import {
  readStoredLanguage,
  type Language,
} from "@/lib/i18n";

type ProcessWithTemplate = AdvisorProcess & {
  templateKey?: string;
};

type ProcessAiPanelProps = {
  process: ProcessWithTemplate;
};

type SubscriptionPlan = "free" | "premium";

const severityStyles: Record<AdvisorSeverity, string> = {
  success:
    "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-100",
  info:
    "border-blue-400/20 bg-blue-400/[0.07] text-blue-100",
  warning:
    "border-amber-400/20 bg-amber-400/[0.07] text-amber-100",
  critical:
    "border-red-400/20 bg-red-400/[0.07] text-red-100",
};

const severityIcons: Record<AdvisorSeverity, string> = {
  success: "✓",
  info: "i",
  warning: "!",
  critical: "!",
};

const copy = {
  tr: {
    readinessVeryHigh: "Başvuruya çok yakın",
    readinessHigh: "İyi ilerliyor",
    readinessMedium: "Hazırlık devam ediyor",
    readinessLow: "Kritik belgeler eksik",
    complete: "Belge listesi tamamlandı",
    estimatedDays: "Yaklaşık {count} gün",
    premiumFeature: "Premium özellik",
    premiumLocked: "AI Risk Analizi kilitli",
    premiumText:
      "Ayrıntılı riskleri, tarih uyarılarını, tahmini hazırlık süresini ve önceliklendirilmiş AI yol haritasını görmek için Premium plana geç.",
    detailedRisks: "Ayrıntılı risk listesi",
    roadmap: "AI yol haritası",
    dateRisk: "Tarih riski",
    priorityNext: "Öncelikli sonraki adım",
    upgrade: "Premium'a yükselt",
    freeAnalysis: "Free analiz",
    readinessAnalysis: "Hazırlık analizi",
    completedSummary:
      "{completed} / {total} belge tamamlandı. Zorunlu belgeler puanı daha fazla etkiler.",
    estimatedReady: "Tahmini hazır olma",
    noCriticalDate: "Kritik tarih riski yok",
    deadlinePassed: "Hedef tarih geçti",
    deadlineToday: "Hedef tarih bugün",
    daysLeft: "{count} gün kaldı",
    freeSummary: "Free plan özeti",
    freeSummaryText:
      "Temel hazırlık puanın ve tamamlanan belge sayın gösteriliyor. Ayrıntılı tarih ve risk analizi Premium plana dahildir.",
    checkingPlan: "Abonelik bilgisi kontrol ediliyor...",
    nextBestStep: "Sonraki en iyi adım",
    documentsReady: "Belge listen hazır",
    documentsReadyText:
      "Eksik belge görünmüyor. Bilgileri son kez kontrol ederek başvuru adımına geçebilirsin.",
    risksAndSuggestions: "AI riskleri ve önerileri",
    suggestionCount: "{count} öneri",
    noExtraRisk:
      "Şu anda ek bir risk veya eksik adım tespit edilmedi.",
    missingDocument: "Eksik belge",
    uploadMissingDocument:
      "“{document}” belgesini yüklemen gerekiyor.",
    deadlineExpired: "Süre doldu",
    deadlineExpiredMessage:
      "Bu sürecin hedef tarihi geçmiş görünüyor.",
    deadlineApproaching: "Yaklaşan son tarih",
    deadlineApproachingMessage:
      "Son tarihe {count} gün kaldı.",
    allComplete: "Harika!",
    allCompleteMessage:
      "Tüm zorunlu belgeler tamamlanmış görünüyor.",
    readinessScore: "Hazırlık puanı",
    readinessScoreMessage:
      "Genel hazırlık puanın %{score}.",
    ocrAnalysisFailed: "Belge analizi başarısız",
    ocrAnalysisFailedMessage:
      "“{document}” belgesi analiz edilemedi.",
    documentQualityCritical: "Belge kalitesi çok düşük",
    documentQualityCriticalMessage:
      "“{document}” belgesinin görüntü kalitesi başvuru için yetersiz görünüyor.",
    documentQualityLow: "Belge kalitesi iyileştirilmeli",
    documentQualityLowMessage:
      "“{document}” belgesinin görüntü kalitesi düşük görünüyor.",
    documentNotReadable: "Belge okunamıyor",
    documentNotReadableMessage:
      "“{document}” belgesinin içeriği güvenilir biçimde okunamadı.",
    documentMismatch: "Yüklenen belge istenen belgeyle eşleşmiyor",
    documentMismatchMessage:
      "“{document}” belgesi istenen belge türüyle eşleşmiyor gibi görünüyor.",
    documentPossibleMismatch: "Belge eşleşmesi belirsiz",
    documentPossibleMismatchMessage:
      "ALQEV, “{document}” belgesinin istenen belge olduğunu kesin olarak doğrulayamadı.",
    documentExpired: "Belgenin süresi dolmuş",
    documentExpiredMessage:
      "“{document}” belgesinin süresi dolmuş görünüyor.",
    documentExpiringSoon: "Belgenin süresi yakında doluyor",
    documentExpiringSoonMessage:
      "“{document}” belgesinin süresi yakında dolacak gibi görünüyor.",
    documentWarning: "Belge uyarısı",
    documentRisk: "Belge riski",
    invalidDeadline: "Geçersiz hedef tarih",
    invalidDeadlineMessage:
      "Kaydedilen hedef tarih yorumlanamadı.",
    deadlineTodayDetailed: "Son tarih bugün",
    deadlineTodayDetailedMessage:
      "Bu sürecin hedef tarihi bugün.",
    deadlineUrgent: "Son tarih çok yakın",
    deadlineUrgentMessage:
      "Hedef tarihe yalnızca {count} gün kaldı.",
    processNotActive: "Süreç aktif değil",
    processNotActiveMessage:
      "Mevcut süreç durumu “{status}”.",
    processPaused: "Süreç duraklatıldı",
    processPausedMessage:
      "Bu süreç şu anda duraklatılmış durumda.",

  },
  de: {
    readinessVeryHigh: "Fast bereit für den Antrag",
    readinessHigh: "Guter Fortschritt",
    readinessMedium: "Vorbereitung läuft",
    readinessLow: "Kritische Dokumente fehlen",
    complete: "Dokumentenliste vollständig",
    estimatedDays: "Etwa {count} Tage",
    premiumFeature: "Premium-Funktion",
    premiumLocked: "KI-Risikoanalyse gesperrt",
    premiumText:
      "Wechsle zu Premium, um detaillierte Risiken, Fristwarnungen, die geschätzte Vorbereitungszeit und eine priorisierte KI-Roadmap zu sehen.",
    detailedRisks: "Detaillierte Risikoliste",
    roadmap: "KI-Roadmap",
    dateRisk: "Fristrisiko",
    priorityNext: "Priorisierter nächster Schritt",
    upgrade: "Auf Premium upgraden",
    freeAnalysis: "Kostenlose Analyse",
    readinessAnalysis: "Bereitschaftsanalyse",
    completedSummary:
      "{completed} von {total} Dokumenten abgeschlossen. Pflichtdokumente werden stärker gewichtet.",
    estimatedReady: "Geschätzte Bereitschaft",
    noCriticalDate: "Kein kritisches Fristrisiko",
    deadlinePassed: "Frist überschritten",
    deadlineToday: "Frist ist heute",
    daysLeft: "Noch {count} Tage",
    freeSummary: "Zusammenfassung des kostenlosen Tarifs",
    freeSummaryText:
      "Der grundlegende Bereitschaftswert und die Zahl abgeschlossener Dokumente werden angezeigt. Detaillierte Frist- und Risikoanalysen sind Premium.",
    checkingPlan: "Abonnement wird geprüft...",
    nextBestStep: "Bester nächster Schritt",
    documentsReady: "Dokumentenliste ist bereit",
    documentsReadyText:
      "Es fehlen keine Dokumente. Prüfe die Angaben ein letztes Mal und fahre mit dem Antrag fort.",
    risksAndSuggestions: "KI-Risiken und Empfehlungen",
    suggestionCount: "{count} Empfehlungen",
    noExtraRisk:
      "Derzeit wurden keine weiteren Risiken oder fehlenden Schritte erkannt.",
    missingDocument: "Fehlendes Dokument",
    uploadMissingDocument:
      "Das Dokument „{document}“ muss hochgeladen werden.",
    deadlineExpired: "Frist abgelaufen",
    deadlineExpiredMessage:
      "Die Frist dieses Vorgangs ist offenbar abgelaufen.",
    deadlineApproaching: "Bevorstehende Frist",
    deadlineApproachingMessage:
      "Noch {count} Tage bis zur Frist.",
    allComplete: "Sehr gut!",
    allCompleteMessage:
      "Alle Pflichtdokumente scheinen vollständig zu sein.",
    readinessScore: "Bereitschaftswert",
    readinessScoreMessage:
      "Dein allgemeiner Bereitschaftswert beträgt %{score}.",
    ocrAnalysisFailed: "Dokumentenanalyse fehlgeschlagen",
    ocrAnalysisFailedMessage:
      "Das Dokument „{document}“ konnte nicht analysiert werden.",
    documentQualityCritical: "Dokumentqualität ist zu niedrig",
    documentQualityCriticalMessage:
      "Die Bildqualität von „{document}“ scheint für den Antrag nicht ausreichend zu sein.",
    documentQualityLow: "Dokumentqualität sollte verbessert werden",
    documentQualityLowMessage:
      "Die Bildqualität von „{document}“ scheint niedrig zu sein.",
    documentNotReadable: "Dokument ist nicht lesbar",
    documentNotReadableMessage:
      "Der Inhalt von „{document}“ konnte nicht zuverlässig gelesen werden.",
    documentMismatch: "Das hochgeladene Dokument stimmt nicht überein",
    documentMismatchMessage:
      "„{document}“ scheint nicht dem angeforderten Dokumenttyp zu entsprechen.",
    documentPossibleMismatch: "Dokumentzuordnung ist unsicher",
    documentPossibleMismatchMessage:
      "ALQEV konnte nicht sicher bestätigen, dass „{document}“ das angeforderte Dokument ist.",
    documentExpired: "Dokument ist abgelaufen",
    documentExpiredMessage:
      "„{document}“ scheint abgelaufen zu sein.",
    documentExpiringSoon: "Dokument läuft bald ab",
    documentExpiringSoonMessage:
      "„{document}“ scheint bald abzulaufen.",
    documentWarning: "Dokumentenhinweis",
    documentRisk: "Dokumentenrisiko",
    invalidDeadline: "Ungültiges Zieldatum",
    invalidDeadlineMessage:
      "Das gespeicherte Zieldatum konnte nicht interpretiert werden.",
    deadlineTodayDetailed: "Frist ist heute",
    deadlineTodayDetailedMessage:
      "Das Zieldatum dieses Vorgangs ist heute.",
    deadlineUrgent: "Frist ist sehr nah",
    deadlineUrgentMessage:
      "Bis zum Zieldatum bleiben nur noch {count} Tage.",
    processNotActive: "Vorgang ist nicht aktiv",
    processNotActiveMessage:
      "Der aktuelle Vorgangsstatus ist „{status}“.",
    processPaused: "Vorgang ist pausiert",
    processPausedMessage:
      "Dieser Vorgang ist derzeit pausiert.",

  },
  en: {
    readinessVeryHigh: "Almost ready to apply",
    readinessHigh: "Making good progress",
    readinessMedium: "Preparation in progress",
    readinessLow: "Critical documents are missing",
    complete: "Document list completed",
    estimatedDays: "About {count} days",
    premiumFeature: "Premium feature",
    premiumLocked: "AI Risk Analysis is locked",
    premiumText:
      "Upgrade to Premium to see detailed risks, deadline alerts, estimated preparation time, and a prioritized AI roadmap.",
    detailedRisks: "Detailed risk list",
    roadmap: "AI roadmap",
    dateRisk: "Deadline risk",
    priorityNext: "Prioritized next step",
    upgrade: "Upgrade to Premium",
    freeAnalysis: "Free analysis",
    readinessAnalysis: "Readiness analysis",
    completedSummary:
      "{completed} of {total} documents completed. Required documents carry more weight.",
    estimatedReady: "Estimated readiness",
    noCriticalDate: "No critical deadline risk",
    deadlinePassed: "Target date has passed",
    deadlineToday: "Target date is today",
    daysLeft: "{count} days left",
    freeSummary: "Free plan summary",
    freeSummaryText:
      "Your basic readiness score and completed document count are shown. Detailed deadline and risk analysis is included in Premium.",
    checkingPlan: "Checking subscription...",
    nextBestStep: "Best next step",
    documentsReady: "Your document list is ready",
    documentsReadyText:
      "No missing documents were found. Review the information once more and continue to the application step.",
    risksAndSuggestions: "AI risks and recommendations",
    suggestionCount: "{count} recommendations",
    noExtraRisk:
      "No additional risk or missing step was detected.",
    missingDocument: "Missing document",
    uploadMissingDocument:
      "You need to upload “{document}”.",
    deadlineExpired: "Deadline expired",
    deadlineExpiredMessage:
      "This process appears to be past its deadline.",
    deadlineApproaching: "Upcoming deadline",
    deadlineApproachingMessage:
      "{count} days remain until the deadline.",
    allComplete: "Great!",
    allCompleteMessage:
      "All required documents appear to be complete.",
    readinessScore: "Readiness score",
    readinessScoreMessage:
      "Your overall readiness score is %{score}.",
    ocrAnalysisFailed: "Document analysis failed",
    ocrAnalysisFailedMessage:
      "The document “{document}” could not be analyzed.",
    documentQualityCritical: "Document quality is too low",
    documentQualityCriticalMessage:
      "The image quality of “{document}” appears insufficient for the application.",
    documentQualityLow: "Document quality should be improved",
    documentQualityLowMessage:
      "The image quality of “{document}” appears low.",
    documentNotReadable: "Document is not readable",
    documentNotReadableMessage:
      "The content of “{document}” could not be read reliably.",
    documentMismatch: "The uploaded document does not match",
    documentMismatchMessage:
      "“{document}” appears not to match the requested document type.",
    documentPossibleMismatch: "Document match is uncertain",
    documentPossibleMismatchMessage:
      "ALQEV could not confirm with certainty that “{document}” is the requested document.",
    documentExpired: "Document has expired",
    documentExpiredMessage:
      "“{document}” appears to have expired.",
    documentExpiringSoon: "Document expires soon",
    documentExpiringSoonMessage:
      "“{document}” appears to expire soon.",
    documentWarning: "Document warning",
    documentRisk: "Document risk",
    invalidDeadline: "Invalid target date",
    invalidDeadlineMessage:
      "The saved target date could not be interpreted.",
    deadlineTodayDetailed: "Deadline is today",
    deadlineTodayDetailedMessage:
      "The target date of this process is today.",
    deadlineUrgent: "Deadline is very close",
    deadlineUrgentMessage:
      "Only {count} day(s) remain until the target date.",
    processNotActive: "Process is not active",
    processNotActiveMessage:
      "The current process status is “{status}”.",
    processPaused: "Process is paused",
    processPausedMessage:
      "This process is currently paused.",

  },
  ru: {
    readinessVeryHigh: "Почти готово к подаче",
    readinessHigh: "Хороший прогресс",
    readinessMedium: "Подготовка продолжается",
    readinessLow: "Не хватает важных документов",
    complete: "Список документов завершён",
    estimatedDays: "Примерно {count} дней",
    premiumFeature: "Премиум-функция",
    premiumLocked: "Анализ рисков ИИ заблокирован",
    premiumText:
      "Перейдите на Premium, чтобы увидеть подробные риски, предупреждения о сроках, оценку времени подготовки и приоритетную дорожную карту ИИ.",
    detailedRisks: "Подробный список рисков",
    roadmap: "Дорожная карта ИИ",
    dateRisk: "Риск по срокам",
    priorityNext: "Приоритетный следующий шаг",
    upgrade: "Перейти на Premium",
    freeAnalysis: "Бесплатный анализ",
    readinessAnalysis: "Анализ готовности",
    completedSummary:
      "Завершено документов: {completed} из {total}. Обязательные документы имеют больший вес.",
    estimatedReady: "Оценка готовности",
    noCriticalDate: "Критического риска по срокам нет",
    deadlinePassed: "Целевая дата прошла",
    deadlineToday: "Целевая дата сегодня",
    daysLeft: "Осталось {count} дней",
    freeSummary: "Сводка бесплатного тарифа",
    freeSummaryText:
      "Показаны базовая оценка готовности и число завершённых документов. Подробный анализ сроков и рисков доступен в Premium.",
    checkingPlan: "Проверка подписки...",
    nextBestStep: "Лучший следующий шаг",
    documentsReady: "Список документов готов",
    documentsReadyText:
      "Недостающих документов нет. Ещё раз проверьте сведения и переходите к подаче.",
    risksAndSuggestions: "Риски и рекомендации ИИ",
    suggestionCount: "Рекомендаций: {count}",
    noExtraRisk:
      "Дополнительных рисков или пропущенных шагов не обнаружено.",
    missingDocument: "Недостающий документ",
    uploadMissingDocument:
      "Необходимо загрузить документ «{document}».",
    deadlineExpired: "Срок истёк",
    deadlineExpiredMessage:
      "Срок этого процесса, по-видимому, уже истёк.",
    deadlineApproaching: "Приближается срок",
    deadlineApproachingMessage:
      "До окончания срока осталось {count} дней.",
    allComplete: "Отлично!",
    allCompleteMessage:
      "Все обязательные документы, похоже, готовы.",
    readinessScore: "Оценка готовности",
    readinessScoreMessage:
      "Ваша общая оценка готовности: %{score}.",
    ocrAnalysisFailed: "Не удалось проанализировать документ",
    ocrAnalysisFailedMessage:
      "Не удалось проанализировать документ «{document}».",
    documentQualityCritical: "Качество документа слишком низкое",
    documentQualityCriticalMessage:
      "Качество изображения документа «{document}» недостаточно для подачи.",
    documentQualityLow: "Качество документа следует улучшить",
    documentQualityLowMessage:
      "Качество изображения документа «{document}» выглядит низким.",
    documentNotReadable: "Документ не читается",
    documentNotReadableMessage:
      "Содержимое документа «{document}» не удалось надёжно прочитать.",
    documentMismatch: "Загруженный документ не соответствует требуемому",
    documentMismatchMessage:
      "Документ «{document}», похоже, не соответствует запрошенному типу документа.",
    documentPossibleMismatch: "Соответствие документа неясно",
    documentPossibleMismatchMessage:
      "ALQEV не смог уверенно подтвердить, что «{document}» является требуемым документом.",
    documentExpired: "Срок действия документа истёк",
    documentExpiredMessage:
      "Срок действия документа «{document}», похоже, истёк.",
    documentExpiringSoon: "Срок действия документа скоро истечёт",
    documentExpiringSoonMessage:
      "Срок действия документа «{document}», похоже, скоро истечёт.",
    documentWarning: "Предупреждение по документу",
    documentRisk: "Риск по документу",
    invalidDeadline: "Некорректная целевая дата",
    invalidDeadlineMessage:
      "Сохранённую целевую дату не удалось распознать.",
    deadlineTodayDetailed: "Срок сегодня",
    deadlineTodayDetailedMessage:
      "Целевая дата этого процесса — сегодня.",
    deadlineUrgent: "Срок очень близко",
    deadlineUrgentMessage:
      "До целевой даты осталось всего {count} дней.",
    processNotActive: "Процесс не активен",
    processNotActiveMessage:
      "Текущий статус процесса: «{status}».",
    processPaused: "Процесс приостановлен",
    processPausedMessage:
      "Этот процесс сейчас приостановлен.",

  },
  ar: {
    readinessVeryHigh: "قريب جدًا من التقديم",
    readinessHigh: "تقدم جيد",
    readinessMedium: "التحضير مستمر",
    readinessLow: "وثائق مهمة ناقصة",
    complete: "اكتملت قائمة الوثائق",
    estimatedDays: "حوالي {count} يوم",
    premiumFeature: "ميزة Premium",
    premiumLocked: "تحليل المخاطر بالذكاء الاصطناعي مقفل",
    premiumText:
      "انتقل إلى Premium لرؤية المخاطر التفصيلية وتنبيهات المواعيد ومدة التحضير المقدرة وخريطة طريق مرتبة حسب الأولوية.",
    detailedRisks: "قائمة المخاطر التفصيلية",
    roadmap: "خريطة طريق الذكاء الاصطناعي",
    dateRisk: "مخاطر الموعد",
    priorityNext: "الخطوة التالية ذات الأولوية",
    upgrade: "الترقية إلى Premium",
    freeAnalysis: "تحليل مجاني",
    readinessAnalysis: "تحليل الجاهزية",
    completedSummary:
      "اكتملت {completed} من {total} وثائق. للوثائق الإلزامية وزن أكبر.",
    estimatedReady: "الجاهزية المقدرة",
    noCriticalDate: "لا يوجد خطر حرج متعلق بالموعد",
    deadlinePassed: "انقضى التاريخ المستهدف",
    deadlineToday: "التاريخ المستهدف اليوم",
    daysLeft: "متبقي {count} يوم",
    freeSummary: "ملخص الخطة المجانية",
    freeSummaryText:
      "تظهر درجة الجاهزية الأساسية وعدد الوثائق المكتملة. تحليل المواعيد والمخاطر التفصيلي ضمن Premium.",
    checkingPlan: "جارٍ التحقق من الاشتراك...",
    nextBestStep: "أفضل خطوة تالية",
    documentsReady: "قائمة الوثائق جاهزة",
    documentsReadyText:
      "لا توجد وثائق ناقصة. راجع المعلومات مرة أخيرة ثم انتقل إلى خطوة التقديم.",
    risksAndSuggestions: "مخاطر وتوصيات الذكاء الاصطناعي",
    suggestionCount: "{count} توصيات",
    noExtraRisk:
      "لم يتم اكتشاف مخاطر إضافية أو خطوات ناقصة.",
    missingDocument: "وثيقة ناقصة",
    uploadMissingDocument:
      "يجب رفع الوثيقة «{document}».",
    deadlineExpired: "انتهت المهلة",
    deadlineExpiredMessage:
      "يبدو أن الموعد النهائي لهذا الإجراء قد انقضى.",
    deadlineApproaching: "موعد نهائي قريب",
    deadlineApproachingMessage:
      "تبقى {count} يوم على الموعد النهائي.",
    allComplete: "رائع!",
    allCompleteMessage:
      "يبدو أن جميع الوثائق الإلزامية مكتملة.",
    readinessScore: "درجة الجاهزية",
    readinessScoreMessage:
      "درجة جاهزيتك العامة هي %{score}.",
    ocrAnalysisFailed: "فشل تحليل الوثيقة",
    ocrAnalysisFailedMessage:
      "تعذر تحليل الوثيقة «{document}».",
    documentQualityCritical: "جودة الوثيقة منخفضة جدًا",
    documentQualityCriticalMessage:
      "تبدو جودة صورة الوثيقة «{document}» غير كافية للتقديم.",
    documentQualityLow: "ينبغي تحسين جودة الوثيقة",
    documentQualityLowMessage:
      "تبدو جودة صورة الوثيقة «{document}» منخفضة.",
    documentNotReadable: "الوثيقة غير مقروءة",
    documentNotReadableMessage:
      "تعذر قراءة محتوى الوثيقة «{document}» بشكل موثوق.",
    documentMismatch: "الوثيقة المرفوعة لا تطابق الوثيقة المطلوبة",
    documentMismatchMessage:
      "يبدو أن الوثيقة «{document}» لا تطابق نوع الوثيقة المطلوبة.",
    documentPossibleMismatch: "مطابقة الوثيقة غير مؤكدة",
    documentPossibleMismatchMessage:
      "لم يتمكن ALQEV من التأكد بشكل قاطع من أن «{document}» هي الوثيقة المطلوبة.",
    documentExpired: "انتهت صلاحية الوثيقة",
    documentExpiredMessage:
      "يبدو أن صلاحية الوثيقة «{document}» قد انتهت.",
    documentExpiringSoon: "ستنتهي صلاحية الوثيقة قريبًا",
    documentExpiringSoonMessage:
      "يبدو أن صلاحية الوثيقة «{document}» ستنتهي قريبًا.",
    documentWarning: "تنبيه بشأن الوثيقة",
    documentRisk: "مخاطر الوثيقة",
    invalidDeadline: "تاريخ هدف غير صالح",
    invalidDeadlineMessage:
      "تعذر تفسير تاريخ الهدف المحفوظ.",
    deadlineTodayDetailed: "الموعد النهائي اليوم",
    deadlineTodayDetailedMessage:
      "التاريخ المستهدف لهذا الإجراء هو اليوم.",
    deadlineUrgent: "الموعد النهائي قريب جدًا",
    deadlineUrgentMessage:
      "لم يتبقَّ سوى {count} أيام حتى التاريخ المستهدف.",
    processNotActive: "الإجراء غير نشط",
    processNotActiveMessage:
      "حالة الإجراء الحالية هي «{status}».",
    processPaused: "الإجراء متوقف مؤقتًا",
    processPausedMessage:
      "هذا الإجراء متوقف مؤقتًا حاليًا.",

  },
  fa: {
    readinessVeryHigh: "تقریباً آماده درخواست",
    readinessHigh: "پیشرفت خوب",
    readinessMedium: "آماده‌سازی ادامه دارد",
    readinessLow: "مدارک مهم ناقص است",
    complete: "فهرست مدارک کامل شد",
    estimatedDays: "حدود {count} روز",
    premiumFeature: "ویژگی Premium",
    premiumLocked: "تحلیل ریسک هوش مصنوعی قفل است",
    premiumText:
      "برای مشاهده ریسک‌های دقیق، هشدارهای مهلت، زمان تخمینی آماده‌سازی و نقشه راه اولویت‌بندی‌شده به Premium ارتقا دهید.",
    detailedRisks: "فهرست دقیق ریسک‌ها",
    roadmap: "نقشه راه هوش مصنوعی",
    dateRisk: "ریسک مهلت",
    priorityNext: "گام بعدی اولویت‌دار",
    upgrade: "ارتقا به Premium",
    freeAnalysis: "تحلیل رایگان",
    readinessAnalysis: "تحلیل آمادگی",
    completedSummary:
      "{completed} از {total} مدرک تکمیل شده است. مدارک الزامی وزن بیشتری دارند.",
    estimatedReady: "آمادگی تخمینی",
    noCriticalDate: "ریسک بحرانی مهلت وجود ندارد",
    deadlinePassed: "تاریخ هدف گذشته است",
    deadlineToday: "تاریخ هدف امروز است",
    daysLeft: "{count} روز باقی مانده",
    freeSummary: "خلاصه طرح رایگان",
    freeSummaryText:
      "امتیاز پایه آمادگی و تعداد مدارک تکمیل‌شده نمایش داده می‌شود. تحلیل دقیق مهلت و ریسک در Premium است.",
    checkingPlan: "در حال بررسی اشتراک...",
    nextBestStep: "بهترین گام بعدی",
    documentsReady: "فهرست مدارک آماده است",
    documentsReadyText:
      "مدرک ناقصی وجود ندارد. اطلاعات را یک بار دیگر بررسی و وارد مرحله درخواست شوید.",
    risksAndSuggestions: "ریسک‌ها و پیشنهادهای هوش مصنوعی",
    suggestionCount: "{count} پیشنهاد",
    noExtraRisk:
      "ریسک یا گام ناقص دیگری شناسایی نشد.",
    missingDocument: "مدرک ناقص",
    uploadMissingDocument:
      "باید مدرک «{document}» را بارگذاری کنید.",
    deadlineExpired: "مهلت پایان یافته",
    deadlineExpiredMessage:
      "به نظر می‌رسد مهلت این فرایند گذشته است.",
    deadlineApproaching: "مهلت نزدیک",
    deadlineApproachingMessage:
      "{count} روز تا پایان مهلت باقی مانده است.",
    allComplete: "عالی!",
    allCompleteMessage:
      "به نظر می‌رسد همه مدارک الزامی کامل هستند.",
    readinessScore: "امتیاز آمادگی",
    readinessScoreMessage:
      "امتیاز کلی آمادگی شما %{score} است.",
    ocrAnalysisFailed: "تحلیل مدرک ناموفق بود",
    ocrAnalysisFailedMessage:
      "مدرک «{document}» قابل تحلیل نبود.",
    documentQualityCritical: "کیفیت مدرک بسیار پایین است",
    documentQualityCriticalMessage:
      "کیفیت تصویر مدرک «{document}» برای درخواست کافی به نظر نمی‌رسد.",
    documentQualityLow: "کیفیت مدرک باید بهتر شود",
    documentQualityLowMessage:
      "کیفیت تصویر مدرک «{document}» پایین به نظر می‌رسد.",
    documentNotReadable: "مدرک خوانا نیست",
    documentNotReadableMessage:
      "محتوای مدرک «{document}» با اطمینان قابل خواندن نبود.",
    documentMismatch: "مدرک بارگذاری‌شده با مدرک موردنیاز مطابقت ندارد",
    documentMismatchMessage:
      "به نظر می‌رسد مدرک «{document}» با نوع مدرک درخواستی مطابقت ندارد.",
    documentPossibleMismatch: "تطابق مدرک نامشخص است",
    documentPossibleMismatchMessage:
      "ALQEV نتوانست با اطمینان تأیید کند که «{document}» همان مدرک درخواستی است.",
    documentExpired: "اعتبار مدرک منقضی شده است",
    documentExpiredMessage:
      "به نظر می‌رسد اعتبار مدرک «{document}» منقضی شده باشد.",
    documentExpiringSoon: "اعتبار مدرک به‌زودی منقضی می‌شود",
    documentExpiringSoonMessage:
      "به نظر می‌رسد اعتبار مدرک «{document}» به‌زودی منقضی شود.",
    documentWarning: "هشدار مدرک",
    documentRisk: "ریسک مدرک",
    invalidDeadline: "تاریخ هدف نامعتبر",
    invalidDeadlineMessage:
      "تاریخ هدف ذخیره‌شده قابل تفسیر نبود.",
    deadlineTodayDetailed: "مهلت امروز است",
    deadlineTodayDetailedMessage:
      "تاریخ هدف این فرایند امروز است.",
    deadlineUrgent: "مهلت بسیار نزدیک است",
    deadlineUrgentMessage:
      "فقط {count} روز تا تاریخ هدف باقی مانده است.",
    processNotActive: "فرایند فعال نیست",
    processNotActiveMessage:
      "وضعیت فعلی فرایند «{status}» است.",
    processPaused: "فرایند متوقف شده است",
    processPausedMessage:
      "این فرایند در حال حاضر متوقف است.",

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


function getDaysUntil(deadline?: string | null) {
  if (!deadline) return null;

  const target = new Date(
    `${deadline}T00:00:00`,
  );

  if (Number.isNaN(target.getTime())) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  return Math.ceil(
    (target.getTime() - today.getTime()) /
      86_400_000,
  );
}

function getReadinessLabel(
  score: number,
  language: Language,
): string {
  const currentCopy = copy[language];

  if (score >= 90) {
    return currentCopy.readinessVeryHigh;
  }

  if (score >= 70) {
    return currentCopy.readinessHigh;
  }

  if (score >= 40) {
    return currentCopy.readinessMedium;
  }

  return currentCopy.readinessLow;
}

function getRecommendationText(
  item: AdvisorRecommendation,
  process: ProcessWithTemplate,
  language: Language,
): { title: string; message: string } {
  const currentCopy = copy[language];

  const titleKeyMap: Record<string, keyof typeof currentCopy> = {
    missingDocument: "missingDocument",
    ocrAnalysisFailed: "ocrAnalysisFailed",
    documentQualityCritical: "documentQualityCritical",
    documentQualityLow: "documentQualityLow",
    documentNotReadable: "documentNotReadable",
    documentMismatch: "documentMismatch",
    documentPossibleMismatch: "documentPossibleMismatch",
    documentExpired: "documentExpired",
    documentExpiringSoon: "documentExpiringSoon",
    documentWarning: "documentWarning",
    documentRisk: "documentRisk",
    invalidDeadline: "invalidDeadline",
    deadlineExpired: "deadlineExpired",
    deadlineToday: "deadlineTodayDetailed",
    deadlineUrgent: "deadlineUrgent",
    deadlineApproaching: "deadlineApproaching",
    processNotActive: "processNotActive",
    processPaused: "processPaused",
    allComplete: "allComplete",
    readinessScore: "readinessScore",
  };

  const messageKeyMap: Record<string, keyof typeof currentCopy> = {
    uploadMissingDocument: "uploadMissingDocument",
    ocrAnalysisFailedMessage: "ocrAnalysisFailedMessage",
    documentQualityCriticalMessage: "documentQualityCriticalMessage",
    documentQualityLowMessage: "documentQualityLowMessage",
    documentNotReadableMessage: "documentNotReadableMessage",
    documentMismatchMessage: "documentMismatchMessage",
    documentPossibleMismatchMessage: "documentPossibleMismatchMessage",
    documentExpiredMessage: "documentExpiredMessage",
    documentExpiringSoonMessage: "documentExpiringSoonMessage",
    invalidDeadlineMessage: "invalidDeadlineMessage",
    deadlineExpiredMessage: "deadlineExpiredMessage",
    deadlineTodayMessage: "deadlineTodayDetailedMessage",
    deadlineUrgentMessage: "deadlineUrgentMessage",
    deadlineApproachingMessage:
      "deadlineApproachingMessage",
    processNotActiveMessage: "processNotActiveMessage",
    processPausedMessage: "processPausedMessage",
    allCompleteMessage: "allCompleteMessage",
    readinessScoreMessage:
      "readinessScoreMessage",
  };

  const sourceDocument =
    item.documentKey
      ? process.requiredDocuments.find(
          (document) =>
            document.key === item.documentKey,
        )
      : undefined;

  const localizedDocument = sourceDocument
    ? getLocalizedDocumentTitle(
        {
          templateKey: process.templateKey,
          processTitle: process.title,
          documentKey: sourceDocument.key,
          documentTitle: sourceDocument.title,
        },
        language,
      )
    : undefined;

  const variables = {
    ...(item.variables || {}),
    ...(localizedDocument
      ? { document: localizedDocument }
      : {}),
  };

  const translatedTitleKey = item.titleKey
    ? titleKeyMap[item.titleKey]
    : undefined;

  const translatedMessageKey = item.messageKey
    ? messageKeyMap[item.messageKey]
    : undefined;

  return {
    title:
      (translatedTitleKey &&
        currentCopy[translatedTitleKey]) ||
      item.title,
    message: fillTemplate(
      (translatedMessageKey &&
        currentCopy[translatedMessageKey]) ||
        item.message,
      variables,
    ),
  };
}

function RecommendationCard({
  item,
  process,
  language,
}: {
  item: AdvisorRecommendation;
  process: ProcessWithTemplate;
  language: Language;
}) {
  const translated = getRecommendationText(
    item,
    process,
    language,
  );

  return (
    <article
      className={`rounded-2xl border p-4 ${
        severityStyles[item.severity]
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-current/20 bg-black/10 text-sm font-bold">
          {severityIcons[item.severity]}
        </span>

        <div className="min-w-0">
          <h3 className="font-semibold">
            {translated.title}
          </h3>

          <p className="mt-1 text-sm leading-6 opacity-75">
            {translated.message}
          </p>
        </div>
      </div>
    </article>
  );
}

function PremiumLock({
  language,
}: {
  language: Language;
}) {
  const currentCopy = copy[language];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-400/[0.12] via-white/[0.035] to-orange-500/[0.06] p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-amber-400/10 blur-3xl"
      />

      <div className="relative">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-300/25 bg-amber-400/15 text-lg">
            ★
          </span>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
              {currentCopy.premiumFeature}
            </p>

            <h3 className="mt-1 text-lg font-semibold text-white">
              {currentCopy.premiumLocked}
            </h3>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-300">
          {currentCopy.premiumText}
        </p>

        <div className="mt-5 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
            ✓ {currentCopy.detailedRisks}
          </div>

          <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
            ✓ {currentCopy.roadmap}
          </div>

          <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
            ✓ {currentCopy.dateRisk}
          </div>

          <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
            ✓ {currentCopy.priorityNext}
          </div>
        </div>

        <Link
          href="/pricing"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-amber-400 px-5 text-sm font-bold text-slate-950 transition hover:bg-amber-300"
        >
          {currentCopy.upgrade}
        </Link>
      </div>
    </div>
  );
}

export default function ProcessAiPanel({
  process,
}: ProcessAiPanelProps) {
  const [language] =
  useState<Language>(() =>
    readStoredLanguage("tr"),
  );
  const [
    subscriptionPlan,
    setSubscriptionPlan,
  ] = useState<SubscriptionPlan>("free");
  const [isPlanLoading, setIsPlanLoading] =
    useState(true);

  

  const analysis = useMemo(
    () => analyzeProcess(process),
    [process],
  );

  const isPremium =
    subscriptionPlan === "premium";
  const currentCopy = copy[language];

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (!currentUser) {
          if (isMounted) {
            setSubscriptionPlan("free");
            setIsPlanLoading(false);
          }

          return;
        }

        try {
          const snapshot = await getDoc(
            doc(db, "users", currentUser.uid),
          );

          const rawPlan = snapshot.exists()
            ? snapshot.data().subscription
            : "free";

          if (isMounted) {
            setSubscriptionPlan(
              normalizeSubscriptionPlan(rawPlan),
            );
          }
        } catch (error) {
          console.error(
            "Abonelik bilgisi okunamadı:",
            error,
          );

          if (isMounted) {
            setSubscriptionPlan("free");
          }
        } finally {
          if (isMounted) {
            setIsPlanLoading(false);
          }
        }
      },
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const nextRecommendation =
    analysis.recommendations.find(
      (item) => item.severity === "critical",
    ) ??
    analysis.recommendations.find(
      (item) => item.severity === "warning",
    ) ??
    analysis.recommendations[0] ??
    null;

  const visibleRecommendations =
    analysis.recommendations
      .filter(
        (item) =>
          item.id !== nextRecommendation?.id,
      )
      .slice(0, 3);

  const daysUntilDeadline = getDaysUntil(
    process.deadline,
  );

  const deadlineRisk =
    daysUntilDeadline !== null &&
    daysUntilDeadline < 0
      ? currentCopy.deadlinePassed
      : daysUntilDeadline === 0
        ? currentCopy.deadlineToday
        : daysUntilDeadline !== null &&
            daysUntilDeadline <= 7
          ? fillTemplate(
              currentCopy.daysLeft,
              { count: daysUntilDeadline },
            )
          : null;

  const nextRecommendationText =
    nextRecommendation
      ? getRecommendationText(
          nextRecommendation,
          process,
          language,
        )
      : null;

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/[0.12] via-white/[0.035] to-cyan-500/[0.06] shadow-2xl backdrop-blur-xl">
      <div className="grid lg:grid-cols-[0.8fr_1.2fr]">
        <div className="border-b border-white/10 p-6 sm:p-8 lg:border-b-0 lg:border-r">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">
              ALQEV AI
            </p>

            {!isPlanLoading ? (
              <span
                className={
                  isPremium
                    ? "rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200"
                    : "rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-400"
                }
              >
                {isPremium
                  ? "★ Premium"
                  : currentCopy.freeAnalysis}
              </span>
            ) : null}
          </div>

          <div className="mt-5 flex items-end justify-between gap-5">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">
                {currentCopy.readinessAnalysis}
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                {getReadinessLabel(
                  analysis.readiness.score,
                  language,
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-5 py-4 text-right">
              <span className="text-4xl font-bold text-white">
                {analysis.readiness.score}
              </span>

              <span className="ml-1 text-slate-500">
                /100
              </span>
            </div>
          </div>

          <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-500"
              style={{
                width: `${analysis.readiness.score}%`,
              }}
            />
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-400">
            {fillTemplate(
              currentCopy.completedSummary,
              {
                completed:
                  analysis.readiness.completedItems,
                total:
                  analysis.readiness.totalItems,
              },
            )}
          </p>

          {isPremium ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  {currentCopy.estimatedReady}
                </p>

                <p className="mt-2 font-semibold text-slate-100">
                  {analysis.estimatedPreparationDays === 0
                    ? currentCopy.complete
                    : fillTemplate(
                        currentCopy.estimatedDays,
                        {
                          count:
                            analysis.estimatedPreparationDays,
                        },
                      )}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  {currentCopy.dateRisk}
                </p>

                <p
                  className={`mt-2 font-semibold ${
                    deadlineRisk
                      ? "text-amber-200"
                      : "text-emerald-200"
                  }`}
                >
                  {deadlineRisk ||
                    currentCopy.noCriticalDate}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                {currentCopy.freeSummary}
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                {currentCopy.freeSummaryText}
              </p>
            </div>
          )}
        </div>

        <div className="p-6 sm:p-8">
          {isPlanLoading ? (
            <div className="flex min-h-72 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-300" />

                <p className="mt-4 text-sm text-slate-400">
                  {currentCopy.checkingPlan}
                </p>
              </div>
            </div>
          ) : isPremium ? (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
                {currentCopy.nextBestStep}
              </p>

              <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.07] p-5">
                {nextRecommendationText ? (
                  <>
                    <h3 className="text-lg font-semibold text-cyan-50">
                      {nextRecommendationText.title}
                    </h3>

                    <p className="mt-2 leading-7 text-cyan-100/75">
                      {nextRecommendationText.message}
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold text-emerald-100">
                      {currentCopy.documentsReady}
                    </h3>

                    <p className="mt-2 leading-7 text-emerald-100/70">
                      {currentCopy.documentsReadyText}
                    </p>
                  </>
                )}
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-semibold text-slate-100">
                    {currentCopy.risksAndSuggestions}
                  </h3>

                  <span className="text-xs text-slate-500">
                    {fillTemplate(
                      currentCopy.suggestionCount,
                      {
                        count:
                          analysis.recommendations
                            .length,
                      },
                    )}
                  </span>
                </div>

                {visibleRecommendations.length >
                0 ? (
                  <div className="mt-4 grid gap-3">
                    {visibleRecommendations.map(
                      (item) => (
                        <RecommendationCard
                          key={item.id}
                          item={item}
                          process={process}
                          language={language}
                        />
                      ),
                    )}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.07] p-4 text-sm leading-6 text-emerald-100/80">
                    {currentCopy.noExtraRisk}
                  </div>
                )}
              </div>
            </>
          ) : (
            <PremiumLock language={language} />
          )}
        </div>
      </div>
    </section>
  );
}