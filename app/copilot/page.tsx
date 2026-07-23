"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { analyzeProcesses } from "@/lib/ai";
import {
  getTranslations,
  isRtlLanguage,
  readStoredLanguage,
  type Language,
} from "@/lib/i18n";

type RequiredDocument = {
  key: string;
  title: string;
  required?: boolean;
  status?: string;
};

type Process = {
  id: string;
  title: string;
  description: string;
  country: string;
  status: string;
  progress: number;
  completedDocumentCount: number;
  totalDocumentCount: number;
  deadline: string | null;
  requiredDocuments: RequiredDocument[];
};

type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

const MAX_STORED_MESSAGES = 40;

function normalizeDocuments(
  value: unknown,
  unnamedDocument: string,
): RequiredDocument[] {
  if (!Array.isArray(value)) return [];

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
        typeof item.title === "string" && item.title.trim()
          ? item.title
          : unnamedDocument,
      required:
        typeof item.required === "boolean" ? item.required : undefined,
      status:
        typeof item.status === "string" ? item.status : "missing",
    }));
}

function isCompleted(documentItem: RequiredDocument): boolean {
  return (
    documentItem.status === "uploaded" ||
    documentItem.status === "approved"
  );
}

function daysUntil(value: string | null): number | null {
  if (!value) return null;

  const deadline = new Date(`${value}T00:00:00`);
  if (Number.isNaN(deadline.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);

  return Math.ceil((deadline.getTime() - today.getTime()) / 86_400_000);
}

function includesAny(value: string, words: string[]): boolean {
  return words.some((word) => value.includes(word));
}

function formatText(
  template: string,
  values: Record<string, string | number>,
): string {
  return Object.entries(values).reduce(
    (result, [key, value]) =>
      result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}


function normalizeStoredMessages(
  documents: Array<{
    id: string;
    data: () => Record<string, unknown>;
  }>,
): Message[] {
  return documents
    .map((documentItem) => {
      const data = documentItem.data();
      const role =
        data.role === "user" || data.role === "assistant"
          ? data.role
          : null;
      const content =
        typeof data.content === "string"
          ? data.content.trim().slice(0, 4000)
          : "";

      if (!role || !content) {
        return null;
      }

      return {
        id: documentItem.id,
        role,
        content,
      } satisfies Message;
    })
    .filter((item): item is Message => item !== null);
}

async function saveCopilotMessage(
  userId: string,
  message: Pick<Message, "role" | "content">,
  language: Language,
): Promise<void> {
  const content = message.content.trim().slice(0, 4000);

  if (!content) {
    return;
  }

  await addDoc(
    collection(
      db,
      "users",
      userId,
      "copilotMessages",
    ),
    {
      role: message.role,
      content,
      language,
      createdAt: serverTimestamp(),
    },
  );
}

export default function CopilotPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [language] = useState<Language>(() => readStoredLanguage("tr"));
  const copy = getTranslations(language).copilot;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [replying, setReplying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.replace("/login");
        return;
      }

      if (!mounted) return;
      setUser(currentUser);

      try {
        const reference = collection(
          db,
          "users",
          currentUser.uid,
          "processes",
        );

        const snapshot = await getDocs(
          query(reference, orderBy("createdAt", "desc")),
        ).catch(() => getDocs(reference));

        const messagesReference = collection(
          db,
          "users",
          currentUser.uid,
          "copilotMessages",
        );

        const messagesSnapshot = await getDocs(
          query(
            messagesReference,
            orderBy("createdAt", "desc"),
            limit(MAX_STORED_MESSAGES),
          ),
        ).catch(() => getDocs(messagesReference));

        if (!mounted) return;

        const storedMessages = normalizeStoredMessages(
          [...messagesSnapshot.docs].reverse(),
        );

        setMessages(
          storedMessages.length > 0
            ? storedMessages
            : [
                {
                  id: "welcome",
                  role: "assistant",
                  content: copy.welcomeMessage,
                },
              ],
        );

        const list: Process[] = snapshot.docs.map((processDocument) => {
          const data = processDocument.data();
          const requiredDocuments = normalizeDocuments(
            data.requiredDocuments,
            copy.unnamedDocument,
          );
          const completed = requiredDocuments.filter(isCompleted).length;
          const total = requiredDocuments.length;

          return {
            id: processDocument.id,
            title:
              typeof data.title === "string" && data.title.trim()
                ? data.title
                : copy.unnamedProcess,
            description:
              typeof data.description === "string" ? data.description : "",
            country:
              typeof data.country === "string"
                ? data.country
                : copy.unspecified,
            status:
              typeof data.status === "string" ? data.status : "active",
            progress:
              typeof data.progress === "number"
                ? Math.min(100, Math.max(0, Math.round(data.progress)))
                : total > 0
                  ? Math.round((completed / total) * 100)
                  : 0,
            completedDocumentCount:
              typeof data.completedDocumentCount === "number"
                ? data.completedDocumentCount
                : completed,
            totalDocumentCount:
              typeof data.totalDocumentCount === "number"
                ? data.totalDocumentCount
                : total,
            deadline:
              typeof data.deadline === "string" ? data.deadline : null,
            requiredDocuments,
          };
        });

        setProcesses(list);
      } catch (loadError) {
        console.error("Copilot verileri yüklenemedi:", loadError);
        if (mounted) setError(copy.dataLoadError);
      } finally {
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [router, language]);

  const analysis = useMemo(() => analyzeProcesses(processes), [processes]);

  const summary = useMemo(() => {
    const active = processes.filter((item) => item.status === "active");
    const missing = processes.flatMap((processItem) =>
      processItem.requiredDocuments
        .filter(
          (documentItem) =>
            documentItem.required !== false && !isCompleted(documentItem),
        )
        .map((documentItem) => ({
          processTitle: processItem.title,
          documentTitle: documentItem.title,
        })),
    );
    const deadlines = processes
      .map((processItem) => ({
        processItem,
        days: daysUntil(processItem.deadline),
      }))
      .filter(
        (item): item is { processItem: Process; days: number } =>
          item.days !== null,
      )
      .sort((first, second) => first.days - second.days);

    return { active, missing, deadlines };
  }, [processes]);

  function createReply(question: string): string {
    const text = question.trim().toLocaleLowerCase(language);

    const keywordGroups: Record<
      Language,
      {
        documents: string[];
        deadlines: string[];
        readiness: string[];
        priority: string[];
        passport: string[];
        outOfScope: string[];
      }
    > = {
      tr: {
        documents: ["eksik", "belge", "evrak", "doküman"],
        deadlines: ["deadline", "tarih", "kaç gün", "ne kadar kaldı"],
        readiness: ["hazırlık puanı", "hazırlık", "ilerleme", "kaç puan"],
        priority: ["bugün", "ne yapmalıyım", "sonraki", "öncelik"],
        passport: ["pasaport", "geçerlilik", "süresi"],
        outOfScope: [
          "hava durumu",
          "maç",
          "borsa",
          "kripto",
          "yemek tarifi",
          "film",
          "müzik",
        ],
      },
      de: {
        documents: ["fehlend", "dokument", "unterlage"],
        deadlines: ["frist", "termin", "datum", "tage"],
        readiness: ["bereitschaftswert", "bereitschaft", "fortschritt", "punktzahl"],
        priority: ["heute", "was soll ich", "nächste", "priorität"],
        passport: ["pass", "reisepass", "gültigkeit"],
        outOfScope: [
          "wetter",
          "fußball",
          "börse",
          "krypto",
          "rezept",
          "film",
          "musik",
        ],
      },
      en: {
        documents: ["missing", "document", "paper"],
        deadlines: ["deadline", "date", "days left"],
        readiness: ["readiness score", "readiness", "progress", "score"],
        priority: ["today", "what should", "next", "priority"],
        passport: ["passport", "validity", "expiry"],
        outOfScope: [
          "weather",
          "football",
          "stock market",
          "crypto",
          "recipe",
          "movie",
          "music",
        ],
      },
      ru: {
        documents: ["отсутств", "документ", "бумаг"],
        deadlines: ["срок", "дата", "дней"],
        readiness: ["оценка готовности", "готовность", "прогресс"],
        priority: ["сегодня", "что делать", "следующ", "приоритет"],
        passport: ["паспорт", "срок действия"],
        outOfScope: [
          "погода",
          "футбол",
          "биржа",
          "крипто",
          "рецепт",
          "фильм",
          "музыка",
        ],
      },
      ar: {
        documents: ["ناقص", "مستند", "وثيقة"],
        deadlines: ["موعد", "تاريخ", "أيام"],
        readiness: ["درجة الجاهزية", "الجاهزية", "التقدم"],
        priority: ["اليوم", "ماذا أفعل", "التالي", "أولوية"],
        passport: ["جواز", "صلاحية"],
        outOfScope: [
          "الطقس",
          "كرة القدم",
          "البورصة",
          "العملات الرقمية",
          "وصفة",
          "فيلم",
          "موسيقى",
        ],
      },
      fa: {
        documents: ["ناقص", "مدرک", "سند"],
        deadlines: ["مهلت", "تاریخ", "روز"],
        readiness: ["امتیاز آمادگی", "آمادگی", "پیشرفت"],
        priority: ["امروز", "چه کار", "بعدی", "اولویت"],
        passport: ["گذرنامه", "اعتبار"],
        outOfScope: [
          "هوا",
          "فوتبال",
          "بورس",
          "رمزارز",
          "دستور غذا",
          "فیلم",
          "موسیقی",
        ],
      },
    };

    const keywords = keywordGroups[language];

    if (includesAny(text, keywords.documents)) {
      if (summary.missing.length === 0) {
        return processes.length === 0
          ? copy.noProcesses
          : copy.noMissingDocuments;
      }

      const list = summary.missing
        .slice(0, 5)
        .map(
          (item, index) =>
            `${index + 1}. ${item.documentTitle} — ${item.processTitle}`,
        )
        .join("\n");

      return `${formatText(copy.missingDocumentsIntro, {
        count: summary.missing.length,
      })}\n\n${list}`;
    }

    if (includesAny(text, keywords.deadlines)) {
      const nearest = summary.deadlines[0];

      if (!nearest) {
        return copy.noDeadline;
      }

      if (nearest.days < 0) {
        return formatText(copy.deadlinePassed, {
          process: nearest.processItem.title,
          days: Math.abs(nearest.days),
        });
      }

      if (nearest.days === 0) {
        return formatText(copy.deadlineToday, {
          process: nearest.processItem.title,
        });
      }

      return formatText(copy.deadlineRemaining, {
        process: nearest.processItem.title,
        days: nearest.days,
      });
    }

    if (includesAny(text, keywords.outOfScope)) {
      const outOfScopeReplies: Record<Language, string> = {
        tr: "Bu konu ALQEV Copilot’un süreç yönetimi kapsamı dışında. Vatandaşlık, oturum, vize, belgeler, hazırlık puanı veya yaklaşan tarihler hakkında yardımcı olabilirim.",
        de: "Dieses Thema liegt außerhalb des Bereichs des ALQEV Copilot. Ich kann dir bei Staatsangehörigkeit, Aufenthalt, Visa, Dokumenten, Bereitschaft und Fristen helfen.",
        en: "This topic is outside the scope of ALQEV Copilot. I can help with citizenship, residence, visas, documents, readiness and deadlines.",
        ru: "Эта тема находится вне области ALQEV Copilot. Я могу помочь с гражданством, ВНЖ, визами, документами, готовностью и сроками.",
        ar: "هذا الموضوع خارج نطاق ALQEV Copilot. يمكنني مساعدتك في شؤون الجنسية والإقامة والتأشيرات والمستندات والجاهزية والمواعيد.",
        fa: "این موضوع خارج از حوزه ALQEV Copilot است. می‌توانم درباره تابعیت، اقامت، ویزا، مدارک، آمادگی و مهلت‌ها کمک کنم.",
      };

      return outOfScopeReplies[language];
    }

    if (includesAny(text, keywords.readiness)) {
      return formatText(copy.readinessReply, {
        score: analysis.readiness.score,
        completed: analysis.readiness.completedItems,
        total: analysis.readiness.totalItems,
      });
    }

    if (includesAny(text, keywords.priority)) {
      if (summary.missing[0]) {
        return formatText(copy.todayFirstStep, {
          document: summary.missing[0].documentTitle,
          process: summary.missing[0].processTitle,
        });
      }

      if (summary.deadlines[0]) {
        return formatText(copy.checkProcess, {
          process: summary.deadlines[0].processItem.title,
          days: summary.deadlines[0].days,
        });
      }

      return processes.length > 0
        ? copy.keepUpdated
        : copy.createFirstProcess;
    }

    if (includesAny(text, keywords.passport)) {
      return copy.passportNotice;
    }

    const recommendation = analysis.recommendations[0];

    if (recommendation) {
      return `${recommendation.message}\n\n${copy.suggestedQuestions}`;
    }

    return copy.defaultReply;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  const question = input.trim();

  if (!question || replying) return;

  const previousMessages = messages;

  const userMessage: Message = {
    id: `user-${Date.now()}`,
    role: "user",
    content: question,
  };

  setMessages((current) => [
    ...current,
    userMessage,
  ]);

  if (user) {
    void saveCopilotMessage(
      user.uid,
      {
        role: userMessage.role,
        content: userMessage.content,
      },
      language,
    ).catch((saveError) => {
      console.error(
        "Kullanıcı Copilot mesajı kaydedilemedi:",
        saveError,
      );
    });
  }

  setInput("");
  setReplying(true);
  setError("");

  try {
    const response = await fetch("/api/copilot", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question,
        processes,
        readiness: analysis.readiness,
        language,
        conversation: previousMessages.map(
          ({ role, content }) => ({
            role,
            content,
          }),
        ),
      }),
    });

    const data = (await response.json()) as {
      answer?: string;
      error?: string;
    };

    if (!response.ok) {
      throw new Error(
        data.error ||
          copy.apiRequestFailed,
      );
    }

    if (!data.answer?.trim()) {
      throw new Error(
        copy.invalidAnswer,
      );
    }

    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: data.answer.trim(),
    };

    setMessages((current) => [
      ...current,
      assistantMessage,
    ]);

    if (user) {
      void saveCopilotMessage(
        user.uid,
        {
          role: assistantMessage.role,
          content: assistantMessage.content,
        },
        language,
      ).catch((saveError) => {
        console.error(
          "Copilot cevabı kaydedilemedi:",
          saveError,
        );
      });
    }
  } catch (requestError) {
    console.error(
      "Gemini Copilot hatası:",
      requestError,
    );

    setError(
      requestError instanceof Error
        ? `${requestError.message} ${copy.localReplyUsed}`
        : copy.connectionFailed,
    );

    const fallbackMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: createReply(question),
    };

    setMessages((current) => [
      ...current,
      fallbackMessage,
    ]);

    if (user) {
      void saveCopilotMessage(
        user.uid,
        {
          role: fallbackMessage.role,
          content: fallbackMessage.content,
        },
        language,
      ).catch((saveError) => {
        console.error(
          "Yerel Copilot cevabı kaydedilemedi:",
          saveError,
        );
      });
    }
  } finally {
    setReplying(false);
  }
}

  if (loading) {
    return (
      <main dir={isRtlLanguage(language) ? "rtl" : "ltr"} className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-sm text-slate-400">{copy.loading}</p>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main dir={isRtlLanguage(language) ? "rtl" : "ltr"} className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500 text-xl font-bold">H</div>
            <div>
              <p className="font-bold">ALQEV</p>
              <p className="text-xs text-slate-500">AI Copilot</p>
            </div>
          </Link>
          <Link href="/dashboard" className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800">{copy.dashboard}</Link>
        </nav>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {error ? (
          <div className="mb-6 rounded-2xl border border-rose-400/20 bg-rose-400/[0.07] px-5 py-4 text-sm text-rose-100">{error}</div>
        ) : null}

        <section className="grid min-h-[700px] overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] lg:grid-cols-[0.32fr_0.68fr]">
          <aside className="border-b border-white/10 bg-black/15 p-6 lg:border-b-0 lg:border-r">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-300">ALQEV AI</p>
            <h1 className="mt-4 text-3xl font-bold">{copy.title}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">{copy.subtitle}</p>

            <div className="mt-7 grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <p className="text-xs text-slate-500">{copy.readinessScore}</p>
                <p className="mt-2 text-2xl font-bold">{analysis.readiness.score}/100</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <p className="text-xs text-slate-500">{copy.activeProcesses}</p>
                <p className="mt-2 text-2xl font-bold">{summary.active.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <p className="text-xs text-slate-500">{copy.missingRequired}</p>
                <p className="mt-2 text-2xl font-bold text-amber-200">{summary.missing.length}</p>
              </div>
            </div>
          </aside>

          <div className="flex min-h-[700px] flex-col">
            <div className="border-b border-white/10 px-6 py-5">
              <p className="font-semibold">ALQEV Copilot</p>
              <p className="mt-1 text-xs text-emerald-300">● {copy.readyWithProcessData}</p>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-6 sm:px-7">
              {messages.map((message) => (
                <div key={message.id} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div className={message.role === "user" ? "max-w-[85%] rounded-3xl rounded-br-md bg-indigo-500 px-5 py-4" : "max-w-[88%] rounded-3xl rounded-bl-md border border-white/10 bg-white/[0.045] px-5 py-4 text-slate-200"}>
                    <p className="whitespace-pre-line text-sm leading-7">{message.content}</p>
                  </div>
                </div>
              ))}
              {replying ? <p className="text-sm text-slate-500">{copy.thinking}</p> : null}
            </div>

            <form onSubmit={handleSubmit} className="border-t border-white/10 p-5 sm:p-6">
              <div className="flex gap-3 rounded-2xl border border-white/10 bg-black/20 p-2 focus-within:border-indigo-400/40">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  rows={1}
                  placeholder={copy.placeholder}
                  className="min-h-12 flex-1 resize-none bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600"
                />
                <button type="submit" disabled={!input.trim() || replying} className="self-end rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50">{copy.send}</button>
              </div>
              <p className="mt-3 text-center text-xs text-slate-600">{copy.disclaimer}</p>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}