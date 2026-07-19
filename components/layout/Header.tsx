import Link from "next/link";

export default function Header() {
  return (
    <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
      <Link href="/" className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500 text-xl font-bold">
          H
        </div>

        <div>
          <p className="text-lg font-bold">HUMANITY OS</p>
          <p className="text-xs text-slate-400">
            The Operating System for Real Life
          </p>
        </div>
      </Link>

      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-semibold transition hover:bg-slate-800"
        >
          Giriş yap
        </Link>

        <Link
          href="/signup"
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          Hesap Oluştur
        </Link>
      </div>
    </nav>
  );
}