export default function ProcessPreview() {
  const documents = [
    ["Pasaport kopyası", true],
    ["Biyometrik fotoğraf", true],
    ["Kira sözleşmesi", false],
    ["Sağlık sigortası belgesi", false],
  ] as const;

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">Aktif süreç</p>

          <h2 className="mt-1 text-2xl font-bold">
            Oturum uzatma başvurusu
          </h2>
        </div>

        <div className="rounded-full bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-400">
          %67
        </div>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full w-2/3 rounded-full bg-indigo-500" />
      </div>

      <div className="mt-8 space-y-4">
        {documents.map(([label, completed]) => (
          <div
            key={label}
            className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${
                completed
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {completed ? "✓" : "○"}
            </div>

            <span
              className={
                completed
                  ? "text-slate-400 line-through"
                  : "text-slate-200"
              }
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl bg-indigo-500/10 p-5">
        <p className="text-sm font-semibold text-indigo-300">
          ALQEV AI önerisi
        </p>

        <p className="mt-2 leading-7 text-slate-300">
          Sonraki adım olarak kira sözleşmeni yükle. Adres ve tarih
          bilgilerinin başvurunla uyumlu olup olmadığını kontrol edeyim.
        </p>
      </div>
    </div>
  );
}