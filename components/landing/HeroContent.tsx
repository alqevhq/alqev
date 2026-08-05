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
    <div>
      <div className="mb-6 inline-flex rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-2 text-sm text-indigo-300">
        {copy.badge}
      </div>

      <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight md:text-7xl">
        {copy.headline}
        <span className="block text-indigo-400">
          {copy.headlineHighlight}
        </span>
      </h1>

      <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
        {copy.description}
      </p>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row">
        <Link href="/signup">
          <Button>{copy.primaryAction}</Button>
        </Link>

        <a
          href="#how-it-works"
          className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-7 py-4 font-semibold transition hover:bg-slate-800"
        >
          {copy.secondaryAction}
        </a>
      </div>

      <div
        className="mt-5 flex flex-wrap gap-x-2 gap-y-1 text-sm text-slate-500"
        aria-label="Language selection"
      >
        {supportedLanguages.map((item, index) => (
          <span key={item.code} className="inline-flex items-center">
            {index > 0 ? (
              <span className="mr-2" aria-hidden="true">
                ·
              </span>
            ) : null}

            <button
              type="button"
              onClick={() => onLanguageChange(item.code)}
              aria-pressed={language === item.code}
              className={`transition hover:text-slate-300 ${
                language === item.code
                  ? "font-semibold text-indigo-300"
                  : ""
              }`}
            >
              {item.label}
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}