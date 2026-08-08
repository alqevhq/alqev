import Link from "next/link";
import Button from "../ui/Button";
import {
  supportedLanguages,
  type SupportedLanguage,
} from "./Hero";

type HeroCopy = {
  badge: string;
  headline: string;
  headlineHighlight: string;
  description: string;
  primaryAction: string;
  secondaryAction: string;
};

type HeroContentProps = {
  language: SupportedLanguage;
  copy: HeroCopy;
  onLanguageChange: (language: SupportedLanguage) => void;
};

export default function HeroContent({
  language,
  copy,
  onLanguageChange,
}: HeroContentProps) {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl"
      />

      <div className="relative">
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-indigo-300/20 bg-indigo-400/[0.08] px-4 py-2 text-sm font-medium text-indigo-200 shadow-lg shadow-indigo-950/20 backdrop-blur">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.85)]"
          />

          {copy.badge}
        </div>

        <h1 className="max-w-4xl text-5xl font-black leading-[1.02] tracking-[-0.045em] text-white sm:text-6xl md:text-7xl">
          {copy.headline}

          <span className="mt-2 block bg-gradient-to-r from-indigo-300 via-indigo-400 to-cyan-300 bg-clip-text text-transparent">
            {copy.headlineHighlight}
          </span>
        </h1>

        <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl sm:leading-9">
          {copy.description}
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Link href="/signup" className="sm:w-auto">
            <Button>{copy.primaryAction}</Button>
          </Link>

          <a
            href="#how-it-works"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-7 py-4 font-semibold text-slate-200 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-indigo-300/30 hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            {copy.secondaryAction}

            <span aria-hidden="true">↓</span>
          </a>
        </div>

        <div className="mt-9 border-t border-white/10 pt-5">
          <div
            className="flex flex-wrap gap-2"
            aria-label="Language selection"
          >
            {supportedLanguages.map((item) => {
              const isActive =
                language === item.code;

              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() =>
                    onLanguageChange(item.code)
                  }
                  aria-pressed={isActive}
                  className={[
                    "rounded-full border px-3.5 py-1.5 text-sm font-medium transition duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
                    isActive
                      ? "border-indigo-300/30 bg-indigo-400/10 text-indigo-200 shadow-sm shadow-indigo-950/20"
                      : "border-white/[0.07] bg-white/[0.025] text-slate-500 hover:border-white/15 hover:bg-white/[0.05] hover:text-slate-300",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}