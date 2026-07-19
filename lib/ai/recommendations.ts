import type {
  AiProcess,
  AiReadinessResult,
  AiRecommendation,
} from "./types";

function createId(parts: string[]): string {
  return parts
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function daysUntil(dateValue?: string | null): number | null {
  if (!dateValue) return null;

  const target = new Date(`${dateValue}T23:59:59`);

  if (Number.isNaN(target.getTime())) {
    return null;
  }

  const now = new Date();

  return Math.ceil(
    (target.getTime() - now.getTime()) /
      (1000 * 60 * 60 * 24),
  );
}

export function generateRecommendations(
  processes: AiProcess[],
  readiness: AiReadinessResult,
): AiRecommendation[] {
  const recommendations: AiRecommendation[] = [];

  for (const process of processes) {
    const missingDocuments =
      process.requiredDocuments.filter(
        (doc) =>
          doc.required !== false &&
          doc.status !== "uploaded" &&
          doc.status !== "approved",
      );

    for (const doc of missingDocuments) {
      recommendations.push({
        id: createId([
          process.id,
          doc.key,
          "missing",
        ]),

        title: "Eksik Belge",

        message: `"${doc.title}" belgesini yüklemen gerekiyor.`,

        severity: "warning",

        processId: process.id,

        documentKey: doc.key,
      });
    }

    const remaining = daysUntil(
      process.deadline,
    );

    if (remaining !== null) {
      if (remaining < 0) {
        recommendations.push({
          id: createId([
            process.id,
            "deadline-over",
          ]),

          title: "Süre Doldu",

          message:
            "Bu sürecin hedef tarihi geçmiş görünüyor.",

          severity: "critical",

          processId: process.id,
        });
      } else if (remaining <= 14) {
        recommendations.push({
          id: createId([
            process.id,
            "deadline-soon",
          ]),

          title: "Yaklaşan Son Tarih",

          message: `Son tarihe ${remaining} gün kaldı.`,

          severity:
            remaining <= 5
              ? "critical"
              : "warning",

          processId: process.id,
        });
      }
    }
  }

  if (
    readiness.totalItems > 0 &&
    readiness.score === 100
  ) {
    recommendations.unshift({
      id: "all-complete",

      title: "Harika!",

      message:
        "Tüm zorunlu belgeler tamamlanmış görünüyor.",

      severity: "success",
    });
  } else {
    recommendations.unshift({
      id: "readiness-score",

      title: "Hazırlık Puanı",

      message: `Genel hazırlık puanın %${readiness.score}.`,

      severity:
        readiness.score < 50
          ? "critical"
          : "info",
    });
  }

  return recommendations;
}