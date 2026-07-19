import { calculateReadiness } from "./readiness";
import { generateRecommendations } from "./recommendations";

import type {
  AiProcess,
  AiReadinessResult,
  AiRecommendation,
} from "./types";

export interface AiAnalysisResult {
  readiness: AiReadinessResult;
  recommendations: AiRecommendation[];
}

export function analyzeProcesses(
  processes: AiProcess[],
): AiAnalysisResult {
  const readiness = calculateReadiness(processes);

  const recommendations = generateRecommendations(
    processes,
    readiness,
  );

  return {
    readiness,
    recommendations,
  };
}