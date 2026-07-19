"use client";

import { useMemo } from "react";
import { analyzeProcesses } from "@/lib/ai";
import type { AiProcess, AiRecommendation, AiSeverity } from "@/lib/ai";

type ProcessAiPanelProps = {
  process: AiProcess;
};

const severityStyles: Record<AiSeverity, string> = {
  success: "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-100",
  info: "border-blue-400/20 bg-blue-400/[0.07] text-blue-100",
  warning: "border-amber-400/20 bg-amber-400/[0.07] text-amber-100",
  critical: "border-red-400/20 bg-red-400/[0.07] text-red-100",
};

const severityIcons: Record<AiSeverity, string> = {
  success: "✓",
  info: "i",
  warning: "!",
  critical: "!",
};

function isCompleted(status?: string) {
  return status === "uploaded" || status === "approved";
}

function getDaysUntil(deadline?: string | null) {
  if (!deadline) return null;

  const target = new Date(`${deadline}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function getReadinessLabel(score: number) {
  if (score >= 90) return "Başvuruya çok yakın";
  if (score >= 70) return "İyi ilerliyor";
  if (score >= 40) return "Hazırlık devam ediyor";
  return "Kritik belgeler eksik";
}

function getEstimatedPreparationText(process: AiProcess) {
  const missingRequired = process.requiredDocuments.filter(
    (item) => item.required !== false && !isCompleted(item.status),
  ).length;
  const missingOptional = process.requiredDocuments.filter(
    (item) => item.required === false && !isCompleted(item.status),
  ).length;

  if (missingRequired === 0 && missingOptional === 0) {
    return "Belge listesi tamamlandı";
  }

  const estimatedDays = Math.max(1, missingRequired * 2 + missingOptional);
  return `Yaklaşık ${estimatedDays} gün`;
}

function RecommendationCard({ item }: { item: AiRecommendation }) {
  return (
    <article className={`rounded-2xl border p-4 ${severityStyles[item.severity]}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-current/20 bg-black/10 text-sm font-bold">
          {severityIcons[item.severity]}
        </span>
        <div className="min-w-0">
          <h3 className="font-semibold">{item.title}</h3>
          <p className="mt-1 text-sm leading-6 opacity-75">{item.message}</p>
        </div>
      </div>
    </article>
  );
}

export default function ProcessAiPanel({ process }: ProcessAiPanelProps) {
  const analysis = useMemo(() => analyzeProcesses([process]), [process]);

  const nextRecommendation =
    analysis.recommendations.find((item) => item.severity === "critical") ??
    analysis.recommendations.find((item) => item.severity === "warning") ??
    analysis.recommendations[0] ??
    null;

  const visibleRecommendations = analysis.recommendations
    .filter((item) => item.id !== nextRecommendation?.id)
    .slice(0, 3);

  const daysUntilDeadline = getDaysUntil(process.deadline);
  const deadlineRisk =
    daysUntilDeadline !== null && daysUntilDeadline < 0
      ? "Hedef tarih geçti"
      : daysUntilDeadline === 0
        ? "Hedef tarih bugün"
        : daysUntilDeadline !== null && daysUntilDeadline <= 7
          ? `${daysUntilDeadline} gün kaldı`
          : null;

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/[0.12] via-white/[0.035] to-cyan-500/[0.06] shadow-2xl backdrop-blur-xl">
      <div className="grid lg:grid-cols-[0.8fr_1.2fr]">
        <div className="border-b border-white/10 p-6 sm:p-8 lg:border-b-0 lg:border-r">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">
            HUMANITY AI
          </p>

          <div className="mt-5 flex items-end justify-between gap-5">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">Hazırlık analizi</h2>
              <p className="mt-2 text-sm text-slate-400">
                {getReadinessLabel(analysis.readiness.score)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-5 py-4 text-right">
              <span className="text-4xl font-bold text-white">
                {analysis.readiness.score}
              </span>
              <span className="ml-1 text-slate-500">/100</span>
            </div>
          </div>

          <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-500"
              style={{ width: `${analysis.readiness.score}%` }}
            />
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-400">
            {analysis.readiness.completedItems} / {analysis.readiness.totalItems}{" "}
            belge tamamlandı. Zorunlu belgeler puanı daha fazla etkiler.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Tahmini hazır olma
              </p>
              <p className="mt-2 font-semibold text-slate-100">
                {getEstimatedPreparationText(process)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Tarih riski
              </p>
              <p
                className={`mt-2 font-semibold ${
                  deadlineRisk ? "text-amber-200" : "text-emerald-200"
                }`}
              >
                {deadlineRisk || "Kritik tarih riski yok"}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
            Sonraki en iyi adım
          </p>

          <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.07] p-5">
            {nextRecommendation ? (
              <>
                <h3 className="text-lg font-semibold text-cyan-50">
                  {nextRecommendation.title}
                </h3>
                <p className="mt-2 leading-7 text-cyan-100/75">
                  {nextRecommendation.message}
                </p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-emerald-100">
                  Belge listen hazır
                </h3>
                <p className="mt-2 leading-7 text-emerald-100/70">
                  Eksik belge görünmüyor. Bilgileri son kez kontrol ederek başvuru
                  adımına geçebilirsin.
                </p>
              </>
            )}
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-semibold text-slate-100">AI önerileri</h3>
              <span className="text-xs text-slate-500">
                {analysis.recommendations.length} öneri
              </span>
            </div>

            {visibleRecommendations.length > 0 ? (
              <div className="mt-4 grid gap-3">
                {visibleRecommendations.map((item) => (
                  <RecommendationCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.07] p-4 text-sm leading-6 text-emerald-100/80">
                Şu anda ek bir risk veya eksik adım tespit edilmedi.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}