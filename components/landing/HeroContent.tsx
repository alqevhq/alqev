"use client";

import Link from "next/link";

type HeroCopy = {
  badge: string;
  headline: string;
  headlineHighlight: string;
  description: string;
  primaryAction: string;
  secondaryAction: string;
};

type HeroContentProps = {
  copy: HeroCopy;
};

export default function HeroContent({
  copy,
}: HeroContentProps) {
  return (
    <div className="relative min-w-0">
      <div className="pointer-events-none absolute -left-20 top-4 h-64 w-64 rounded-full bg-violet-600/[0.08] blur-[90px]" />

      <div className="relative">
        <div className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/[0.08] px-4 py-2 text-sm font-medium text-violet-200 backdrop-blur-xl">
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.85)]"
          />
          <span className="min-w-0 break-words">
            {copy.badge}
          </span>
        </div>

        <h1 className="max-w-3xl break-words text-[2.65rem] font-black leading-[1.02] tracking-[-0.04em] text-white sm:text-5xl md:text-6xl xl:text-[4rem]">
          {copy.headline}

          <span className="mt-2 block bg-gradient-to-r from-violet-300 via-purple-300 to-fuchsia-300 bg-clip-text text-transparent">
            {copy.headlineHighlight}
          </span>
        </h1>

        <p className="mt-6 max-w-2xl break-words text-base leading-7 text-zinc-300 sm:text-lg sm:leading-8">
          {copy.description}
        </p>

        <div className="mt-8 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/signup"
            className="inline-flex min-h-14 w-full items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 px-7 py-4 text-sm font-bold text-white shadow-[0_14px_38px_rgba(139,92,246,0.25)] transition hover:-translate-y-0.5 hover:brightness-110 sm:w-auto sm:text-base"
          >
            {copy.primaryAction}
            <span className="ms-2" aria-hidden="true">→</span>
          </Link>

          <a
            href="#how-it-works"
            className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-7 py-4 text-sm font-semibold text-zinc-200 transition hover:-translate-y-0.5 hover:border-violet-300/30 hover:bg-violet-400/[0.05] hover:text-white sm:w-auto sm:text-base"
          >
            {copy.secondaryAction}
            <span aria-hidden="true">↓</span>
          </a>
        </div>
      </div>
    </div>
  );
}