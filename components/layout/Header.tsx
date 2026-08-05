import Image from "next/image";
import Link from "next/link";

type HeaderProps = {
  homeLabel: string;
  loginLabel: string;
  signupLabel: string;
};

export default function Header({
  homeLabel,
  loginLabel,
  signupLabel,
}: HeaderProps) {
  return (
    <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
      <Link
        href="/"
        aria-label={homeLabel}
        className="flex items-center"
      >
        <Image
          src="/logo.png"
          alt="ALQEV"
          width={160}
          height={90}
          priority
          className="h-[72px] w-auto object-contain"
        />
      </Link>

      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-semibold transition hover:bg-slate-800"
        >
          {loginLabel}
        </Link>

        <Link
          href="/signup"
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          {signupLabel}
        </Link>
      </div>
    </nav>
  );
}