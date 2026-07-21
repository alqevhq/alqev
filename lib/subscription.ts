export type SubscriptionPlan = "free" | "premium";

export type PlanLimits = {
  maxProcesses: number;
  maxDocuments: number;
  maxCopilotMessagesPerDay: number;
  maxOCRPerMonth: number;
  maxAIAnalyses: number;
};

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
    maxProcesses: 1,
    maxDocuments: 5,
    maxCopilotMessagesPerDay: 20,
    maxOCRPerMonth: 10,
    maxAIAnalyses: 1,
  },

  premium: {
    maxProcesses: Number.POSITIVE_INFINITY,
    maxDocuments: Number.POSITIVE_INFINITY,
    maxCopilotMessagesPerDay: Number.POSITIVE_INFINITY,
    maxOCRPerMonth: Number.POSITIVE_INFINITY,
    maxAIAnalyses: Number.POSITIVE_INFINITY,
  },
};

export function normalizeSubscriptionPlan(
  value: unknown,
): SubscriptionPlan {
  return value === "premium" ? "premium" : "free";
}

export function getPlanLimits(
  plan: SubscriptionPlan,
): PlanLimits {
  return PLAN_LIMITS[plan];
}

export function hasReachedLimit(
  currentUsage: number,
  limit: number,
): boolean {
  if (!Number.isFinite(limit)) {
    return false;
  }

  return currentUsage >= limit;
}

export function getRemainingUsage(
  currentUsage: number,
  limit: number,
): number {
  if (!Number.isFinite(limit)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(limit - currentUsage, 0);
}