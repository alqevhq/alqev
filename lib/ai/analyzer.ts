import { calculateReadiness } from "./readiness";
import { generateRecommendations } from "./recommendations";
import { generateRoadmap } from "./roadmap";

import type {
  AiProcess,
  AiReadinessResult,
  AiRecommendation,
  AiRoadmapResult,
} from "./types";

export interface AiAnalysisResult {
  readiness: AiReadinessResult;
  recommendations: AiRecommendation[];
  roadmap: AiRoadmapResult;
}

export function analyzeProcesses(
  processes: AiProcess[],
): AiAnalysisResult {
  const readiness = calculateReadiness(processes);

  const recommendations = generateRecommendations(
    processes,
    readiness,
  );

  const roadmap = generateRoadmap(processes);

  return {
    readiness,
    recommendations,
    roadmap,
  };
}