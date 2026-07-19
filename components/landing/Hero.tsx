import Header from "../layout/Header";
import HeroContent from "./HeroContent";
import ProcessPreview from "./ProcessPreview";

const benefits = [
  {
    icon: "✓",
    title: "Süreçlerini tamamla",
    description:
      "Başvurularını, belgelerini ve sonraki adımlarını tek bir güvenli yerde yönet.",
  },
  {
    icon: "◷",
    title: "Terminleri unutma",
    description:
      "Yaklaşan randevuları, son tarihleri ve eksik belgeleri zamanında gör.",
  },
  {
    icon: "✦",
    title: "AI ile ilerle",
    description:
      "Sadece cevap alma; hangi adımı atman gerektiğini net biçimde öğren.",
  },
];

export default function Hero() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Header />

      <section className="mx-auto grid max-w-7xl gap-14 px-6 pb-24 pt-20 lg:grid-cols-2 lg:items-center">
        <HeroContent />
        <ProcessPreview />
      </section>

      <section className="border-t border-slate-800 bg-slate-900/40">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-20 md:grid-cols-3">
          {benefits.map((benefit) => (
            <article
              key={benefit.title}
              className="rounded-3xl border border-slate-800 bg-slate-900 p-7"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-xl font-bold text-indigo-400">
                {benefit.icon}
              </div>

              <h3 className="text-xl font-bold">{benefit.title}</h3>

              <p className="mt-3 leading-7 text-slate-400">
                {benefit.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}