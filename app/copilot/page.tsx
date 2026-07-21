"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { analyzeProcesses } from "@/lib/ai";

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

function normalizeDocuments(value: unknown): RequiredDocument[] {
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
          : "Başlıksız belge",
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

export default function CopilotPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Merhaba! Süreçlerin, belgelerin ve yaklaşan tarihler hakkında bana soru sorabilirsin.",
    },
  ]);
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

        if (!mounted) return;

        const list: Process[] = snapshot.docs.map((processDocument) => {
          const data = processDocument.data();
          const requiredDocuments = normalizeDocuments(
            data.requiredDocuments,
          );
          const completed = requiredDocuments.filter(isCompleted).length;
          const total = requiredDocuments.length;

          return {
            id: processDocument.id,
            title:
              typeof data.title === "string" && data.title.trim()
                ? data.title
                : "Başlıksız Süreç",
            description:
              typeof data.description === "string" ? data.description : "",
            country:
              typeof data.country === "string"
                ? data.country
                : "Belirtilmedi",
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
        if (mounted) setError("Copilot verileri yüklenemedi.");
      } finally {
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [router]);

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
    const text = question.trim().toLocaleLowerCase("tr-TR");

    if (includesAny(text, ["eksik", "belge", "evrak", "doküman"])) {
      if (summary.missing.length === 0) {
        return processes.length === 0
          ? "Henüz bir sürecin yok. Önce yeni bir süreç oluşturmalısın."
          : "Şu anda tamamlanmayı bekleyen zorunlu bir belge görünmüyor.";
      }

      const list = summary.missing
        .slice(0, 5)
        .map(
          (item, index) =>
            `${index + 1}. ${item.documentTitle} — ${item.processTitle}`,
        )
        .join("\n");

      return `Şu anda ${summary.missing.length} zorunlu belge eksik görünüyor:\n\n${list}`;
    }

    if (
      includesAny(text, ["deadline", "tarih", "kaç gün", "ne kadar kaldı"])
    ) {
      const nearest = summary.deadlines[0];
      if (!nearest) return "Kayıtlı bir hedef tarih görünmüyor.";
      if (nearest.days < 0) {
        return `${nearest.processItem.title} hedef tarihi ${Math.abs(nearest.days)} gün geçmiş görünüyor.`;
      }
      if (nearest.days === 0) {
        return `${nearest.processItem.title} hedef tarihi bugün.`;
      }
      return `${nearest.processItem.title} hedef tarihine ${nearest.days} gün kaldı.`;
    }

    if (includesAny(text, ["puan", "hazır", "durum", "ilerleme"])) {
      return `Hazırlık puanın ${analysis.readiness.score}/100. ${analysis.readiness.completedItems} / ${analysis.readiness.totalItems} belge tamamlandı.`;
    }

    if (
      includesAny(text, ["bugün", "ne yapmalıyım", "sonraki", "öncelik"])
    ) {
      if (summary.missing[0]) {
        return `Bugünkü ilk adımın: ${summary.missing[0].documentTitle} belgesini ${summary.missing[0].processTitle} sürecine yüklemek.`;
      }
      if (summary.deadlines[0]) {
        return `${summary.deadlines[0].processItem.title} sürecini kontrol et. Hedef tarihe ${summary.deadlines[0].days} gün kaldı.`;
      }
      return processes.length > 0
        ? "Süreç bilgilerini ve yüklenen belgeleri güncel tut."
        : "İlk adım olarak yeni bir süreç oluştur.";
    }

    if (includesAny(text, ["pasaport", "geçerlilik", "süresi"])) {
      return "Pasaport geçerlilik şartı ülkeye ve başvuru türüne göre değişir. Kesin işlem yapmadan önce ilgili resmî kurumun güncel şartlarını doğrula.";
    }

    const recommendation = analysis.recommendations[0];
    if (recommendation) {
      return `${recommendation.message}\n\nBana “Eksik belgelerim neler?”, “Hazırlık puanım kaç?” veya “Bugün ne yapmalıyım?” diye sorabilirsin.`;
    }

    return "Süreç durumun, eksik belgelerin, hazırlık puanın veya yaklaşan tarihler hakkında soru sorabilirsin.";
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
          "Copilot API isteği başarısız oldu.",
      );
    }

    if (!data.answer?.trim()) {
      throw new Error(
        "Copilot geçerli bir cevap döndürmedi.",
      );
    }

    setMessages((current) => [
      ...current,
      {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.answer!.trim(),
      },
    ]);
  } catch (requestError) {
    console.error(
      "Gemini Copilot hatası:",
      requestError,
    );

    setError(
      requestError instanceof Error
        ? `${requestError.message} Yerel Copilot yanıtı kullanıldı.`
        : "Gemini bağlantısı kurulamadı. Yerel Copilot yanıtı kullanıldı.",
    );

    setMessages((current) => [
      ...current,
      {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: createReply(question),
      },
    ]);
  } finally {
    setReplying(false);
  }
}

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-sm text-slate-400">HUMANITY AI hazırlanıyor...</p>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500 text-xl font-bold">H</div>
            <div>
              <p className="font-bold">HUMANITY OS</p>
              <p className="text-xs text-slate-500">AI Copilot</p>
            </div>
          </Link>
          <Link href="/dashboard" className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800">Dashboard</Link>
        </nav>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {error ? (
          <div className="mb-6 rounded-2xl border border-rose-400/20 bg-rose-400/[0.07] px-5 py-4 text-sm text-rose-100">{error}</div>
        ) : null}

        <section className="grid min-h-[700px] overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] lg:grid-cols-[0.32fr_0.68fr]">
          <aside className="border-b border-white/10 bg-black/15 p-6 lg:border-b-0 lg:border-r">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-300">HUMANITY AI</p>
            <h1 className="mt-4 text-3xl font-bold">Kişisel Copilot</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">Süreçlerini, belgelerini ve yaklaşan tarihlerini anlayan kişisel asistanın.</p>

            <div className="mt-7 grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <p className="text-xs text-slate-500">Hazırlık puanı</p>
                <p className="mt-2 text-2xl font-bold">{analysis.readiness.score}/100</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <p className="text-xs text-slate-500">Aktif süreç</p>
                <p className="mt-2 text-2xl font-bold">{summary.active.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <p className="text-xs text-slate-500">Zorunlu eksik</p>
                <p className="mt-2 text-2xl font-bold text-amber-200">{summary.missing.length}</p>
              </div>
            </div>
          </aside>

          <div className="flex min-h-[700px] flex-col">
            <div className="border-b border-white/10 px-6 py-5">
              <p className="font-semibold">Humanity Copilot</p>
              <p className="mt-1 text-xs text-emerald-300">● Süreç verilerinle hazır</p>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-6 sm:px-7">
              {messages.map((message) => (
                <div key={message.id} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div className={message.role === "user" ? "max-w-[85%] rounded-3xl rounded-br-md bg-indigo-500 px-5 py-4" : "max-w-[88%] rounded-3xl rounded-bl-md border border-white/10 bg-white/[0.045] px-5 py-4 text-slate-200"}>
                    <p className="whitespace-pre-line text-sm leading-7">{message.content}</p>
                  </div>
                </div>
              ))}
              {replying ? <p className="text-sm text-slate-500">Copilot düşünüyor...</p> : null}
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
                  placeholder="Sürecin hakkında bir şey sor..."
                  className="min-h-12 flex-1 resize-none bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600"
                />
                <button type="submit" disabled={!input.trim() || replying} className="self-end rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50">Gönder</button>
              </div>
              <p className="mt-3 text-center text-xs text-slate-600">Copilot yönlendirici bilgi sunar. Resmî şartları ilgili kurumdan doğrula.</p>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}