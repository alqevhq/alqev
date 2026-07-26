"use client";
import Image from "next/image";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import {
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { analyzeDashboard } from "@/lib/ai/dashboard-advisor";
import type { AdvisorProcess } from "@/lib/ai/process-advisor";
import {
  getLocalizedDocumentTitle,
  getLocalizedProcessTitle,
} from "@/lib/process-templates";
import {
  readStoredLanguage,
  storeLanguage,
} from "@/lib/i18n";

type SupportedLanguage = "de" | "en" | "tr" | "ru" | "ar" | "fa";

const supportedLanguages: { code: SupportedLanguage; label: string }[] = [
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
  { code: "tr", label: "Türkçe" },
  { code: "ru", label: "Русский" },
  { code: "ar", label: "العربية" },
  { code: "fa", label: "فارسی" },
];

const uiTranslations: Record<
  SupportedLanguage,
  Record<string, string>
> = {
  tr: {
    immigrationReadiness: "Göçmenlik Hazırlığı",
    readinessVeryClose: "Başvuruya çok yakınsın",
    readinessGood: "Hazırlığın iyi ilerliyor",
    readinessMissing: "Bazı önemli eksikler var",
    readinessStarted: "Hazırlığa yeni başlıyorsun",
    readinessNoData: "Henüz analiz verisi yok",
    readinessProgress: "{completed} / {total} belge tamamlandı. Zorunlu belgelere daha yüksek ağırlık verildi.",
    readinessEmpty: "Hazırlık puanı için önce bir süreç ve belge listesi oluştur.",
    priorityCritical: "Kritik", priorityWarning: "Önemli", priorityInfo: "Öneri", prioritySuccess: "Hazır",
    criticalAiAlert: "Kritik AI uyarısı", aiSuggestion: "AI önerisi",
    requiredDocumentMissing: "{process} sürecindeki zorunlu belge henüz yüklenmedi.",
    deadlineToday: "Bu sürecin hedef tarihi bugün.", deadlineInDays: "{count} gün sonra hedef tarihe ulaşacak.",
    preparationControlled: "Hazırlığın kontrol altında", preparationControlledText: "Şu anda kritik bir eksik görünmüyor. Sürecindeki bilgileri güncel tutmaya devam et.",
    createFirstProcessTitle: "İlk sürecini oluştur", createFirstProcessText: "Kişisel öneriler ve hazırlık analizi için ilk sürecini başlat.",
    riskHigh: "Yüksek risk", riskHighText: "Kritik bir eksik veya çok yakın bir hedef tarih bulunuyor.",
    riskMedium: "Orta risk", riskMediumText: "Tamamlanması gereken belge veya yaklaşan tarih bulunuyor.",
    riskLow: "Düşük risk", riskLowText: "Şu anda acil müdahale gerektiren bir durum görünmüyor.",
    checkProcess: "Sürecini kontrol et", uploadRequiredDocument: "{process} sürecindeki zorunlu belgeyi yükle.",
    checkAlerts: "Yeni uyarı veya eksik belge olup olmadığını kontrol et.", startRoadmap: "Kişisel yol haritanı oluşturmak için bir süreç başlat.",
    estimateByMissing: "Bu tahmin eksik belge sayısına göre oluşturuldu.", noRequiredMissing: "Mevcut belge listesinde zorunlu bir eksik görünmüyor.",
    documentUploaded: "Belge yüklendi.", optionalNotUploaded: "İsteğe bağlı belge henüz yüklenmedi.", requiredNotUploaded: "Zorunlu belge henüz yüklenmedi.", noDocumentList: "Bu süreç için henüz belge listesi oluşturulmamış.",
    criticalTopics: "{count} kritik konu öncelikli olarak ele alınmalı.", requiredDocumentsPending: "{count} zorunlu belge tamamlanmayı bekliyor.", noCriticalMissing: "Şu anda kritik bir eksik görünmüyor.",
    noDeadline: "Hedef tarih yok", untitledDocument: "Başlıksız belge", untitledProcess: "Başlıksız Süreç", userFallback: "Kullanıcı", missingDocumentAi: "Eksik belge", uploadMissingDocumentAi: "“{document}” belgesini yüklemen gerekiyor.", deadlineExpiredAi: "Süre doldu", deadlineExpiredMessageAi: "Bu sürecin hedef tarihi geçmiş görünüyor.", deadlineApproachingAi: "Yaklaşan son tarih", deadlineApproachingMessageAi: "Son tarihe {count} gün kaldı.", allCompleteAi: "Harika!", allCompleteMessageAi: "Tüm zorunlu belgeler tamamlanmış görünüyor.", readinessScoreAi: "Hazırlık puanı", readinessScoreMessageAi: "Genel hazırlık puanın %{score}.",

    loading: "ALQEV hazırlanıyor...",
    signOut: "Çıkış yap",
    signingOut: "Çıkış yapılıyor...",
    dailyCenter: "Günlük yaşam merkezi",
    welcomeMorning: "Günaydın",
    welcomeDay: "İyi günler",
    welcomeEvening: "İyi akşamlar",
    welcomeNight: "İyi geceler",
    intro: "Bugünkü önceliklerini, eksik belgelerini ve yaklaşan tarihlerini tek ekrandan yönet.",
    plan: "Plan",
    language: "Dil",
    country: "Ülke",
    profile: "Profil",
    completed: "Tamamlandı",
    incomplete: "Tamamlanmadı",
    freePlan: "Ücretsiz plan",
    unspecified: "Belirtilmedi",
    startProcess: "Yeni süreç başlat",
    viewProcesses: "Süreçlerimi görüntüle",
    completeProfile: "Profilini tamamlaman gerekiyor",
    completeProfileText: "Ülke, dil ve kişisel ihtiyaç bilgilerini eklediğinde ALQEV daha doğru öneriler oluşturabilir.",
    completeProfileButton: "Profili tamamla",
    activeProcesses: "Aktif süreçler",
    activeProcessesDesc: "Devam eden başvuru ve resmî işlemlerin.",
    documents: "Belgeler",
    documentsReady: "Belgelerin %{percent} oranında hazır.",
    criticalTasks: "Kritik görevler",
    criticalTasksDesc: "Hızlıca ele alınması gereken uyarılar.",
    missingDocuments: "Eksik belgeler",
    requiredWaiting: "{count} zorunlu belge bekliyor.",
    aiReadiness: "AI hazırlık analizi",
    readyDocuments: "Hazır belgeler",
    requiredMissing: "Zorunlu eksikler",
    todayPriorities: "Bugünkü önceliklerin",
    topThree: "En önemli 3 adım",
    riskAnalysis: "Risk analizi",
    nextStep: "Sonraki adım",
    estimatedReadiness: "Tahmini hazırlık",
    ready: "Hazır",
    days: "{count} gün",
    openStep: "Adımı aç →",
    featuredProcess: "Öne çıkan süreç",
    completedPercent: "%{percent} tamamlandı",
    processDetails: "Süreç detayını aç",
    noProcess: "Henüz bir sürecin yok",
    noProcessText: "İlk sürecini başlattığında ilerleme durumun ve gerekli belgelerin burada görünecek.",
    firstProcess: "İlk süreci başlat",
    aiSummary: "AI durum özeti",
    goToProcess: "Sürece git",
    createProcess: "Süreç oluştur",
    upcomingDate: "Yaklaşan önemli tarih",
    noUpcomingDate: "Yaklaşan tarih yok",
    noUpcomingDateText: "Süreçlerine hedef tarih eklediğinde en yakın tarih burada görünecek.",
    targetToday: "Hedef tarih bugün.",
    daysRemaining: "{count} gün içinde tamamlanmalı.",
    alAssistant: "AL Yaşam Asistanı",
    alWelcome: "Hoş geldin {name}",
    alQuestion: "Bugün bana ne sormak istersin?",
    alDescription: "Almanya'daki resmî işlemler, sosyal haklar, vergi, sağlık, iş, konut ve günlük yaşam hakkında sorunu kendi dilinde yaz.",
    alPlaceholder: "Örn. Ev sahibim depozitomu geri vermiyor, ne yapmalıyım?",
    alSend: "AL'e sor",
    alPrivacy: "AL kişisel durumunu ve kayıtlı süreçlerini dikkate alarak yönlendirir. Önemli kararlarda resmî kaynakları ve uzman desteğini de kontrol et.",
    alPopularTopics: "Sık sorulan konular",
    alExplore: "Bir konu seç veya doğrudan sorunu yaz",
    alEmptyQuestion: "Lütfen önce bir soru yaz.",
    topicImmigration: "Oturum ve vatandaşlık",
    topicFamily: "Aile ve çocuk",
    topicBenefits: "Sosyal yardımlar",
    topicTax: "Vergi",
    topicHousing: "Konut ve kiracı hakları",
    topicHealth: "Sağlık ve Krankenkasse",
    topicWork: "İş ve çalışma hakları",
    topicEducation: "Eğitim ve diploma",
    topicInsurance: "Sigortalar",
    topicBanking: "Banka ve SCHUFA",
    topicMobility: "Araç ve ehliyet",
    topicAuthorities: "Resmî kurumlar",
    promptKindergeld: "Kindergeld başvurusu için neler gerekiyor ve nereye başvurmalıyım?",
    promptTax: "Steuererklärung için hangi belgeleri hazırlamam gerekiyor?",
    promptDental: "Krankenkasse diş protezimin ne kadarını karşılar?",
    promptDeposit: "Ev sahibim Kaution'u geri vermiyor. Haklarım nelerdir?",
    promptWohngeld: "Wohngeld alabilir miyim ve hangi belgeler gerekiyor?",
    promptResidence: "Oturum iznimi uzatmak için hangi adımları izlemeliyim?",
  },
  de: {
    immigrationReadiness: "Einwanderungsbereitschaft",
    readinessVeryClose: "Du bist fast bereit für den Antrag", readinessGood: "Deine Vorbereitung läuft gut", readinessMissing: "Einige wichtige Punkte fehlen", readinessStarted: "Du hast mit der Vorbereitung begonnen", readinessNoData: "Noch keine Analysedaten",
    readinessProgress: "{completed} / {total} Dokumente abgeschlossen. Pflichtdokumente wurden stärker gewichtet.", readinessEmpty: "Erstelle zuerst einen Vorgang und eine Dokumentenliste.",
    priorityCritical: "Kritisch", priorityWarning: "Wichtig", priorityInfo: "Empfehlung", prioritySuccess: "Bereit", criticalAiAlert: "Kritischer KI-Hinweis", aiSuggestion: "KI-Empfehlung",
    requiredDocumentMissing: "Das Pflichtdokument im Vorgang {process} wurde noch nicht hochgeladen.", deadlineToday: "Die Frist dieses Vorgangs ist heute.", deadlineInDays: "Die Frist ist in {count} Tagen.",
    preparationControlled: "Deine Vorbereitung ist unter Kontrolle", preparationControlledText: "Derzeit gibt es keine kritischen Lücken. Halte die Angaben in deinem Vorgang aktuell.", createFirstProcessTitle: "Ersten Vorgang erstellen", createFirstProcessText: "Starte deinen ersten Vorgang für persönliche Empfehlungen und die Bereitschaftsanalyse.",
    riskHigh: "Hohes Risiko", riskHighText: "Es gibt eine kritische Lücke oder eine sehr nahe Frist.", riskMedium: "Mittleres Risiko", riskMediumText: "Ein Dokument oder eine nahende Frist erfordert Aufmerksamkeit.", riskLow: "Niedriges Risiko", riskLowText: "Derzeit ist kein dringender Handlungsbedarf erkennbar.",
    checkProcess: "Vorgang prüfen", uploadRequiredDocument: "Lade das Pflichtdokument im Vorgang {process} hoch.", checkAlerts: "Prüfe neue Hinweise oder fehlende Dokumente.", startRoadmap: "Starte einen Vorgang, um deinen persönlichen Fahrplan zu erstellen.", estimateByMissing: "Diese Schätzung basiert auf der Anzahl fehlender Dokumente.", noRequiredMissing: "In der aktuellen Dokumentenliste fehlen keine Pflichtdokumente.",
    documentUploaded: "Dokument hochgeladen.", optionalNotUploaded: "Das optionale Dokument wurde noch nicht hochgeladen.", requiredNotUploaded: "Das Pflichtdokument wurde noch nicht hochgeladen.", noDocumentList: "Für diesen Vorgang wurde noch keine Dokumentenliste erstellt.", criticalTopics: "{count} kritische Punkte sollten zuerst bearbeitet werden.", requiredDocumentsPending: "{count} Pflichtdokumente warten auf Abschluss.", noCriticalMissing: "Derzeit gibt es keine kritische Lücke.", noDeadline: "Keine Frist", untitledDocument: "Unbenanntes Dokument", untitledProcess: "Unbenannter Vorgang", userFallback: "Benutzer", missingDocumentAi: "Fehlendes Dokument", uploadMissingDocumentAi: "Das Dokument „{document}“ muss hochgeladen werden.", deadlineExpiredAi: "Frist abgelaufen", deadlineExpiredMessageAi: "Die Frist dieses Vorgangs ist offenbar abgelaufen.", deadlineApproachingAi: "Bevorstehende Frist", deadlineApproachingMessageAi: "Noch {count} Tage bis zur Frist.", allCompleteAi: "Sehr gut!", allCompleteMessageAi: "Alle Pflichtdokumente scheinen vollständig zu sein.", readinessScoreAi: "Bereitschaftswert", readinessScoreMessageAi: "Dein allgemeiner Bereitschaftswert beträgt %{score}.",

    loading: "ALQEV wird vorbereitet...",
    signOut: "Abmelden",
    signingOut: "Abmeldung...",
    dailyCenter: "Zentrale für den Alltag",
    welcomeMorning: "Guten Morgen",
    welcomeDay: "Guten Tag",
    welcomeEvening: "Guten Abend",
    welcomeNight: "Gute Nacht",
    intro: "Verwalte deine heutigen Prioritäten, fehlenden Dokumente und anstehenden Fristen auf einen Blick.",
    plan: "Tarif",
    language: "Sprache",
    country: "Land",
    profile: "Profil",
    completed: "Abgeschlossen",
    incomplete: "Unvollständig",
    freePlan: "Kostenloser Tarif",
    unspecified: "Nicht angegeben",
    startProcess: "Neuen Vorgang starten",
    viewProcesses: "Meine Vorgänge anzeigen",
    completeProfile: "Bitte vervollständige dein Profil",
    completeProfileText: "Mit Angaben zu Land, Sprache und Bedürfnissen kann ALQEV genauere Empfehlungen erstellen.",
    completeProfileButton: "Profil vervollständigen",
    activeProcesses: "Aktive Vorgänge",
    activeProcessesDesc: "Deine laufenden Anträge und behördlichen Vorgänge.",
    documents: "Dokumente",
    documentsReady: "Deine Dokumente sind zu %{percent} bereit.",
    criticalTasks: "Kritische Aufgaben",
    criticalTasksDesc: "Hinweise, die schnell bearbeitet werden sollten.",
    missingDocuments: "Fehlende Dokumente",
    requiredWaiting: "{count} Pflichtdokumente fehlen.",
    aiReadiness: "KI-Bereitschaftsanalyse",
    readyDocuments: "Vorhandene Dokumente",
    requiredMissing: "Fehlende Pflichtdokumente",
    todayPriorities: "Deine heutigen Prioritäten",
    topThree: "Die 3 wichtigsten Schritte",
    riskAnalysis: "Risikoanalyse",
    nextStep: "Nächster Schritt",
    estimatedReadiness: "Geschätzte Vorbereitung",
    ready: "Bereit",
    days: "{count} Tage",
    openStep: "Schritt öffnen →",
    featuredProcess: "Hervorgehobener Vorgang",
    completedPercent: "%{percent} abgeschlossen",
    processDetails: "Vorgang öffnen",
    noProcess: "Du hast noch keinen Vorgang",
    noProcessText: "Sobald du deinen ersten Vorgang startest, erscheinen Fortschritt und erforderliche Dokumente hier.",
    firstProcess: "Ersten Vorgang starten",
    aiSummary: "KI-Statusübersicht",
    goToProcess: "Zum Vorgang",
    createProcess: "Vorgang erstellen",
    upcomingDate: "Nächster wichtiger Termin",
    noUpcomingDate: "Keine anstehenden Termine",
    noUpcomingDateText: "Sobald du einem Vorgang eine Frist hinzufügst, erscheint sie hier.",
    targetToday: "Die Frist ist heute.",
    daysRemaining: "Innerhalb von {count} Tagen abzuschließen.",
    alAssistant: "AL Lebensassistent",
    alWelcome: "Willkommen, {name}",
    alQuestion: "Was möchtest du mich heute fragen?",
    alDescription: "Stelle deine Frage zu Behörden, Sozialleistungen, Steuern, Gesundheit, Arbeit, Wohnen und Alltag in deiner Sprache.",
    alPlaceholder: "Zum Beispiel: Mein Vermieter zahlt die Kaution nicht zurück. Was kann ich tun?",
    alSend: "AL fragen",
    alPrivacy: "AL berücksichtigt deine persönliche Situation und gespeicherten Vorgänge. Prüfe bei wichtigen Entscheidungen zusätzlich offizielle Quellen oder fachlichen Rat.",
    alPopularTopics: "Häufige Themen",
    alExplore: "Wähle ein Thema oder stelle direkt deine Frage",
    alEmptyQuestion: "Bitte gib zuerst eine Frage ein.",
    topicImmigration: "Aufenthalt und Einbürgerung",
    topicFamily: "Familie und Kinder",
    topicBenefits: "Sozialleistungen",
    topicTax: "Steuern",
    topicHousing: "Wohnen und Mieterrechte",
    topicHealth: "Gesundheit und Krankenkasse",
    topicWork: "Arbeit und Arbeitsrechte",
    topicEducation: "Bildung und Anerkennung",
    topicInsurance: "Versicherungen",
    topicBanking: "Bank und SCHUFA",
    topicMobility: "Auto und Führerschein",
    topicAuthorities: "Behörden",
    promptKindergeld: "Was brauche ich für den Kindergeldantrag und wo stelle ich ihn?",
    promptTax: "Welche Unterlagen brauche ich für meine Steuererklärung?",
    promptDental: "Wie viel übernimmt meine Krankenkasse für Zahnersatz?",
    promptDeposit: "Mein Vermieter zahlt die Kaution nicht zurück. Welche Rechte habe ich?",
    promptWohngeld: "Habe ich Anspruch auf Wohngeld und welche Unterlagen brauche ich?",
    promptResidence: "Welche Schritte brauche ich für die Verlängerung meines Aufenthaltstitels?",
  },
  en: {
    immigrationReadiness: "Immigration Readiness", readinessVeryClose: "You are very close to applying", readinessGood: "Your preparation is progressing well", readinessMissing: "Some important items are missing", readinessStarted: "You have just started preparing", readinessNoData: "No analysis data yet", readinessProgress: "{completed} / {total} documents completed. Required documents were weighted more heavily.", readinessEmpty: "Create a process and document list first to calculate readiness.", priorityCritical: "Critical", priorityWarning: "Important", priorityInfo: "Suggestion", prioritySuccess: "Ready", criticalAiAlert: "Critical AI alert", aiSuggestion: "AI suggestion", requiredDocumentMissing: "The required document in {process} has not been uploaded yet.", deadlineToday: "This process is due today.", deadlineInDays: "This process reaches its deadline in {count} days.", preparationControlled: "Your preparation is under control", preparationControlledText: "No critical gap is visible right now. Keep your process information up to date.", createFirstProcessTitle: "Create your first process", createFirstProcessText: "Start your first process for personalized recommendations and readiness analysis.", riskHigh: "High risk", riskHighText: "There is a critical gap or a very close deadline.", riskMedium: "Medium risk", riskMediumText: "A document or upcoming deadline needs attention.", riskLow: "Low risk", riskLowText: "Nothing currently appears to require urgent action.", checkProcess: "Check your process", uploadRequiredDocument: "Upload the required document in {process}.", checkAlerts: "Check for new alerts or missing documents.", startRoadmap: "Start a process to create your personal roadmap.", estimateByMissing: "This estimate is based on the number of missing documents.", noRequiredMissing: "No required document is missing from the current list.", documentUploaded: "Document uploaded.", optionalNotUploaded: "The optional document has not been uploaded yet.", requiredNotUploaded: "The required document has not been uploaded yet.", noDocumentList: "No document list has been created for this process yet.", criticalTopics: "{count} critical items should be handled first.", requiredDocumentsPending: "{count} required documents are waiting to be completed.", noCriticalMissing: "No critical gap is visible right now.", noDeadline: "No deadline", untitledDocument: "Untitled document", untitledProcess: "Untitled process", userFallback: "User", missingDocumentAi: "Missing document", uploadMissingDocumentAi: "You need to upload “{document}”.", deadlineExpiredAi: "Deadline expired", deadlineExpiredMessageAi: "This process appears to be past its deadline.", deadlineApproachingAi: "Upcoming deadline", deadlineApproachingMessageAi: "{count} days remain until the deadline.", allCompleteAi: "Great!", allCompleteMessageAi: "All required documents appear to be complete.", readinessScoreAi: "Readiness score", readinessScoreMessageAi: "Your overall readiness score is %{score}.",

    loading: "Preparing ALQEV...",
    signOut: "Sign out",
    signingOut: "Signing out...",
    dailyCenter: "Daily life hub",
    welcomeMorning: "Good morning",
    welcomeDay: "Good afternoon",
    welcomeEvening: "Good evening",
    welcomeNight: "Good night",
    intro: "Manage today’s priorities, missing documents, and upcoming deadlines from one screen.",
    plan: "Plan",
    language: "Language",
    country: "Country",
    profile: "Profile",
    completed: "Completed",
    incomplete: "Incomplete",
    freePlan: "Free plan",
    unspecified: "Not specified",
    startProcess: "Start a new process",
    viewProcesses: "View my processes",
    completeProfile: "Please complete your profile",
    completeProfileText: "ALQEV can provide more accurate recommendations when you add your country, language, and personal needs.",
    completeProfileButton: "Complete profile",
    activeProcesses: "Active processes",
    activeProcessesDesc: "Your ongoing applications and official procedures.",
    documents: "Documents",
    documentsReady: "Your documents are %{percent} ready.",
    criticalTasks: "Critical tasks",
    criticalTasksDesc: "Alerts that should be handled quickly.",
    missingDocuments: "Missing documents",
    requiredWaiting: "{count} required documents are missing.",
    aiReadiness: "AI readiness analysis",
    readyDocuments: "Ready documents",
    requiredMissing: "Required missing",
    todayPriorities: "Today’s priorities",
    topThree: "Top 3 steps",
    riskAnalysis: "Risk analysis",
    nextStep: "Next step",
    estimatedReadiness: "Estimated readiness",
    ready: "Ready",
    days: "{count} days",
    openStep: "Open step →",
    featuredProcess: "Featured process",
    completedPercent: "%{percent} completed",
    processDetails: "Open process details",
    noProcess: "You do not have a process yet",
    noProcessText: "Once you start your first process, its progress and required documents will appear here.",
    firstProcess: "Start your first process",
    aiSummary: "AI status summary",
    goToProcess: "Go to process",
    createProcess: "Create process",
    upcomingDate: "Upcoming important date",
    noUpcomingDate: "No upcoming date",
    noUpcomingDateText: "When you add a deadline to a process, the nearest date will appear here.",
    targetToday: "The deadline is today.",
    daysRemaining: "Must be completed within {count} days.",
    alAssistant: "AL Life Assistant",
    alWelcome: "Welcome, {name}",
    alQuestion: "What would you like to ask me today?",
    alDescription: "Ask in your own language about public services, benefits, taxes, health, work, housing, and daily life in Germany.",
    alPlaceholder: "For example: My landlord has not returned my deposit. What can I do?",
    alSend: "Ask AL",
    alPrivacy: "AL considers your personal situation and saved processes. For important decisions, also verify official sources or seek professional advice.",
    alPopularTopics: "Popular topics",
    alExplore: "Choose a topic or ask your question directly",
    alEmptyQuestion: "Please enter a question first.",
    topicImmigration: "Residence and citizenship",
    topicFamily: "Family and children",
    topicBenefits: "Social benefits",
    topicTax: "Taxes",
    topicHousing: "Housing and tenant rights",
    topicHealth: "Health and insurance",
    topicWork: "Work and employment rights",
    topicEducation: "Education and recognition",
    topicInsurance: "Insurance",
    topicBanking: "Banking and SCHUFA",
    topicMobility: "Cars and driving licences",
    topicAuthorities: "Public authorities",
    promptKindergeld: "What do I need for a Kindergeld application and where do I apply?",
    promptTax: "Which documents do I need for my tax return?",
    promptDental: "How much will my health insurer pay toward dental prosthetics?",
    promptDeposit: "My landlord has not returned my deposit. What are my rights?",
    promptWohngeld: "Am I eligible for Wohngeld and which documents do I need?",
    promptResidence: "What steps are required to extend my residence permit?",
  },
  ru: {
    immigrationReadiness: "Готовность к иммиграции", readinessVeryClose: "Вы почти готовы к подаче заявления", readinessGood: "Подготовка идет хорошо", readinessMissing: "Не хватает нескольких важных пунктов", readinessStarted: "Вы только начали подготовку", readinessNoData: "Данных для анализа пока нет", readinessProgress: "Завершено документов: {completed} / {total}. Обязательные документы имеют больший вес.", readinessEmpty: "Сначала создайте процесс и список документов.", priorityCritical: "Критично", priorityWarning: "Важно", priorityInfo: "Рекомендация", prioritySuccess: "Готово", criticalAiAlert: "Критическое предупреждение ИИ", aiSuggestion: "Рекомендация ИИ", requiredDocumentMissing: "Обязательный документ в процессе «{process}» еще не загружен.", deadlineToday: "Срок этого процесса истекает сегодня.", deadlineInDays: "До срока этого процесса осталось {count} дней.", preparationControlled: "Подготовка под контролем", preparationControlledText: "Сейчас критических пробелов нет. Поддерживайте данные процесса в актуальном состоянии.", createFirstProcessTitle: "Создайте первый процесс", createFirstProcessText: "Запустите первый процесс для персональных рекомендаций и анализа готовности.", riskHigh: "Высокий риск", riskHighText: "Есть критический пробел или очень близкий срок.", riskMedium: "Средний риск", riskMediumText: "Документ или приближающийся срок требуют внимания.", riskLow: "Низкий риск", riskLowText: "Сейчас нет ситуации, требующей срочных действий.", checkProcess: "Проверить процесс", uploadRequiredDocument: "Загрузите обязательный документ в процессе «{process}».", checkAlerts: "Проверьте новые предупреждения и недостающие документы.", startRoadmap: "Начните процесс, чтобы создать личный план действий.", estimateByMissing: "Оценка основана на количестве недостающих документов.", noRequiredMissing: "В текущем списке нет недостающих обязательных документов.", documentUploaded: "Документ загружен.", optionalNotUploaded: "Необязательный документ еще не загружен.", requiredNotUploaded: "Обязательный документ еще не загружен.", noDocumentList: "Для этого процесса список документов еще не создан.", criticalTopics: "В первую очередь нужно решить критические вопросы: {count}.", requiredDocumentsPending: "Ожидают завершения обязательные документы: {count}.", noCriticalMissing: "Сейчас критических пробелов нет.", noDeadline: "Срок не указан", untitledDocument: "Документ без названия", untitledProcess: "Процесс без названия", userFallback: "Пользователь", missingDocumentAi: "Недостающий документ", uploadMissingDocumentAi: "Необходимо загрузить документ «{document}».", deadlineExpiredAi: "Срок истёк", deadlineExpiredMessageAi: "Срок этого процесса, по-видимому, уже истёк.", deadlineApproachingAi: "Приближается срок", deadlineApproachingMessageAi: "До окончания срока осталось {count} дней.", allCompleteAi: "Отлично!", allCompleteMessageAi: "Все обязательные документы, похоже, готовы.", readinessScoreAi: "Оценка готовности", readinessScoreMessageAi: "Ваша общая оценка готовности: %{score}.",

    loading: "ALQEV загружается...",
    signOut: "Выйти",
    signingOut: "Выход...",
    dailyCenter: "Центр повседневных дел",
    welcomeMorning: "Доброе утро",
    welcomeDay: "Добрый день",
    welcomeEvening: "Добрый вечер",
    welcomeNight: "Доброй ночи",
    intro: "Управляйте сегодняшними приоритетами, недостающими документами и ближайшими сроками на одном экране.",
    plan: "Тариф",
    language: "Язык",
    country: "Страна",
    profile: "Профиль",
    completed: "Завершено",
    incomplete: "Не завершено",
    freePlan: "Бесплатный тариф",
    unspecified: "Не указано",
    startProcess: "Начать новый процесс",
    viewProcesses: "Мои процессы",
    completeProfile: "Пожалуйста, заполните профиль",
    completeProfileText: "После добавления страны, языка и личных потребностей ALQEV сможет давать более точные рекомендации.",
    completeProfileButton: "Заполнить профиль",
    activeProcesses: "Активные процессы",
    activeProcessesDesc: "Ваши текущие заявления и официальные процедуры.",
    documents: "Документы",
    documentsReady: "Ваши документы готовы на %{percent}.",
    criticalTasks: "Критические задачи",
    criticalTasksDesc: "Предупреждения, требующие быстрого решения.",
    missingDocuments: "Недостающие документы",
    requiredWaiting: "Не хватает обязательных документов: {count}.",
    aiReadiness: "Анализ готовности ИИ",
    readyDocuments: "Готовые документы",
    requiredMissing: "Обязательные недостающие",
    todayPriorities: "Приоритеты на сегодня",
    topThree: "3 главных шага",
    riskAnalysis: "Анализ рисков",
    nextStep: "Следующий шаг",
    estimatedReadiness: "Оценка готовности",
    ready: "Готово",
    days: "{count} дней",
    openStep: "Открыть шаг →",
    featuredProcess: "Основной процесс",
    completedPercent: "Завершено: %{percent}",
    processDetails: "Открыть процесс",
    noProcess: "У вас пока нет процесса",
    noProcessText: "После запуска первого процесса здесь появятся его прогресс и необходимые документы.",
    firstProcess: "Начать первый процесс",
    aiSummary: "Сводка ИИ",
    goToProcess: "Перейти к процессу",
    createProcess: "Создать процесс",
    upcomingDate: "Ближайшая важная дата",
    noUpcomingDate: "Нет ближайших дат",
    noUpcomingDateText: "После добавления срока к процессу ближайшая дата появится здесь.",
    targetToday: "Срок истекает сегодня.",
    daysRemaining: "Необходимо завершить в течение {count} дней.",
    alAssistant: "AL — помощник по жизни",
    alWelcome: "Добро пожаловать, {name}",
    alQuestion: "О чём вы хотите спросить меня сегодня?",
    alDescription: "Задайте на своём языке вопрос о ведомствах, пособиях, налогах, здоровье, работе, жилье и повседневной жизни в Германии.",
    alPlaceholder: "Например: арендодатель не возвращает залог. Что мне делать?",
    alSend: "Спросить AL",
    alPrivacy: "AL учитывает вашу личную ситуацию и сохранённые процессы. Для важных решений также проверяйте официальные источники или обращайтесь к специалисту.",
    alPopularTopics: "Популярные темы",
    alExplore: "Выберите тему или задайте вопрос напрямую",
    alEmptyQuestion: "Сначала введите вопрос.",
    topicImmigration: "ВНЖ и гражданство",
    topicFamily: "Семья и дети",
    topicBenefits: "Социальные выплаты",
    topicTax: "Налоги",
    topicHousing: "Жильё и права арендаторов",
    topicHealth: "Здоровье и Krankenkasse",
    topicWork: "Работа и трудовые права",
    topicEducation: "Образование и признание",
    topicInsurance: "Страхование",
    topicBanking: "Банки и SCHUFA",
    topicMobility: "Автомобиль и водительские права",
    topicAuthorities: "Государственные учреждения",
    promptKindergeld: "Что нужно для подачи на Kindergeld и куда обращаться?",
    promptTax: "Какие документы нужны для налоговой декларации?",
    promptDental: "Какую часть стоимости зубного протеза оплатит Krankenkasse?",
    promptDeposit: "Арендодатель не возвращает залог. Какие у меня права?",
    promptWohngeld: "Имею ли я право на Wohngeld и какие документы нужны?",
    promptResidence: "Какие шаги нужны для продления вида на жительство?",
  },
  ar: {
    immigrationReadiness: "الجاهزية للهجرة", readinessVeryClose: "أنت قريب جدًا من تقديم الطلب", readinessGood: "استعدادك يتقدم بشكل جيد", readinessMissing: "توجد بعض النواقص المهمة", readinessStarted: "لقد بدأت الاستعداد للتو", readinessNoData: "لا توجد بيانات تحليل بعد", readinessProgress: "تم إكمال {completed} من أصل {total} وثيقة. مُنحت الوثائق الإلزامية وزنًا أكبر.", readinessEmpty: "أنشئ إجراءً وقائمة وثائق أولًا لحساب الجاهزية.", priorityCritical: "حرج", priorityWarning: "مهم", priorityInfo: "اقتراح", prioritySuccess: "جاهز", criticalAiAlert: "تنبيه حرج من الذكاء الاصطناعي", aiSuggestion: "اقتراح الذكاء الاصطناعي", requiredDocumentMissing: "لم تُرفع الوثيقة الإلزامية في إجراء {process} بعد.", deadlineToday: "الموعد النهائي لهذا الإجراء اليوم.", deadlineInDays: "يتبقى {count} يوم على الموعد النهائي.", preparationControlled: "استعدادك تحت السيطرة", preparationControlledText: "لا تظهر نواقص حرجة حاليًا. حافظ على تحديث معلومات الإجراء.", createFirstProcessTitle: "أنشئ أول إجراء", createFirstProcessText: "ابدأ أول إجراء للحصول على توصيات شخصية وتحليل الجاهزية.", riskHigh: "مخاطر مرتفعة", riskHighText: "توجد مشكلة حرجة أو موعد نهائي قريب جدًا.", riskMedium: "مخاطر متوسطة", riskMediumText: "توجد وثيقة أو مهلة قريبة تحتاج إلى اهتمام.", riskLow: "مخاطر منخفضة", riskLowText: "لا توجد حاليًا حالة تتطلب تدخلاً عاجلًا.", checkProcess: "تحقق من الإجراء", uploadRequiredDocument: "ارفع الوثيقة الإلزامية في إجراء {process}.", checkAlerts: "تحقق من التنبيهات الجديدة أو الوثائق الناقصة.", startRoadmap: "ابدأ إجراءً لإنشاء خارطة طريقك الشخصية.", estimateByMissing: "يعتمد هذا التقدير على عدد الوثائق الناقصة.", noRequiredMissing: "لا توجد وثائق إلزامية ناقصة في القائمة الحالية.", documentUploaded: "تم رفع الوثيقة.", optionalNotUploaded: "لم تُرفع الوثيقة الاختيارية بعد.", requiredNotUploaded: "لم تُرفع الوثيقة الإلزامية بعد.", noDocumentList: "لم تُنشأ قائمة وثائق لهذا الإجراء بعد.", criticalTopics: "يجب معالجة {count} من المسائل الحرجة أولًا.", requiredDocumentsPending: "تنتظر {count} وثيقة إلزامية الإكمال.", noCriticalMissing: "لا تظهر نواقص حرجة حاليًا.", noDeadline: "لا يوجد موعد نهائي", untitledDocument: "وثيقة بلا عنوان", untitledProcess: "إجراء بلا عنوان", userFallback: "المستخدم", missingDocumentAi: "وثيقة ناقصة", uploadMissingDocumentAi: "يجب رفع الوثيقة «{document}».", deadlineExpiredAi: "انتهت المهلة", deadlineExpiredMessageAi: "يبدو أن الموعد النهائي لهذا الإجراء قد انقضى.", deadlineApproachingAi: "موعد نهائي قريب", deadlineApproachingMessageAi: "تبقى {count} يوم على الموعد النهائي.", allCompleteAi: "رائع!", allCompleteMessageAi: "يبدو أن جميع الوثائق الإلزامية مكتملة.", readinessScoreAi: "درجة الجاهزية", readinessScoreMessageAi: "درجة جاهزيتك العامة هي %{score}.",

    loading: "جارٍ تجهيز ALQEV...",
    signOut: "تسجيل الخروج",
    signingOut: "جارٍ تسجيل الخروج...",
    dailyCenter: "مركز الحياة اليومية",
    welcomeMorning: "صباح الخير",
    welcomeDay: "مرحبًا",
    welcomeEvening: "مساء الخير",
    welcomeNight: "ليلة سعيدة",
    intro: "أدر أولويات اليوم والوثائق الناقصة والمواعيد القادمة من شاشة واحدة.",
    plan: "الخطة",
    language: "اللغة",
    country: "البلد",
    profile: "الملف الشخصي",
    completed: "مكتمل",
    incomplete: "غير مكتمل",
    freePlan: "الخطة المجانية",
    unspecified: "غير محدد",
    startProcess: "بدء إجراء جديد",
    viewProcesses: "عرض إجراءاتي",
    completeProfile: "يرجى إكمال ملفك الشخصي",
    completeProfileText: "يمكن لـ ALQEV تقديم توصيات أدق عند إضافة البلد واللغة والاحتياجات الشخصية.",
    completeProfileButton: "إكمال الملف",
    activeProcesses: "الإجراءات النشطة",
    activeProcessesDesc: "طلباتك وإجراءاتك الرسمية الجارية.",
    documents: "الوثائق",
    documentsReady: "وثائقك جاهزة بنسبة %{percent}.",
    criticalTasks: "المهام الحرجة",
    criticalTasksDesc: "تنبيهات يجب التعامل معها بسرعة.",
    missingDocuments: "الوثائق الناقصة",
    requiredWaiting: "عدد الوثائق الإلزامية الناقصة: {count}.",
    aiReadiness: "تحليل الجاهزية بالذكاء الاصطناعي",
    readyDocuments: "الوثائق الجاهزة",
    requiredMissing: "النواقص الإلزامية",
    todayPriorities: "أولويات اليوم",
    topThree: "أهم 3 خطوات",
    riskAnalysis: "تحليل المخاطر",
    nextStep: "الخطوة التالية",
    estimatedReadiness: "الجاهزية المقدرة",
    ready: "جاهز",
    days: "{count} يوم",
    openStep: "فتح الخطوة ←",
    featuredProcess: "الإجراء المميز",
    completedPercent: "اكتمل %{percent}",
    processDetails: "فتح تفاصيل الإجراء",
    noProcess: "ليس لديك إجراء بعد",
    noProcessText: "عند بدء أول إجراء ستظهر هنا نسبة التقدم والوثائق المطلوبة.",
    firstProcess: "بدء أول إجراء",
    aiSummary: "ملخص حالة الذكاء الاصطناعي",
    goToProcess: "الانتقال إلى الإجراء",
    createProcess: "إنشاء إجراء",
    upcomingDate: "الموعد المهم القادم",
    noUpcomingDate: "لا توجد مواعيد قادمة",
    noUpcomingDateText: "عند إضافة موعد نهائي إلى إجراء سيظهر أقرب موعد هنا.",
    targetToday: "الموعد النهائي اليوم.",
    daysRemaining: "يجب إكماله خلال {count} يوم.",
    alAssistant: "مساعد AL للحياة",
    alWelcome: "مرحبًا {name}",
    alQuestion: "ماذا تريد أن تسألني اليوم؟",
    alDescription: "اكتب بلغتك سؤالك عن الدوائر الرسمية والمساعدات والضرائب والصحة والعمل والسكن والحياة اليومية في ألمانيا.",
    alPlaceholder: "مثال: المؤجر لم يُعد مبلغ التأمين. ماذا أفعل؟",
    alSend: "اسأل AL",
    alPrivacy: "يراعي AL وضعك الشخصي وإجراءاتك المحفوظة. في القرارات المهمة تحقّق أيضًا من المصادر الرسمية أو استشر مختصًا.",
    alPopularTopics: "مواضيع شائعة",
    alExplore: "اختر موضوعًا أو اكتب سؤالك مباشرة",
    alEmptyQuestion: "يرجى كتابة سؤال أولًا.",
    topicImmigration: "الإقامة والجنسية",
    topicFamily: "الأسرة والأطفال",
    topicBenefits: "المساعدات الاجتماعية",
    topicTax: "الضرائب",
    topicHousing: "السكن وحقوق المستأجر",
    topicHealth: "الصحة والتأمين الصحي",
    topicWork: "العمل وحقوق الموظف",
    topicEducation: "التعليم ومعادلة الشهادات",
    topicInsurance: "التأمينات",
    topicBanking: "البنوك وSCHUFA",
    topicMobility: "السيارة ورخصة القيادة",
    topicAuthorities: "الدوائر الرسمية",
    promptKindergeld: "ما المطلوب للتقديم على Kindergeld وأين أقدّم الطلب؟",
    promptTax: "ما الوثائق المطلوبة للإقرار الضريبي؟",
    promptDental: "كم يدفع التأمين الصحي لتكاليف تعويض الأسنان؟",
    promptDeposit: "المؤجر لم يُعد مبلغ التأمين. ما حقوقي؟",
    promptWohngeld: "هل يحق لي Wohngeld وما الوثائق المطلوبة؟",
    promptResidence: "ما الخطوات المطلوبة لتمديد تصريح الإقامة؟",
  },
  fa: {
    immigrationReadiness: "آمادگی مهاجرت", readinessVeryClose: "تقریباً آماده ارسال درخواست هستید", readinessGood: "آمادگی شما به‌خوبی پیش می‌رود", readinessMissing: "چند مورد مهم ناقص است", readinessStarted: "تازه آماده‌سازی را شروع کرده‌اید", readinessNoData: "هنوز داده‌ای برای تحلیل وجود ندارد", readinessProgress: "{completed} از {total} مدرک تکمیل شده است. به مدارک الزامی وزن بیشتری داده شد.", readinessEmpty: "برای محاسبه آمادگی ابتدا یک فرایند و فهرست مدارک ایجاد کنید.", priorityCritical: "بحرانی", priorityWarning: "مهم", priorityInfo: "پیشنهاد", prioritySuccess: "آماده", criticalAiAlert: "هشدار بحرانی هوش مصنوعی", aiSuggestion: "پیشنهاد هوش مصنوعی", requiredDocumentMissing: "مدرک الزامی در فرایند {process} هنوز بارگذاری نشده است.", deadlineToday: "مهلت این فرایند امروز است.", deadlineInDays: "تا مهلت این فرایند {count} روز باقی مانده است.", preparationControlled: "آمادگی شما تحت کنترل است", preparationControlledText: "در حال حاضر نقص بحرانی دیده نمی‌شود. اطلاعات فرایند را به‌روز نگه دارید.", createFirstProcessTitle: "اولین فرایند را ایجاد کنید", createFirstProcessText: "برای دریافت پیشنهادهای شخصی و تحلیل آمادگی، اولین فرایند را شروع کنید.", riskHigh: "ریسک بالا", riskHighText: "یک نقص بحرانی یا مهلت بسیار نزدیک وجود دارد.", riskMedium: "ریسک متوسط", riskMediumText: "یک مدرک یا مهلت نزدیک نیاز به توجه دارد.", riskLow: "ریسک پایین", riskLowText: "در حال حاضر موردی که نیازمند اقدام فوری باشد دیده نمی‌شود.", checkProcess: "فرایند را بررسی کنید", uploadRequiredDocument: "مدرک الزامی فرایند {process} را بارگذاری کنید.", checkAlerts: "هشدارهای جدید یا مدارک ناقص را بررسی کنید.", startRoadmap: "برای ساخت نقشه راه شخصی خود یک فرایند شروع کنید.", estimateByMissing: "این برآورد بر اساس تعداد مدارک ناقص محاسبه شده است.", noRequiredMissing: "در فهرست فعلی هیچ مدرک الزامی ناقصی وجود ندارد.", documentUploaded: "مدرک بارگذاری شد.", optionalNotUploaded: "مدرک اختیاری هنوز بارگذاری نشده است.", requiredNotUploaded: "مدرک الزامی هنوز بارگذاری نشده است.", noDocumentList: "هنوز برای این فرایند فهرست مدارک ایجاد نشده است.", criticalTopics: "ابتدا باید {count} مورد بحرانی بررسی شود.", requiredDocumentsPending: "{count} مدرک الزامی در انتظار تکمیل است.", noCriticalMissing: "در حال حاضر نقص بحرانی دیده نمی‌شود.", noDeadline: "بدون مهلت", untitledDocument: "مدرک بدون عنوان", untitledProcess: "فرایند بدون عنوان", userFallback: "کاربر", missingDocumentAi: "مدرک ناقص", uploadMissingDocumentAi: "باید مدرک «{document}» را بارگذاری کنید.", deadlineExpiredAi: "مهلت پایان یافته", deadlineExpiredMessageAi: "به نظر می‌رسد مهلت این فرایند گذشته است.", deadlineApproachingAi: "مهلت نزدیک", deadlineApproachingMessageAi: "{count} روز تا پایان مهلت باقی مانده است.", allCompleteAi: "عالی!", allCompleteMessageAi: "به نظر می‌رسد همه مدارک الزامی کامل هستند.", readinessScoreAi: "امتیاز آمادگی", readinessScoreMessageAi: "امتیاز کلی آمادگی شما %{score} است.",

    loading: "ALQEV در حال آماده‌سازی است...",
    signOut: "خروج",
    signingOut: "در حال خروج...",
    dailyCenter: "مرکز امور روزمره",
    welcomeMorning: "صبح بخیر",
    welcomeDay: "روز بخیر",
    welcomeEvening: "عصر بخیر",
    welcomeNight: "شب بخیر",
    intro: "اولویت‌های امروز، مدارک ناقص و مهلت‌های پیش رو را در یک صفحه مدیریت کنید.",
    plan: "طرح",
    language: "زبان",
    country: "کشور",
    profile: "پروفایل",
    completed: "تکمیل شده",
    incomplete: "تکمیل نشده",
    freePlan: "طرح رایگان",
    unspecified: "مشخص نشده",
    startProcess: "شروع فرایند جدید",
    viewProcesses: "مشاهده فرایندهای من",
    completeProfile: "لطفاً پروفایل خود را تکمیل کنید",
    completeProfileText: "با افزودن کشور، زبان و نیازهای شخصی، ALQEV پیشنهادهای دقیق‌تری ارائه می‌دهد.",
    completeProfileButton: "تکمیل پروفایل",
    activeProcesses: "فرایندهای فعال",
    activeProcessesDesc: "درخواست‌ها و امور رسمی در حال انجام شما.",
    documents: "مدارک",
    documentsReady: "مدارک شما %{percent} آماده است.",
    criticalTasks: "کارهای حیاتی",
    criticalTasksDesc: "هشدارهایی که باید سریع بررسی شوند.",
    missingDocuments: "مدارک ناقص",
    requiredWaiting: "{count} مدرک الزامی ناقص است.",
    aiReadiness: "تحلیل آمادگی هوش مصنوعی",
    readyDocuments: "مدارک آماده",
    requiredMissing: "مدارک الزامی ناقص",
    todayPriorities: "اولویت‌های امروز",
    topThree: "۳ گام مهم",
    riskAnalysis: "تحلیل ریسک",
    nextStep: "گام بعدی",
    estimatedReadiness: "آمادگی تخمینی",
    ready: "آماده",
    days: "{count} روز",
    openStep: "باز کردن گام ←",
    featuredProcess: "فرایند برجسته",
    completedPercent: "%{percent} تکمیل شده",
    processDetails: "باز کردن جزئیات فرایند",
    noProcess: "هنوز فرایندی ندارید",
    noProcessText: "پس از شروع اولین فرایند، پیشرفت و مدارک لازم در اینجا نمایش داده می‌شود.",
    firstProcess: "شروع اولین فرایند",
    aiSummary: "خلاصه وضعیت هوش مصنوعی",
    goToProcess: "رفتن به فرایند",
    createProcess: "ایجاد فرایند",
    upcomingDate: "تاریخ مهم پیش رو",
    noUpcomingDate: "تاریخ نزدیکی وجود ندارد",
    noUpcomingDateText: "با افزودن مهلت به یک فرایند، نزدیک‌ترین تاریخ اینجا نمایش داده می‌شود.",
    targetToday: "مهلت امروز است.",
    daysRemaining: "باید ظرف {count} روز تکمیل شود.",
    alAssistant: "دستیار زندگی AL",
    alWelcome: "خوش آمدید {name}",
    alQuestion: "امروز چه چیزی می‌خواهید از من بپرسید؟",
    alDescription: "پرسش خود درباره اداره‌ها، کمک‌های اجتماعی، مالیات، سلامت، کار، مسکن و زندگی روزمره در آلمان را به زبان خود بنویسید.",
    alPlaceholder: "برای مثال: صاحبخانه ودیعه را پس نمی‌دهد. چه کار کنم؟",
    alSend: "از AL بپرس",
    alPrivacy: "AL شرایط شخصی و فرایندهای ذخیره‌شده شما را در نظر می‌گیرد. برای تصمیم‌های مهم منابع رسمی یا نظر متخصص را نیز بررسی کنید.",
    alPopularTopics: "موضوعات پرکاربرد",
    alExplore: "یک موضوع انتخاب کنید یا مستقیماً سؤال خود را بنویسید",
    alEmptyQuestion: "لطفاً ابتدا یک سؤال بنویسید.",
    topicImmigration: "اقامت و تابعیت",
    topicFamily: "خانواده و فرزندان",
    topicBenefits: "کمک‌های اجتماعی",
    topicTax: "مالیات",
    topicHousing: "مسکن و حقوق مستأجر",
    topicHealth: "سلامت و بیمه درمانی",
    topicWork: "کار و حقوق کاری",
    topicEducation: "تحصیل و ارزیابی مدارک",
    topicInsurance: "بیمه‌ها",
    topicBanking: "بانک و SCHUFA",
    topicMobility: "خودرو و گواهینامه",
    topicAuthorities: "اداره‌های دولتی",
    promptKindergeld: "برای درخواست Kindergeld چه مدارکی لازم است و کجا باید اقدام کنم؟",
    promptTax: "برای اظهارنامه مالیاتی چه مدارکی لازم دارم؟",
    promptDental: "بیمه درمانی چه مقدار از هزینه پروتز دندان را می‌پردازد؟",
    promptDeposit: "صاحبخانه ودیعه را پس نمی‌دهد. حقوق من چیست؟",
    promptWohngeld: "آیا شامل Wohngeld می‌شوم و چه مدارکی لازم است؟",
    promptResidence: "برای تمدید اجازه اقامت چه مراحلی لازم است؟",
  },
};

function normalizeLanguage(value: string | undefined): SupportedLanguage {
  return supportedLanguages.some((item) => item.code === value)
    ? (value as SupportedLanguage)
    : "tr";
}

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

type UserProfile = {
  fullName: string;
  email: string;
  language: string;
  country: string;
  onboardingCompleted: boolean;
  subscription: string;
  needs: string[];
};

type RequiredDocument = {
  key: string;
  title: string;
  description?: string;
  required?: boolean;
  status?: string;
  fileName?: string;
  fileUrl?: string;
};

type Process = {
  id: string;
  templateKey?: string;
  title: string;
  description: string;
  country: string;
  status: string;
  progress: number;
  completedDocumentCount: number;
  totalDocumentCount: number;
  deadline: string | null;
  requiredDocuments: RequiredDocument[];
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};

type DashboardCardProps = {
  title: string;
  description: string;
  value: string;
  href: string;
};

type PriorityItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  severity: "critical" | "warning" | "info" | "success";
};

const countryLabels: Record<string, string> = {
  DE: "Almanya",
  TR: "Türkiye",
  AT: "Avusturya",
  CH: "İsviçre",
  NL: "Hollanda",
  BE: "Belçika",
  FR: "Fransa",
  GB: "Birleşik Krallık",
  OTHER: "Diğer",
};

const languageLabels: Record<string, string> = {
  tr: "Türkçe",
  de: "Deutsch",
  en: "English",
  ar: "العربية",
  fa: "فارسی",
  ru: "Русский",
};

const priorityStyles: Record<
  PriorityItem["severity"],
  {
    card: string;
    icon: string;
    badge: string;
    label: string;
  }
> = {
  critical: {
    card: "border-rose-400/20 bg-rose-400/[0.055]",
    icon: "bg-rose-400/15 text-rose-200",
    badge: "bg-rose-400/10 text-rose-200",
    label: "priorityCritical",
  },
  warning: {
    card: "border-amber-400/20 bg-amber-400/[0.05]",
    icon: "bg-amber-400/15 text-amber-200",
    badge: "bg-amber-400/10 text-amber-200",
    label: "priorityWarning",
  },
  info: {
    card: "border-indigo-400/20 bg-indigo-400/[0.05]",
    icon: "bg-indigo-400/15 text-indigo-200",
    badge: "bg-indigo-400/10 text-indigo-200",
    label: "priorityInfo",
  },
  success: {
    card: "border-emerald-400/20 bg-emerald-400/[0.05]",
    icon: "bg-emerald-400/15 text-emerald-200",
    badge: "bg-emerald-400/10 text-emerald-200",
    label: "prioritySuccess",
  },
};

function DashboardCard({
  title,
  description,
  value,
  href,
}: DashboardCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-3xl border border-white/10 bg-white/[0.035] p-6 transition hover:-translate-y-1 hover:border-indigo-400/40 hover:bg-white/[0.06]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-400">
            {title}
          </p>

          <p className="mt-3 text-3xl font-bold text-white">
            {value}
          </p>
        </div>

        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 transition group-hover:border-indigo-400/30 group-hover:text-indigo-300">
          →
        </span>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-400">
        {description}
      </p>
    </Link>
  );
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item === "string" &&
      item.trim().length > 0,
  );
}

function normalizeDocuments(
  value: unknown,
): RequiredDocument[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object",
    )
    .map((item, index) => ({
      key:
        typeof item.key === "string" && item.key.trim()
          ? item.key
          : `document-${index}`,
      title:
        typeof item.title === "string" &&
        item.title.trim()
          ? item.title
          : uiTranslations.tr.untitledDocument,
      description:
        typeof item.description === "string"
          ? item.description
          : undefined,
      required:
        typeof item.required === "boolean"
          ? item.required
          : undefined,
      status:
        typeof item.status === "string"
          ? item.status
          : "missing",
      fileName:
        typeof item.fileName === "string"
          ? item.fileName
          : undefined,
      fileUrl:
        typeof item.fileUrl === "string"
          ? item.fileUrl
          : undefined,
    }));
}

function createFallbackProfile(
  user: User,
): UserProfile {
  return {
    fullName:
      user.displayName?.trim() ||
      user.email?.split("@")[0] ||
      uiTranslations.tr.userFallback,
    email: user.email || "",
    language: "tr",
    country: "",
    onboardingCompleted: false,
    subscription: "free",
    needs: [],
  };
}

function parseDeadline(
  value: string | null,
): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function formatDeadline(
  value: string | null,
  language: SupportedLanguage,
  noDeadline: string,
): string {
  const date = parseDeadline(value);

  if (!date) {
    return noDeadline;
  }

  const locales: Record<SupportedLanguage, string> = { tr: "tr-TR", de: "de-DE", en: "en-US", ru: "ru-RU", ar: "ar-SA", fa: "fa-IR" };

  return new Intl.DateTimeFormat(locales[language], {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getDaysUntil(
  value: string | null,
): number | null {
  const deadline = parseDeadline(value);

  if (!deadline) {
    return null;
  }

  const today = new Date();

  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);

  return Math.ceil(
    (deadline.getTime() - today.getTime()) /
      86_400_000,
  );
}

function isCompletedDocument(
  documentItem: RequiredDocument,
): boolean {
  return (
    documentItem.status === "uploaded" ||
    documentItem.status === "approved"
  );
}

function getGreeting(language: SupportedLanguage): string {
  const copy = uiTranslations[language];
  const hour = new Date().getHours();

  if (hour < 6) {
    return copy.welcomeNight;
  }

  if (hour < 12) {
    return copy.welcomeMorning;
  }

  if (hour < 18) {
    return copy.welcomeDay;
  }

  return copy.welcomeEvening;
}

function getReadinessLabel(
  score: number,
  copy: Record<string, string>,
): string {
  if (score >= 90) return copy.readinessVeryClose;
  if (score >= 70) return copy.readinessGood;
  if (score >= 40) return copy.readinessMissing;
  if (score > 0) return copy.readinessStarted;
  return copy.readinessNoData;
}

function getRiskLevel(
  input: {
  criticalCount: number;
  requiredMissingCount: number;
  nearestDeadlineDays: number | null;
  },
  copy: Record<string, string>,
): {
  label: string;
  description: string;
  className: string;
} {
  if (
    input.criticalCount > 0 ||
    (input.nearestDeadlineDays !== null &&
      input.nearestDeadlineDays <= 3 &&
      input.requiredMissingCount > 0)
  ) {
    return {
      label: copy.riskHigh,
      description: copy.riskHighText,
      className:
        "border-rose-400/20 bg-rose-400/[0.07] text-rose-100",
    };
  }

  if (
    input.requiredMissingCount > 0 ||
    (input.nearestDeadlineDays !== null &&
      input.nearestDeadlineDays <= 14)
  ) {
    return {
      label: copy.riskMedium,
      description: copy.riskMediumText,
      className:
        "border-amber-400/20 bg-amber-400/[0.07] text-amber-100",
    };
  }

  return {
    label: copy.riskLow,
    description: copy.riskLowText,
    className:
      "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-100",
  };
}


function getRecommendationText(
  recommendation: {
    title: string;
    message: string;
    titleKey?: string;
    messageKey?: string;
    variables?: Record<string, string | number>;
  },
  copy: Record<string, string>,
): { title: string; message: string } {
  const titleKeyMap: Record<string, string> = {
    missingDocument: "missingDocumentAi",
    deadlineExpired: "deadlineExpiredAi",
    deadlineApproaching: "deadlineApproachingAi",
    allComplete: "allCompleteAi",
    readinessScore: "readinessScoreAi",
  };

  const messageKeyMap: Record<string, string> = {
    uploadMissingDocument: "uploadMissingDocumentAi",
    deadlineExpiredMessage: "deadlineExpiredMessageAi",
    deadlineApproachingMessage: "deadlineApproachingMessageAi",
    allCompleteMessage: "allCompleteMessageAi",
    readinessScoreMessage: "readinessScoreMessageAi",
  };

  const translatedTitleKey = recommendation.titleKey
    ? titleKeyMap[recommendation.titleKey]
    : undefined;

  const translatedMessageKey = recommendation.messageKey
    ? messageKeyMap[recommendation.messageKey]
    : undefined;

  const title =
    (translatedTitleKey && copy[translatedTitleKey]) ||
    recommendation.title;

  const messageTemplate =
    (translatedMessageKey && copy[translatedMessageKey]) ||
    recommendation.message;

  return {
    title,
    message: fillTemplate(
      messageTemplate,
      recommendation.variables || {},
    ),
  };
}

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] =
    useState<User | null>(null);

  const [profile, setProfile] =
    useState<UserProfile | null>(null);

  const [processes, setProcesses] =
    useState<Process[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSigningOut, setIsSigningOut] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [selectedLanguage, setSelectedLanguage] =
    useState<SupportedLanguage>("tr");

  const [alQuestion, setAlQuestion] = useState("");
  const [alQuestionError, setAlQuestionError] = useState("");

  useEffect(() => {
    const storedLanguage = readStoredLanguage("tr");
    setSelectedLanguage(storedLanguage);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (!currentUser) {
          router.replace("/login");
          return;
        }

        if (!isMounted) {
          return;
        }

        setUser(currentUser);
        setErrorMessage("");

        try {
          const userDocumentReference = doc(
            db,
            "users",
            currentUser.uid,
          );

          const processesReference = collection(
            db,
            "users",
            currentUser.uid,
            "processes",
          );

          const [
            userDocumentSnapshot,
            processSnapshot,
          ] = await Promise.all([
            getDoc(userDocumentReference),
            getDocs(
              query(
                processesReference,
                orderBy("createdAt", "desc"),
              ),
            ).catch(() =>
              getDocs(processesReference),
            ),
          ]);

          if (!isMounted) {
            return;
          }

          if (userDocumentSnapshot.exists()) {
            const data =
              userDocumentSnapshot.data();

            const profileLanguage = normalizeLanguage(
              typeof data.language === "string"
                ? data.language
                : "tr",
            );

            const savedLanguage = readStoredLanguage(
              profileLanguage,
            );

            setSelectedLanguage(savedLanguage);

            setProfile({
              fullName:
                typeof data.fullName === "string" &&
                data.fullName.trim()
                  ? data.fullName.trim()
                  : currentUser.displayName?.trim() ||
                    currentUser.email?.split("@")[0] ||
                    uiTranslations.tr.userFallback,
              email:
                typeof data.email === "string" &&
                data.email.trim()
                  ? data.email.trim()
                  : currentUser.email || "",
              language: savedLanguage,
              country:
                typeof data.country === "string"
                  ? data.country.trim()
                  : "",
              onboardingCompleted:
                typeof data.onboardingCompleted ===
                "boolean"
                  ? data.onboardingCompleted
                  : false,
              subscription:
                typeof data.subscription === "string" &&
                data.subscription.trim()
                  ? data.subscription.trim()
                  : "free",
              needs: normalizeStringArray(
                data.needs,
              ),
            });
          } else {
            const fallbackLanguage =
              readStoredLanguage("tr");

            setSelectedLanguage(fallbackLanguage);
            setProfile({
              ...createFallbackProfile(currentUser),
              language: fallbackLanguage,
            });

            setErrorMessage(
              "Kullanıcı profil belgesi bulunamadı. Geçici bilgiler gösteriliyor.",
            );
          }

          const processList: Process[] =
            processSnapshot.docs.map(
              (processDocument) => {
                const data =
                  processDocument.data();

                const requiredDocuments =
                  normalizeDocuments(
                    data.requiredDocuments,
                  );

                const calculatedCompletedCount =
                  requiredDocuments.filter(
                    isCompletedDocument,
                  ).length;

                const completedDocumentCount =
                  typeof data.completedDocumentCount ===
                  "number"
                    ? data.completedDocumentCount
                    : calculatedCompletedCount;

                const totalDocumentCount =
                  typeof data.totalDocumentCount ===
                  "number"
                    ? data.totalDocumentCount
                    : requiredDocuments.length;

                const calculatedProgress =
                  totalDocumentCount > 0
                    ? Math.round(
                        (completedDocumentCount /
                          totalDocumentCount) *
                          100,
                      )
                    : 0;

                return {
                  id: processDocument.id,
                  templateKey:
                    typeof data.templateKey === "string"
                      ? data.templateKey
                      : undefined,
                  title:
                    typeof data.title === "string" &&
                    data.title.trim()
                      ? data.title
                      : uiTranslations.tr.untitledProcess,
                  description:
                    typeof data.description ===
                    "string"
                      ? data.description
                      : "",
                  country:
                    typeof data.country === "string"
                      ? data.country
                      : "Belirtilmedi",
                  status:
                    typeof data.status === "string"
                      ? data.status
                      : "active",
                  progress:
                    typeof data.progress === "number"
                      ? Math.min(
                          100,
                          Math.max(
                            0,
                            Math.round(data.progress),
                          ),
                        )
                      : calculatedProgress,
                  completedDocumentCount,
                  totalDocumentCount,
                  deadline:
                    typeof data.deadline === "string"
                      ? data.deadline
                      : null,
                  requiredDocuments,
                  createdAt:
                    data.createdAt instanceof Timestamp
                      ? data.createdAt
                      : null,
                  updatedAt:
                    data.updatedAt instanceof Timestamp
                      ? data.updatedAt
                      : null,
                };
              },
            );

          processList.sort(
            (first, second) =>
              (second.createdAt?.toMillis() ??
                0) -
              (first.createdAt?.toMillis() ??
                0),
          );

          setProcesses(processList);
        } catch (error) {
          console.error(
            "Dashboard verileri yüklenemedi:",
            error,
          );

          if (!isMounted) {
            return;
          }

          setProfile(
            createFallbackProfile(currentUser),
          );

          setErrorMessage(
            "Dashboard verileri yüklenirken bir hata oluştu. Lütfen sayfayı yenileyip tekrar dene.",
          );
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      },
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [router]);

  const dashboardData = useMemo(() => {
    const activeProcesses = processes.filter(
      (item) => item.status === "active",
    );

    const totalCompletedDocuments =
      processes.reduce(
        (sum, item) =>
          sum + item.completedDocumentCount,
        0,
      );

    const totalDocuments = processes.reduce(
      (sum, item) =>
        sum + item.totalDocumentCount,
      0,
    );

    const totalMissingDocuments = Math.max(
      0,
      totalDocuments -
        totalCompletedDocuments,
    );

    const requiredMissingDocuments =
      processes.flatMap((processItem) =>
        processItem.requiredDocuments
          .filter(
            (documentItem) =>
              documentItem.required !== false &&
              !isCompletedDocument(documentItem),
          )
          .map((documentItem) => ({
            processId: processItem.id,
            processTitle: processItem.title,
            document: documentItem,
          })),
      );

    const optionalMissingDocuments =
      processes.flatMap((processItem) =>
        processItem.requiredDocuments
          .filter(
            (documentItem) =>
              documentItem.required === false &&
              !isCompletedDocument(documentItem),
          )
          .map((documentItem) => ({
            processId: processItem.id,
            processTitle: processItem.title,
            document: documentItem,
          })),
      );

    const upcomingProcesses = processes
      .map((item) => ({
        ...item,
        daysUntil: getDaysUntil(item.deadline),
      }))
      .filter(
        (
          item,
        ): item is Process & {
          daysUntil: number;
        } =>
          item.daysUntil !== null &&
          item.daysUntil >= 0,
      )
      .sort(
        (first, second) =>
          first.daysUntil - second.daysUntil,
      );

    const overdueProcesses = processes
      .map((item) => ({
        ...item,
        daysUntil: getDaysUntil(item.deadline),
      }))
      .filter(
        (
          item,
        ): item is Process & {
          daysUntil: number;
        } =>
          item.daysUntil !== null &&
          item.daysUntil < 0,
      )
      .sort(
        (first, second) =>
          first.daysUntil - second.daysUntil,
      );

    const primaryProcess =
      activeProcesses[0] ??
      processes[0] ??
      null;

    return {
      activeProcesses,
      totalCompletedDocuments,
      totalDocuments,
      totalMissingDocuments,
      requiredMissingDocuments,
      optionalMissingDocuments,
      upcomingProcesses,
      overdueProcesses,
      primaryProcess,
    };
  }, [processes]);

  const dashboardAdvisor = useMemo(
    () =>
      analyzeDashboard(
        processes as unknown as AdvisorProcess[],
      ),
    [processes],
  );

  const dashboardIntelligence = useMemo(() => {
    const copy = uiTranslations[selectedLanguage];
    const priorities: PriorityItem[] = [];

    for (const recommendation of
      dashboardAdvisor.priorityQueue.slice(0, 3)) {
      const recommendationProcess = processes.find(
        (processItem) =>
          processItem.id === recommendation.processId,
      );

      const recommendationDocument =
        recommendationProcess?.requiredDocuments.find(
          (documentItem) =>
            documentItem.key === recommendation.documentKey,
        );

      const recommendationForDisplay = {
        ...recommendation,
        variables: {
          ...(recommendation.variables || {}),
          ...(recommendationProcess
            ? {
                process: getLocalizedProcessTitle(
                  {
                    templateKey:
                      recommendationProcess.templateKey,
                    title: recommendationProcess.title,
                  },
                  selectedLanguage,
                ),
              }
            : {}),
          ...(recommendationDocument
            ? {
                document: getLocalizedDocumentTitle(
                  {
                    templateKey:
                      recommendationProcess?.templateKey,
                    processTitle:
                      recommendationProcess?.title,
                    documentKey:
                      recommendationDocument.key,
                    documentTitle:
                      recommendationDocument.title,
                  },
                  selectedLanguage,
                ),
              }
            : {}),
        },
      };

      const recommendationText = getRecommendationText(
        recommendationForDisplay,
        copy,
      );

      priorities.push({
        id: recommendation.id,
        title: recommendationText.title,
        description: recommendationText.message,
        href: recommendation.processId
          ? `/processes/${recommendation.processId}`
          : dashboardData.primaryProcess
            ? `/processes/${dashboardData.primaryProcess.id}`
            : "/processes/new",
        severity: recommendation.severity,
      });
    }

    if (priorities.length === 0) {
      priorities.push({
        id: "create-first-process",
        title: processes.length > 0
          ? copy.preparationControlled
          : copy.createFirstProcessTitle,
        description: processes.length > 0
          ? copy.preparationControlledText
          : copy.createFirstProcessText,
        href: dashboardData.primaryProcess
          ? `/processes/${dashboardData.primaryProcess.id}`
          : "/processes/new",
        severity: processes.length > 0
          ? "success"
          : "info",
      });
    }

    const risk = getRiskLevel(
      {
        criticalCount:
          dashboardAdvisor.metrics.criticalIssues,
        requiredMissingCount:
          dashboardAdvisor.metrics
            .missingRequiredDocuments,
        nearestDeadlineDays:
          dashboardAdvisor.metrics
            .nearestDeadlineDays,
      },
      copy,
    );

    const advisorNextAction =
      dashboardAdvisor.nextBestAction;

    const nextActionProcess = advisorNextAction?.processId
      ? processes.find(
          (processItem) =>
            processItem.id === advisorNextAction.processId,
        )
      : undefined;

    const nextActionDocument =
      advisorNextAction?.documentKey
        ? nextActionProcess?.requiredDocuments.find(
            (documentItem) =>
              documentItem.key ===
              advisorNextAction.documentKey,
          )
        : undefined;

    return {
      priorities,
      criticalCount:
        dashboardAdvisor.metrics.criticalIssues,
      warningCount:
        dashboardAdvisor.metrics.warnings,
      risk,
      estimatedDays:
        dashboardAdvisor.metrics
          .totalEstimatedPreparationDays,
      nextAction: advisorNextAction,
      nextActionProcess,
      nextActionDocument,
    };
  }, [
    dashboardAdvisor,
    dashboardData.primaryProcess,
    processes,
    selectedLanguage,
  ]);

  async function handleLanguageChange(
    language: SupportedLanguage,
  ) {
    setSelectedLanguage(language);
    storeLanguage(language);
    setProfile((currentProfile) =>
      currentProfile
        ? { ...currentProfile, language }
        : currentProfile,
    );

    if (!user) {
      return;
    }

    try {
      await updateDoc(doc(db, "users", user.uid), {
        language,
      });
    } catch (error) {
      console.error("Dil tercihi kaydedilemedi:", error);
      setErrorMessage(
        "Dil tercihi kaydedilemedi. Lütfen tekrar dene.",
      );
    }
  }

  function handleAlSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const question = alQuestion.trim();

    if (!question) {
      setAlQuestionError(uiTranslations[selectedLanguage].alEmptyQuestion);
      return;
    }

    setAlQuestionError("");
    router.push(`/dashboard/chat?question=${encodeURIComponent(question)}`);
  }

  function handleSuggestedQuestion(question: string) {
    setAlQuestion(question);
    setAlQuestionError("");
  }

  async function handleSignOut() {
    try {
      setIsSigningOut(true);
      setErrorMessage("");

      await signOut(auth);

      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error(
        "Çıkış yapılamadı:",
        error,
      );

      setErrorMessage(
        "Çıkış yapılırken bir hata oluştu. Lütfen tekrar dene.",
      );

      setIsSigningOut(false);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-400" />

          <p className="mt-4 text-sm text-slate-400">
            {uiTranslations[selectedLanguage].loading}
          </p>
        </div>
      </main>
    );
  }

  if (!user || !profile) {
    return null;
  }

  const language = selectedLanguage;
  const copy = uiTranslations[language];
  const direction = language === "ar" || language === "fa" ? "rtl" : "ltr";

  const displayName =
    profile.fullName.trim() ||
    user.displayName?.trim() ||
    user.email?.split("@")[0] ||
    uiTranslations.tr.userFallback;

  const firstName =
    displayName.split(/\s+/)[0] ||
    displayName;

  const subscriptionLabel =
    profile.subscription.toLowerCase() ===
    "free"
      ? copy.freePlan
      : profile.subscription;

  const countryLabel = profile.country
    ? (() => {
        try {
          const regionNames = new Intl.DisplayNames([language], { type: "region" });
          return regionNames.of(profile.country) || countryLabels[profile.country] || profile.country;
        } catch {
          return countryLabels[profile.country] || profile.country;
        }
      })()
    : copy.unspecified;

  const languageLabel =
    languageLabels[profile.language] ||
    profile.language.toUpperCase();

  const primaryProcess =
    dashboardData.primaryProcess;

  const nearestDeadline =
    dashboardData.upcomingProcesses[0] ??
    null;

  const readinessScore =
    dashboardAdvisor.metrics.averageReadinessScore;

  const completedPercentage =
    dashboardData.totalDocuments > 0
      ? Math.round(
          (dashboardData.totalCompletedDocuments /
            dashboardData.totalDocuments) *
            100,
        )
      : 0;

  const alTopics = [
    "topicImmigration",
    "topicFamily",
    "topicBenefits",
    "topicTax",
    "topicHousing",
    "topicHealth",
    "topicWork",
    "topicEducation",
    "topicInsurance",
    "topicBanking",
    "topicMobility",
    "topicAuthorities",
  ] as const;

  const alSuggestedQuestions = [
    "promptKindergeld",
    "promptTax",
    "promptDental",
    "promptDeposit",
    "promptWohngeld",
    "promptResidence",
  ] as const;

  return (
    <main dir={direction} className="min-h-screen bg-slate-950 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute left-1/4 top-[-300px] h-[600px] w-[600px] rounded-full bg-indigo-700/15 blur-[160px]" />

        <div className="absolute bottom-[-300px] right-[-200px] h-[600px] w-[600px] rounded-full bg-blue-700/10 blur-[170px]" />
      </div>

      <header className="relative z-10 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link
            href="/dashboard"
            className="flex items-center gap-3"
          >
            

            <Image
  src="/logo.png"
  alt="ALQEV Logo"
  width={180}
  height={60}
  priority
  className="h-20 w-auto"
 />
          </Link>

          <div className="flex items-center gap-4">
            <select
              value={language}
              onChange={(event) =>
                handleLanguageChange(
                  event.target.value as SupportedLanguage,
                )
              }
              aria-label={copy.language}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm font-semibold text-slate-200 outline-none transition hover:border-slate-600 focus:border-indigo-400"
            >
              {supportedLanguages.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-white">
                {displayName}
              </p>

              <p className="max-w-48 truncate text-xs text-slate-500">
                {profile.email}
              </p>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSigningOut
                ? copy.signingOut
                : copy.signOut}
            </button>
          </div>
        </nav>
      </header>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-10">
        {errorMessage ? (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-400/[0.07] px-5 py-4 text-sm leading-6 text-amber-100"
          >
            {errorMessage}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[2rem] border border-indigo-300/20 bg-gradient-to-br from-indigo-500/20 via-slate-900/95 to-blue-500/10 shadow-2xl shadow-indigo-950/30">
          <div className="grid lg:grid-cols-[1fr_320px]">
            <div className="p-7 sm:p-10 lg:p-12">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-300/20 bg-indigo-400/15 text-xl shadow-lg shadow-indigo-950/30">
                  AL
                </span>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">
                    {copy.alAssistant}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">ALQEV</p>
                </div>
              </div>

              <h1 className="mt-7 text-3xl font-bold tracking-tight sm:text-5xl">
                {fillTemplate(copy.alWelcome, { name: firstName })} 👋
              </h1>

              <p className="mt-3 text-xl font-semibold text-slate-200 sm:text-2xl">
                {copy.alQuestion}
              </p>

              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-400">
                {copy.alDescription}
              </p>

              <form onSubmit={handleAlSubmit} className="mt-8">
                <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-3 shadow-xl shadow-black/20 transition focus-within:border-indigo-400/50 focus-within:ring-4 focus-within:ring-indigo-500/10">
                  <textarea
                    value={alQuestion}
                    onChange={(event) => {
                      setAlQuestion(event.target.value);
                      if (alQuestionError) setAlQuestionError("");
                    }}
                    placeholder={copy.alPlaceholder}
                    rows={3}
                    className="w-full resize-none bg-transparent px-3 py-3 text-base leading-7 text-white outline-none placeholder:text-slate-600"
                  />

                  <div className="flex flex-col gap-3 border-t border-white/10 px-2 pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs leading-5 text-slate-500">
                      {copy.alPrivacy}
                    </p>

                    <button
                      type="submit"
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-indigo-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-950/40 transition hover:-translate-y-0.5 hover:bg-indigo-400"
                    >
                      {copy.alSend}
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </div>

                {alQuestionError ? (
                  <p role="alert" className="mt-3 text-sm font-medium text-rose-300">
                    {alQuestionError}
                  </p>
                ) : null}
              </form>

              <div className="mt-7">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <p className="text-sm font-semibold text-slate-200">{copy.alPopularTopics}</p>
                  <p className="text-xs text-slate-500">{copy.alExplore}</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {alTopics.map((topicKey) => (
                    <button
                      key={topicKey}
                      type="button"
                      onClick={() => handleSuggestedQuestion(copy[topicKey])}
                      className="rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-indigo-400/30 hover:bg-indigo-400/10 hover:text-indigo-200"
                    >
                      {copy[topicKey]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {alSuggestedQuestions.map((questionKey) => (
                  <button
                    key={questionKey}
                    type="button"
                    onClick={() => handleSuggestedQuestion(copy[questionKey])}
                    className="group flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-start transition hover:border-indigo-400/30 hover:bg-white/[0.06]"
                  >
                    <span className="text-sm leading-6 text-slate-300 group-hover:text-white">
                      {copy[questionKey]}
                    </span>
                    <span className="mt-0.5 text-indigo-400 transition group-hover:translate-x-1">→</span>
                  </button>
                ))}
              </div>
            </div>

            <aside className="border-t border-white/10 bg-black/20 p-7 lg:border-l lg:border-t-0 lg:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {copy.dailyCenter}
              </p>

              <p className="mt-3 text-lg font-bold text-white">
                {getGreeting(language)}, {firstName}.
              </p>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                {copy.intro}
              </p>

              <div className="mt-7 grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm">
                <div className="flex items-center justify-between gap-6">
                  <span className="text-slate-500">{copy.plan}</span>
                  <span className="font-semibold text-slate-200">{subscriptionLabel}</span>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <span className="text-slate-500">{copy.language}</span>
                  <span className="font-semibold text-slate-200">{languageLabel}</span>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <span className="text-slate-500">{copy.country}</span>
                  <span className="font-semibold text-slate-200">{countryLabel}</span>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <span className="text-slate-500">{copy.profile}</span>
                  <span className={profile.onboardingCompleted ? "font-semibold text-emerald-300" : "font-semibold text-amber-300"}>
                    {profile.onboardingCompleted ? copy.completed : copy.incomplete}
                  </span>
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                <Link href="/processes/new" className="inline-flex items-center justify-center rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400">
                  {copy.startProcess}
                </Link>
                <Link href="/processes" className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800">
                  {copy.viewProcesses}
                </Link>
              </div>
            </aside>
          </div>
        </section>

        {!profile.onboardingCompleted ? (
          <section className="mt-6 rounded-3xl border border-amber-400/20 bg-amber-400/[0.06] p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div>
              <p className="font-semibold text-amber-100">
                {copy.completeProfile}
              </p>

              <p className="mt-2 text-sm leading-6 text-amber-100/70">
                {copy.completeProfileText}
              </p>
            </div>

            <Link
              href="/onboarding"
              className="mt-5 inline-flex shrink-0 items-center justify-center rounded-xl bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 sm:mt-0"
            >
              {copy.completeProfileButton}
            </Link>
          </section>
        ) : null}

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <DashboardCard
            title={copy.activeProcesses}
            value={String(
              dashboardData.activeProcesses.length,
            )}
            description={copy.activeProcessesDesc}
            href="/processes"
          />

          <DashboardCard
            title={copy.documents}
            value={`${dashboardData.totalCompletedDocuments} / ${dashboardData.totalDocuments}`}
            description={fillTemplate(copy.documentsReady, { percent: completedPercentage })}
            href={
              primaryProcess
                ? `/processes/${primaryProcess.id}`
                : "/processes"
            }
          />

          <DashboardCard
            title={copy.criticalTasks}
            value={String(
              dashboardIntelligence.criticalCount,
            )}
            description={copy.criticalTasksDesc}
            href={
              primaryProcess
                ? `/processes/${primaryProcess.id}`
                : "/processes"
            }
          />

          <DashboardCard
            title={copy.missingDocuments}
            value={String(
              dashboardData.totalMissingDocuments,
            )}
            description={fillTemplate(copy.requiredWaiting, { count: dashboardData.requiredMissingDocuments.length })}
            href={
              primaryProcess
                ? `/processes/${primaryProcess.id}`
                : "/processes"
            }
          />
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-3xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/[0.12] via-white/[0.035] to-cyan-400/[0.04] p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-300">
                  {copy.aiReadiness}
                </p>

                <h2 className="mt-3 text-2xl font-bold">
                  {copy.immigrationReadiness}
                </h2>
              </div>

              <div className="rounded-2xl border border-indigo-300/20 bg-black/20 px-4 py-3 text-right">
                <span className="text-4xl font-black text-white">
                  {readinessScore}
                </span>

                <span className="ml-1 text-lg text-slate-500">
                  / 100
                </span>
              </div>
            </div>

            <div className="mt-7 h-3 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all"
                style={{
                  width: `${readinessScore}%`,
                }}
              />
            </div>

            <p className="mt-4 font-semibold text-slate-200">
              {getReadinessLabel(readinessScore, copy)}
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              {dashboardAdvisor.metrics.totalDocuments > 0
                ? fillTemplate(copy.readinessProgress, { completed: dashboardAdvisor.metrics.completedDocuments, total: dashboardAdvisor.metrics.totalDocuments })
                : copy.readinessEmpty}
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.05] p-4">
                <p className="text-sm text-emerald-200/70">
                  {copy.readyDocuments}
                </p>

                <p className="mt-2 text-2xl font-bold text-emerald-100">
                  {
                    dashboardData.totalCompletedDocuments
                  }
                </p>
              </div>

              <div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.05] p-4">
                <p className="text-sm text-amber-200/70">
                  {copy.requiredMissing}
                </p>

                <p className="mt-2 text-2xl font-bold text-amber-100">
                  {
                    dashboardData
                      .requiredMissingDocuments
                      .length
                  }
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-300">
                  ALQEV AI
                </p>

                <h2 className="mt-3 text-2xl font-bold">
                  {copy.todayPriorities}
                </h2>
              </div>

              <p className="text-sm text-slate-500">
                {copy.topThree}
              </p>
            </div>

            <div className="mt-6 space-y-3">
              {dashboardIntelligence.priorities.map(
                (item, index) => {
                  const style =
                    priorityStyles[item.severity];

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`group flex gap-4 rounded-2xl border p-4 transition hover:-translate-y-0.5 ${style.card}`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold ${style.icon}`}
                      >
                        {index + 1}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-slate-100">
                            {item.title}
                          </p>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${style.badge}`}
                          >
                            {copy[style.label]}
                          </span>
                        </div>

                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          {item.description}
                        </p>
                      </div>

                      <span className="self-center text-slate-600 transition group-hover:text-indigo-300">
                        →
                      </span>
                    </Link>
                  );
                },
              )}
            </div>
          </article>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <article
            className={`rounded-3xl border p-6 ${dashboardIntelligence.risk.className}`}
          >
            <p className="text-sm font-medium opacity-70">
              {copy.riskAnalysis}
            </p>

            <p className="mt-3 text-2xl font-bold">
              {dashboardIntelligence.risk.label}
            </p>

            <p className="mt-3 text-sm leading-6 opacity-75">
              {
                dashboardIntelligence.risk
                  .description
              }
            </p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
            <p className="text-sm font-medium text-slate-500">
              {copy.nextStep}
            </p>

            <p className="mt-3 text-xl font-bold">
              {dashboardIntelligence.nextAction
                ? getRecommendationText(
                    dashboardIntelligence.nextAction,
                    copy,
                  ).title
                : primaryProcess
                  ? copy.checkProcess
                  : copy.createFirstProcessTitle}
            </p>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              {dashboardIntelligence.nextAction
                ? getRecommendationText(
                    {
                      ...dashboardIntelligence.nextAction,
                      variables: {
                        ...(dashboardIntelligence.nextAction.variables || {}),
                        ...(dashboardIntelligence.nextActionProcess
                          ? {
                              process: getLocalizedProcessTitle(
                                {
                                  templateKey:
                                    dashboardIntelligence.nextActionProcess.templateKey,
                                  title:
                                    dashboardIntelligence.nextActionProcess.title,
                                },
                                selectedLanguage,
                              ),
                            }
                          : {}),
                        ...(dashboardIntelligence.nextActionDocument
                          ? {
                              document: getLocalizedDocumentTitle(
                                {
                                  templateKey:
                                    dashboardIntelligence.nextActionProcess?.templateKey,
                                  processTitle:
                                    dashboardIntelligence.nextActionProcess?.title,
                                  documentKey:
                                    dashboardIntelligence.nextActionDocument.key,
                                  documentTitle:
                                    dashboardIntelligence.nextActionDocument.title,
                                },
                                selectedLanguage,
                              ),
                            }
                          : {}),
                      },
                    },
                    copy,
                  ).message
                : primaryProcess
                  ? copy.checkAlerts
                  : copy.startRoadmap}
            </p>

            <Link
              href={
                dashboardIntelligence.nextAction?.processId
                  ? `/processes/${dashboardIntelligence.nextAction.processId}`
                  : primaryProcess
                    ? `/processes/${primaryProcess.id}`
                    : "/processes/new"
              }
              className="mt-5 inline-flex text-sm font-semibold text-indigo-300 transition hover:text-indigo-200"
            >
              {copy.openStep}
            </Link>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
            <p className="text-sm font-medium text-slate-500">
              {copy.estimatedReadiness}
            </p>

            <p className="mt-3 text-2xl font-bold">
              {dashboardIntelligence.estimatedDays >
              0
                ? fillTemplate(copy.days, { count: dashboardIntelligence.estimatedDays })
                : copy.ready}
            </p>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              {dashboardIntelligence.estimatedDays >
              0
                ? copy.estimateByMissing
                : copy.noRequiredMissing}
            </p>
          </article>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
            {primaryProcess ? (
              <>
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      {copy.featuredProcess}
                    </p>

                    <h2 className="mt-2 text-2xl font-bold">
                      {getLocalizedProcessTitle(
                        {
                          templateKey:
                            primaryProcess.templateKey,
                          title: primaryProcess.title,
                        },
                        selectedLanguage,
                      )}
                    </h2>
                  </div>

                  <div className="rounded-full border border-indigo-400/20 bg-indigo-400/10 px-4 py-2 text-sm font-semibold text-indigo-300">
                    {fillTemplate(copy.completedPercent, { percent: primaryProcess.progress })}
                  </div>
                </div>

                <div className="mt-7 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all"
                    style={{
                      width: `${primaryProcess.progress}%`,
                    }}
                  />
                </div>

                <div className="mt-8 space-y-4">
                  {primaryProcess.requiredDocuments
                    .length > 0 ? (
                    primaryProcess.requiredDocuments
                      .slice(0, 4)
                      .map(
                        (
                          documentItem,
                          index,
                        ) => {
                          const completed =
                            isCompletedDocument(
                              documentItem,
                            );

                          return (
                            <div
                              key={
                                documentItem.key ||
                                `${documentItem.title}-${index}`
                              }
                              className={
                                completed
                                  ? "flex items-center gap-4 rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.04] p-4"
                                  : "flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4"
                              }
                            >
                              <span
                                className={
                                  completed
                                    ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300"
                                    : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-600 text-slate-500"
                                }
                              >
                                {completed
                                  ? "✓"
                                  : "○"}
                              </span>

                              <div className="min-w-0">
                                <p className="font-semibold text-slate-200">
                                  {getLocalizedDocumentTitle(
                                    {
                                      templateKey:
                                        primaryProcess.templateKey,
                                      processTitle:
                                        primaryProcess.title,
                                      documentKey:
                                        documentItem.key,
                                      documentTitle:
                                        documentItem.title,
                                    },
                                    selectedLanguage,
                                  )}
                                </p>

                                <p
                                  className={
                                    completed
                                      ? "mt-1 text-sm text-slate-500"
                                      : "mt-1 text-sm text-amber-300/80"
                                  }
                                >
                                  {completed
                                    ? documentItem.fileName ||
                                      copy.documentUploaded
                                    : documentItem.required ===
                                        false
                                      ? copy.optionalNotUploaded
                                      : copy.requiredNotUploaded}
                                </p>
                              </div>
                            </div>
                          );
                        },
                      )
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
                      {copy.noDocumentList}
                    </div>
                  )}
                </div>

                <Link
                  href={`/processes/${primaryProcess.id}`}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-indigo-300 transition hover:text-indigo-200"
                >
                  {copy.processDetails}
                  <span aria-hidden="true">
                    →
                  </span>
                </Link>
              </>
            ) : (
              <div className="flex min-h-80 flex-col items-center justify-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-2xl text-indigo-300">
                  +
                </div>

                <h2 className="mt-5 text-2xl font-bold">
                  {copy.noProcess}
                </h2>

                <p className="mt-3 max-w-lg text-sm leading-6 text-slate-400">
                  {copy.noProcessText}
                </p>

                <Link
                  href="/processes/new"
                  className="mt-6 inline-flex rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400"
                >
                  {copy.firstProcess}
                </Link>
              </div>
            )}
          </article>

          <aside className="space-y-6">
            <article className="rounded-3xl border border-indigo-400/20 bg-indigo-500/[0.08] p-6">
              <p className="text-sm font-semibold text-indigo-300">
                {copy.aiSummary}
              </p>

              <p className="mt-4 text-xl font-bold text-slate-100">
                {getReadinessLabel(readinessScore, copy)}
              </p>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                {dashboardIntelligence
                  .criticalCount > 0
                  ? fillTemplate(copy.criticalTopics, { count: dashboardIntelligence.criticalCount })
                  : dashboardData
                        .requiredMissingDocuments
                        .length > 0
                    ? fillTemplate(copy.requiredDocumentsPending, { count: dashboardData.requiredMissingDocuments.length })
                    : copy.noCriticalMissing}
              </p>

              <Link
                href={
                  primaryProcess
                    ? `/processes/${primaryProcess.id}`
                    : "/processes/new"
                }
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400"
              >
                {primaryProcess
                  ? copy.goToProcess
                  : copy.createProcess}
              </Link>
            </article>

            <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
              <p className="text-sm font-medium text-slate-500">
                {copy.upcomingDate}
              </p>

              {nearestDeadline ? (
                <>
                  <p className="mt-3 text-xl font-bold">
                    {nearestDeadline.title}
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    {nearestDeadline.daysUntil ===
                    0
                      ? copy.targetToday
                      : fillTemplate(copy.daysRemaining, { count: nearestDeadline.daysUntil })}
                  </p>

                  <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4">
                    <p className="text-sm font-medium text-amber-200">
                      {formatDeadline(
                        nearestDeadline.deadline,
                        language,
                        copy.noDeadline,
                      )}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-3 text-xl font-bold">
                    {copy.noUpcomingDate}
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {copy.noUpcomingDateText}
                  </p>
                </>
              )}
            </article>
          </aside>
        </section>
      </div>
    </main>
  );
}