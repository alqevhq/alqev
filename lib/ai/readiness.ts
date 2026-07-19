import type {
  AiProcess,
  AiReadinessItem,
  AiReadinessResult,
} from "./types";

function isDocumentCompleted(status?: string): boolean {
  return status === "uploaded" || status === "approved";
}

export function calculateReadiness(
  processes: AiProcess[],
): AiReadinessResult {
  const items: AiReadinessItem[] = [];

  for (const process of processes) {
    for (const document of process.requiredDocuments) {
      const required = document.required !== false;
      const weight = required ? 2 : 1;

      items.push({
        key: `${process.id}:${document.key}`,
        label: `${process.title} • ${document.title}`,

        completed: isDocumentCompleted(document.status),

        required,
        weight,

        processId: process.id,
        documentKey: document.key,
      });
    }
  }

  const totalWeight = items.reduce(
    (sum, item) => sum + item.weight,
    0,
  );

  const completedWeight = items.reduce(
    (sum, item) =>
      sum + (item.completed ? item.weight : 0),
    0,
  );

  const score =
    totalWeight === 0
      ? 0
      : Math.round((completedWeight / totalWeight) * 100);

  return {
    score,

    completedWeight,
    totalWeight,

    completedItems: items.filter(
      (item) => item.completed,
    ).length,

    totalItems: items.length,

    items,
  };
}