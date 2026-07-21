import type {
  AiProcess,
  AiProcessDocument,
  AiRoadmapResult,
  AiRoadmapStep,
} from "./types";

function isCompleted(status?: string) {
  return status === "uploaded" || status === "approved";
}

function getEstimatedDays(document: AiProcessDocument) {
  return document.required === false ? 1 : 2;
}

export function generateRoadmap(
  processes: AiProcess[],
): AiRoadmapResult {
  const steps: AiRoadmapStep[] = [];
  let order = 1;
  let currentAssigned = false;

  for (const process of processes) {
    const documents = [...process.requiredDocuments].sort(
      (firstDocument, secondDocument) => {
        const firstCompleted = isCompleted(firstDocument.status);
        const secondCompleted = isCompleted(secondDocument.status);

        if (firstCompleted !== secondCompleted) {
          return firstCompleted ? -1 : 1;
        }

        const firstRequired = firstDocument.required !== false;
        const secondRequired = secondDocument.required !== false;

        if (firstRequired !== secondRequired) {
          return firstRequired ? -1 : 1;
        }

        return firstDocument.title.localeCompare(
          secondDocument.title,
          "tr",
        );
      },
    );

    for (const document of documents) {
      const completed = isCompleted(document.status);

      let status: AiRoadmapStep["status"] = "upcoming";

      if (completed) {
        status = "completed";
      } else if (!currentAssigned) {
        status = "current";
        currentAssigned = true;
      }

      steps.push({
        id: `${process.id}-${document.key}`,
        order,
        title: completed
          ? `${document.title} tamamlandı`
          : `${document.title} belgesini hazırla`,
        description:
          document.description ||
          (completed
            ? "Belge sisteme yüklendi ve süreç listesinde tamamlandı."
            : document.required === false
              ? "Bu belge duruma göre gerekli olabilir. Uygunluğunu kontrol et."
              : "Bu zorunlu belgeyi hazırlayıp sisteme yükle."),
        status,
        required: document.required !== false,
        estimatedDays: completed ? 0 : getEstimatedDays(document),
        processId: process.id,
        documentKey: document.key,
      });

      order += 1;
    }

    const allDocumentsCompleted = documents.every((document) =>
      isCompleted(document.status),
    );

    let finalStatus: AiRoadmapStep["status"] = "upcoming";

    if (allDocumentsCompleted) {
      finalStatus = currentAssigned ? "upcoming" : "current";
      currentAssigned = true;
    }

    steps.push({
      id: `${process.id}-final-review`,
      order,
      title: "Başvuru öncesi son kontrolü yap",
      description:
        "Belgeleri, tarihleri ve kişisel bilgileri son kez kontrol ederek başvuru adımına geç.",
      status: finalStatus,
      required: true,
      estimatedDays: allDocumentsCompleted ? 1 : 0,
      processId: process.id,
    });

    order += 1;
  }

  const completedSteps = steps.filter(
    (step) => step.status === "completed",
  ).length;

  const estimatedDaysRemaining = steps.reduce(
    (total, step) =>
      step.status === "completed"
        ? total
        : total + step.estimatedDays,
    0,
  );

  const nextStep =
    steps.find((step) => step.status === "current") ?? null;

  return {
    steps,
    completedSteps,
    totalSteps: steps.length,
    estimatedDaysRemaining,
    nextStep,
  };
}