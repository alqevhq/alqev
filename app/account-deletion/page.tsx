import Link from "next/link";

export const metadata = {
  title: "Konto löschen | ALQEV",
  description:
    "Informationen zur Löschung eines ALQEV-Benutzerkontos und der damit verbundenen personenbezogenen Daten.",
};

const LAST_UPDATED = "20. August 2026";

export default function AccountDeletionPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-10 text-white sm:px-6 sm:py-14">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute left-1/4 top-[-260px] h-[560px] w-[560px] rounded-full bg-indigo-700/20 blur-[150px]" />
        <div className="absolute bottom-[-300px] right-[-180px] h-[620px] w-[620px] rounded-full bg-blue-700/10 blur-[180px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:44px_44px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <span aria-hidden="true">←</span>
          Zur Startseite
        </Link>

        <header className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-7 shadow-2xl shadow-indigo-950/20 backdrop-blur-xl sm:p-10">
          <div className="inline-flex items-center rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">
            ALQEV
          </div>

          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
            Konto und Daten löschen
          </h1>

          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
            Auf dieser Seite erfahren Sie, wie Sie die Löschung Ihres
            ALQEV-Benutzerkontos und der damit verbundenen personenbezogenen
            Daten beantragen können.
          </p>

          <p className="mt-5 text-sm text-slate-500">
            Stand: {LAST_UPDATED}
          </p>
        </header>

        <div className="mt-8 space-y-6">
          <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-xl shadow-black/10 sm:p-8">
            <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              So beantragen Sie die Löschung Ihres Kontos
            </h2>

            <div className="mt-5 space-y-4 text-sm leading-7 text-slate-300 sm:text-[15px]">
              <p>
                Um Ihr ALQEV-Benutzerkonto und die damit verbundenen
                personenbezogenen Daten löschen zu lassen, senden Sie bitte eine
                E-Mail an:
              </p>

              <div className="rounded-2xl border border-indigo-400/20 bg-indigo-400/10 p-5">
                <a
                  href="mailto:info@alqev.com?subject=Antrag%20auf%20Kontol%C3%B6schung"
                  className="font-semibold text-indigo-200 underline decoration-indigo-400/40 underline-offset-4 transition hover:text-indigo-100"
                >
                  info@alqev.com
                </a>
              </div>

              <p>
                Verwenden Sie nach Möglichkeit die E-Mail-Adresse, mit der Ihr
                ALQEV-Konto registriert wurde. Geben Sie als Betreff zum Beispiel
                <strong className="text-white">
                  {" "}
                  „Antrag auf Kontolöschung“
                </strong>{" "}
                an.
              </p>

              <p>
                Zum Schutz Ihres Kontos kann es erforderlich sein, Ihre Identität
                zu überprüfen, bevor wir die Löschung durchführen.
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-xl shadow-black/10 sm:p-8">
            <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Welche Daten werden gelöscht?
            </h2>

            <div className="mt-5 space-y-4 text-sm leading-7 text-slate-300 sm:text-[15px]">
              <p>
                Im Rahmen einer vollständigen Kontolöschung werden grundsätzlich
                die personenbezogenen Daten gelöscht, die mit Ihrem
                Benutzerkonto verknüpft sind und für die weitere Bereitstellung
                von ALQEV nicht mehr erforderlich sind.
              </p>

              <ul className="list-disc space-y-2 pl-6">
                <li>Benutzerkonto und Authentifizierungsdaten,</li>
                <li>Profil- und Onboarding-Daten,</li>
                <li>gespeicherte Prozesse, Notizen und Statusinformationen,</li>
                <li>hochgeladene Dokumente und zugehörige Metadaten,</li>
                <li>gespeicherte Präferenzen und sonstige Kontodaten.</li>
              </ul>

              <p>
                Soweit Daten ausschließlich für technische Sicherheit,
                Rechtsverteidigung oder aufgrund gesetzlicher
                Aufbewahrungspflichten weiter gespeichert werden müssen, werden
                diese nur für den jeweils erforderlichen Zeitraum aufbewahrt und
                anschließend gelöscht oder anonymisiert.
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-xl shadow-black/10 sm:p-8">
            <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Einzelne Daten löschen
            </h2>

            <div className="mt-5 space-y-4 text-sm leading-7 text-slate-300 sm:text-[15px]">
              <p>
                Bestimmte Inhalte, zum Beispiel hochgeladene Dokumente, können
                innerhalb der ALQEV-Anwendung gelöscht werden, sofern die
                jeweilige Funktion dies unterstützt.
              </p>

              <p>
                Wenn Sie eine weitergehende Löschung einzelner personenbezogener
                Daten wünschen, ohne das gesamte Benutzerkonto zu löschen,
                können Sie sich ebenfalls an{" "}
                <a
                  href="mailto:info@alqev.com"
                  className="font-medium text-indigo-300 underline decoration-indigo-400/40 underline-offset-4 transition hover:text-indigo-200"
                >
                  info@alqev.com
                </a>{" "}
                wenden.
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-xl shadow-black/10 sm:p-8">
            <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Weitere Informationen zum Datenschutz
            </h2>

            <div className="mt-5 space-y-4 text-sm leading-7 text-slate-300 sm:text-[15px]">
              <p>
                Weitere Informationen über die Verarbeitung personenbezogener
                Daten, Speicherdauern und Ihre Datenschutzrechte finden Sie in
                unserer Datenschutzerklärung.
              </p>

              <Link
                href="/datenschutz"
                className="inline-flex rounded-xl border border-indigo-400/20 bg-indigo-400/10 px-4 py-2 font-medium text-indigo-200 transition hover:bg-indigo-400/15 hover:text-white"
              >
                Datenschutzerklärung öffnen
              </Link>
            </div>
          </section>
        </div>

        <footer className="mt-10 flex flex-col gap-4 border-t border-white/10 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 ALQEV</p>

          <div className="flex flex-wrap gap-5">
            <Link href="/" className="transition hover:text-white">
              Startseite
            </Link>

            <Link href="/datenschutz" className="transition hover:text-white">
              Datenschutz
            </Link>

            <a
              href="mailto:info@alqev.com"
              className="transition hover:text-white"
            >
              Kontakt
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}