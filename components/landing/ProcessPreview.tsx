"use client";

type ProcessPreviewCopy = {
  activeProcess: string;
  title: string;
  documents: [string, boolean][];
  aiTitle: string;
  aiText: string;
};

type ProcessPreviewProps = {
  copy: ProcessPreviewCopy;
};

export default function ProcessPreview({
  copy,
}: ProcessPreviewProps) {
  const completedCount = copy.documents.filter(
    ([, completed]) => completed,
  ).length;

  const totalCount = copy.documents.length;

  const progress =
    totalCount > 0
      ? Math.round((completedCount / totalCount) * 100)
      : 0;

  return (
    <div className="relative min-w-0">
      <div className="pointer-events-none absolute -inset-8 rounded-[3rem] bg-violet-600/[0.07] blur-[80px]" />

      <div className="relative min-w-0 overflow-hidden rounded-[2rem] border border-violet-300/15 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.13),transparent_46%),linear-gradient(145deg,rgba(17,17,29,0.96),rgba(7,7,14,0.98))] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.36)] backdrop-blur-2xl sm:p-7">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-300/60 to-transparent" />

        <div className="mb-7 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
          <div className="min-w-0">
            <div className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.55)]"
              />
              <span className="min-w-0 break-words">
                {copy.activeProcess}
              </span>
            </div>

            <h2 className="max-w-md break-words text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
              {copy.title}
            </h2>
          </div>

          <div className="w-fit shrink-0 rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.07] px-4 py-3 text-center">
            <p className="text-2xl font-black text-emerald-300">
              {progress}%
            </p>

            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-emerald-300/60">
              Progress
            </p>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-4 text-xs text-zinc-500">
            <span>{completedCount}/{totalCount}</span>
            <span>{progress}%</span>
          </div>

          <div className="h-2.5 overflow-hidden rounded-full bg-[#151522]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mt-7 space-y-3">
          {copy.documents.map(([label, completed], index) => (
            <div
              key={label}
              className={[
                "group flex min-w-0 items-center gap-3 rounded-2xl border p-4 transition sm:gap-4",
                completed
                  ? "border-emerald-400/10 bg-emerald-400/[0.03]"
                  : "border-white/[0.07] bg-[#070810]/70 hover:border-violet-300/20 hover:bg-violet-400/[0.035]",
              ].join(" ")}
            >
              <div
                className={[
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-sm font-bold",
                  completed
                    ? "border-emerald-400/15 bg-emerald-400/10 text-emerald-300"
                    : "border-white/[0.08] bg-white/[0.03] text-zinc-500",
                ].join(" ")}
              >
                {completed ? "✓" : index + 1}
              </div>

              <span
                className={
                  completed
                    ? "min-w-0 flex-1 break-words text-zinc-500 line-through"
                    : "min-w-0 flex-1 break-words font-medium text-zinc-200"
                }
              >
                {label}
              </span>

              {!completed ? (
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-300/70 sm:text-xs">
                  Next
                </span>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-7 overflow-hidden rounded-2xl border border-violet-300/15 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.18),transparent_55%),linear-gradient(145deg,rgba(21,16,39,0.90),rgba(10,8,20,0.94))] p-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-300/20 bg-violet-400/10 text-sm font-black text-violet-200">
              AL
            </div>

            <div className="min-w-0">
              <p className="break-words text-sm font-semibold text-violet-200">
                {copy.aiTitle}
              </p>

              <p className="mt-2 break-words text-sm leading-6 text-zinc-300 sm:text-base sm:leading-7">
                {copy.aiText}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}