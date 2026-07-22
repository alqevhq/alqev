import type {
  AiChatMessage,
  AiProcess,
  AiReadinessResult,
  AiRecommendation,
} from "./types";

export interface AiChatContext {
  processes: AiProcess[];

  readiness: AiReadinessResult;

  recommendations: AiRecommendation[];
}

export interface AiChatProvider {
  reply(input: {
    messages: AiChatMessage[];

    context: AiChatContext;

    systemPrompt: string;
  }): Promise<string>;
}

export function buildChatSystemPrompt(
  context: AiChatContext,
): string {
  const processSummary = context.processes
    .map((process) => {
      const missingDocuments =
        process.requiredDocuments
          .filter(
            (doc) =>
              doc.required !== false &&
              doc.status !== "uploaded" &&
              doc.status !== "approved",
          )
          .map((doc) => doc.title);

      return [
        `Süreç: ${process.title}`,
        `Ülke: ${process.country ?? "Belirtilmedi"}`,
        `Durum: ${process.status ?? "Belirtilmedi"}`,
        `İlerleme: %${process.progress ?? 0}`,
        `Eksik Belgeler: ${
          missingDocuments.join(", ") || "Yok"
        }`,
        `Son Tarih: ${
          process.deadline ?? "Belirtilmedi"
        }`,
      ].join("\n");
    })
    .join("\n\n");

  return `
Sen ALQEV uygulamasının kişisel göç danışmanı AI'sın.

Kurallar:

- Kullanıcının süreçlerini dikkate al.
- Belgeleri dikkate al.
- Hazırlık puanını dikkate al.
- Eksik belgeleri dikkate al.
- Net cevap ver.
- Emin olmadığın hukuki konularda kesin konuşma.
- Gerekirse resmi kurumları kontrol etmesini öner.

Hazırlık Puanı:

${context.readiness.score}

Süreçler:

${processSummary}
`.trim();
}

export async function askAiChat(
  provider: AiChatProvider,
  messages: AiChatMessage[],
  context: AiChatContext,
): Promise<string> {
  return provider.reply({
    messages,

    context,

    systemPrompt:
      buildChatSystemPrompt(context),
  });
}

export function createLocalFallbackReply(
  context: AiChatContext,
): string {
  const critical =
    context.recommendations.find(
      (r) => r.severity === "critical",
    );

  if (critical) {
    return critical.message;
  }

  const warning =
    context.recommendations.find(
      (r) => r.severity === "warning",
    );

  if (warning) {
    return warning.message;
  }

  return `Genel hazırlık puanın %${context.readiness.score}. Şu anda kritik bir eksik görünmüyor.`;
}