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
      ? Math.round(
          (completedCount / totalCount) * 100,
        )
      : 0;

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl"
      />

      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-7">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-300/50 to-transparent" />

        <div className="mb-7 flex items-start justify-between gap-5">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full bg-emerald-400"
              />

              {copy.activeProcess}
            </div>

            <h2 className="max-w-md text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
              {copy.title}
            </h2>
          </div>

          <div className="shrink-0 rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.08] px-4 py-3 text-center">
            <p className="text-2xl font-black text-emerald-300">
              {progress}%
            </p>

            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-emerald-300/60">
              Progress
            </p>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
            <span>
              {completedCount}/{totalCount}
            </span>

            <span>{progress}%</span>
          </div>

          <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-cyan-400 transition-all duration-700"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>

        <div className="mt-8 space-y-3">
          {copy.documents.map(
            ([label, completed], index) => (
              <div
                key={label}
                className={[
                  "group flex items-center gap-4 rounded-2xl border p-4 transition duration-200",
                  completed
                    ? "border-emerald-400/10 bg-emerald-400/[0.035]"
                    : "border-white/[0.07] bg-slate-950/50 hover:border-indigo-300/20 hover:bg-white/[0.04]",
                ].join(" ")}
              >
                <div
                  className={[
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-sm font-bold",
                    completed
                      ? "border-emerald-400/15 bg-emerald-400/10 text-emerald-300"
                      : "border-white/10 bg-white/[0.04] text-slate-500",
                  ].join(" ")}
                >
                  {completed ? "✓" : index + 1}
                </div>

                <span
                  className={
                    completed
                      ? "text-slate-500 line-through"
                      : "font-medium text-slate-200"
                  }
                >
                  {label}
                </span>

                {!completed ? (
                  <span className="ml-auto text-xs font-semibold uppercase tracking-[0.12em] text-indigo-300/60">
                    Next
                  </span>
                ) : null}
              </div>
            ),
          )}
        </div>

        <div className="mt-7 overflow-hidden rounded-2xl border border-indigo-300/15 bg-gradient-to-br from-indigo-500/[0.12] via-indigo-500/[0.06] to-cyan-400/[0.05] p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-300/20 bg-indigo-400/10 text-sm font-black text-indigo-200">
              AL
            </div>

            <div>
              <p className="text-sm font-semibold text-indigo-200">
                {copy.aiTitle}
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
                {copy.aiText}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}