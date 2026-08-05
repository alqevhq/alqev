import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 py-10 md:flex-row">
        <div>
          <h3 className="text-lg font-bold text-white">ALQEV</h3>
          <p className="mt-2 max-w-md text-sm text-slate-400">
            AI-powered Life Management System for documents, applications,
            appointments and official processes.
          </p>

          <p className="mt-5 text-sm text-slate-500">
            © 2026 ALQEV. All rights reserved.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-sm text-slate-400">
          <Link href="/impressum" className="hover:text-white">
            Impressum
          </Link>

          <Link href="/datenschutz" className="hover:text-white">
            Datenschutz
          </Link>

          <Link href="/agb" className="hover:text-white">
            AGB
          </Link>

          <Link href="/kontakt" className="hover:text-white">
            Kontakt
          </Link>
        </div>
      </div>
    </footer>
  );
}