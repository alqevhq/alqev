import Link from "next/link";
import Button from "../ui/Button";

export default function HeroContent() {
  return (
    <div>
      <div className="mb-6 inline-flex rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-2 text-sm text-indigo-300">
        Tek uygulama. Hayatındaki tüm süreçler.
      </div>

      <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight md:text-7xl">
        Karmaşık hayat süreçlerini
        <span className="block text-indigo-400">gerçekten tamamla.</span>
      </h1>

      <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
        HUMANITY OS; belgelerini, başvurularını, terminlerini ve resmî
        işlemlerini güvenli biçimde yönetmene yardımcı olan kişisel yaşam
        işletim sistemidir.
      </p>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row">
        <Link href="/signup">
          <Button>Hayatını düzenlemeye başla</Button>
        </Link>

        <button className="rounded-xl border border-slate-700 px-7 py-4 font-semibold transition hover:bg-slate-800">
          Nasıl çalışır?
        </button>
      </div>

      <p className="mt-5 text-sm text-slate-500">
        Deutsch · Türkçe · English · العربية · فارسی
      </p>
    </div>
  );
}