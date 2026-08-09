"use client";

import Link from "next/link";
import {
  supportedLanguages,
  type SupportedLanguage,
} from "../landing/Hero";

type HeaderProps = {
  homeLabel: string;
  loginLabel: string;
  signupLabel: string;
  language: SupportedLanguage;
  onLanguageChange: (language: SupportedLanguage) => void;
};

function AlqevLogo() {
  return (
    <svg
      viewBox="0 0 520 245"
      role="img"
      aria-label="ALQEV"
      className="h-auto w-[150px] sm:w-[175px]"
    >
      <defs>
        <linearGradient id="headerAlqevPurple" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
      </defs>

      <path d="M260 14 L325 124 H291 L260 70 L229 124 H195 Z" fill="white" />
      <path d="M260 62 L287 108 H233 Z" fill="url(#headerAlqevPurple)" />

      <g
        fill="none"
        stroke="white"
        strokeWidth="9"
        strokeLinecap="square"
        strokeLinejoin="miter"
      >
        <path d="M37 216 L75 148 L113 216" />
        <path d="M137 148 V216 H184" />
        <path d="M317 148 H374 M317 148 V216 M317 182 H365 M317 216 H374" />
        <path d="M401 148 L438 216 L476 148" />
      </g>

      <circle
        cx="254"
        cy="182"
        r="35"
        fill="none"
        stroke="url(#headerAlqevPurple)"
        strokeWidth="11"
      />
      <path
        d="M275 203 L299 224"
        stroke="url(#headerAlqevPurple)"
        strokeWidth="11"
        strokeLinecap="square"
      />
    </svg>
  );
}

export default function Header({
  homeLabel,
  loginLabel,
  signupLabel,
  language,
  onLanguageChange,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#030309]/90 backdrop-blur-2xl">
      <nav className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            aria-label={homeLabel}
            className="inline-flex shrink-0 items-center"
          >
            <AlqevLogo />
          </Link>

          <div className="flex items-center gap-2 lg:hidden">
            <Link
              href="/login"
              className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:border-violet-400/30 hover:bg-violet-400/[0.05]"
            >
              {loginLabel}
            </Link>

            <Link
              href="/signup"
              className="rounded-xl bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 px-3 py-2 text-xs font-bold text-white shadow-[0_10px_28px_rgba(139,92,246,0.20)] transition hover:brightness-110"
            >
              {signupLabel}
            </Link>
          </div>
        </div>

        <div className="order-3 flex min-w-0 flex-wrap items-center gap-2 lg:order-none lg:flex-nowrap">
          <span className="hidden text-xs font-medium text-zinc-500 sm:inline">
            Sprache:
          </span>

          {supportedLanguages.map((item) => {
            const isActive = language === item.code;

            return (
              <button
                key={item.code}
                type="button"
                onClick={() => onLanguageChange(item.code)}
                aria-pressed={isActive}
                title={item.label}
                className={[
                  "min-w-[42px] rounded-xl border px-3 py-2 text-xs font-semibold transition sm:text-sm",
                  isActive
                    ? "border-violet-400/35 bg-violet-500/15 text-violet-100 shadow-[0_0_24px_rgba(139,92,246,0.18)]"
                    : "border-white/[0.08] bg-white/[0.02] text-zinc-400 hover:border-violet-400/25 hover:bg-violet-400/[0.05] hover:text-white",
                ].join(" ")}
              >
                {item.shortLabel}
              </button>
            );
          })}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/login"
            className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-5 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-violet-400/30 hover:bg-violet-400/[0.05]"
          >
            {loginLabel}
          </Link>

          <Link
            href="/signup"
            className="rounded-xl bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_28px_rgba(139,92,246,0.20)] transition hover:brightness-110"
          >
            {signupLabel}
          </Link>
        </div>
      </nav>
    </header>
  );
}