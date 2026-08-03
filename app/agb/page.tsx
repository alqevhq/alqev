import type { ReactNode } from "react";
import Link from "next/link";

export const metadata = {
  title: "Allgemeine Geschäftsbedingungen | ALQEV",
  description: "Allgemeine Geschäftsbedingungen für die Nutzung von ALQEV.",
};

const LAST_UPDATED = "3. August 2026";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-xl shadow-black/10 sm:p-8"
    >
      <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
        {title}
      </h2>
      <div className="mt-5 space-y-4 text-sm leading-7 text-slate-300 sm:text-[15px]">
        {children}
      </div>
    </section>
  );
}

export default function AgbPage() {
  const navigation = [
    ["anbieter", "1. Anbieter"],
    ["geltung", "2. Geltungsbereich"],
    ["leistung", "3. Leistungen"],
    ["konto", "4. Benutzerkonto"],
    ["pflichten", "5. Nutzerpflichten"],
    ["dokumente", "6. Dokumente"],
    ["ki", "7. KI-Funktionen"],
    ["verboten", "8. Verbotene Nutzung"],
    ["plaene", "9. Tarife"],
    ["zahlung", "10. Zahlung und Laufzeit"],
    ["widerruf", "11. Widerrufsrecht"],
    ["aenderungen", "12. Änderungen"],
    ["maengel", "13. Mängelrechte"],
    ["haftung", "14. Haftung"],
    ["sperrung", "15. Sperrung und Kündigung"],
    ["rechte", "16. Schutzrechte"],
    ["datenschutz", "17. Datenschutz"],
    ["schluss", "18. Schlussbestimmungen"],
  ] as const;

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-10 text-white sm:px-6 sm:py-14">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-[-260px] h-[560px] w-[560px] rounded-full bg-indigo-700/20 blur-[150px]" />
        <div className="absolute bottom-[-300px] right-[-180px] h-[620px] w-[620px] rounded-full bg-blue-700/10 blur-[180px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:44px_44px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl">
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
            Allgemeine Geschäftsbedingungen
          </h1>

          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
            Diese Allgemeinen Geschäftsbedingungen regeln die Nutzung der
            ALQEV-Webanwendung, einschließlich Benutzerkonto,
            Prozessverwaltung, Dokumentenfunktionen und KI-gestützter
            Assistenz.
          </p>

          <p className="mt-5 text-sm text-slate-500">Stand: {LAST_UPDATED}</p>
        </header>

        <div className="mt-8 rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5 text-sm leading-7 text-amber-100">
          ALQEV ist keine Behörde, keine Rechtsanwaltskanzlei, keine
          Steuerberatung, keine medizinische Einrichtung und keine sonstige
          staatlich oder berufsrechtlich zugelassene Beratungsstelle.
          Hinweise und KI-Ausgaben dienen ausschließlich der Orientierung.
        </div>

        <nav
          aria-label="Inhaltsübersicht"
          className="mt-8 rounded-3xl border border-white/10 bg-slate-900/70 p-6"
        >
          <p className="text-sm font-semibold text-white">Inhaltsübersicht</p>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            {navigation.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="rounded-xl px-3 py-2 text-slate-400 transition hover:bg-white/[0.04] hover:text-white"
              >
                {label}
              </a>
            ))}
          </div>
        </nav>

        <div className="mt-8 space-y-6">
          <Section id="anbieter" title="1. Anbieter und Kontakt">
            <address className="not-italic rounded-2xl border border-white/10 bg-black/20 p-5 text-slate-200">
              <strong className="text-white">ALQEV</strong>
              <br />
              Inhaber: Ali Arik
              <br />
              Schulstr. 79
              <br />
              46342 Velen
              <br />
              Deutschland
              <br />
              <br />
              E-Mail:{" "}
              <a
                href="mailto:info@alqev.com"
                className="font-medium text-indigo-300 underline decoration-indigo-400/40 underline-offset-4"
              >
                info@alqev.com
              </a>
            </address>
          </Section>

          <Section id="geltung" title="2. Geltungsbereich und Vertragsschluss">
            <p>
              Diese AGB gelten für alle Verträge über die Nutzung von ALQEV
              zwischen dem Anbieter und registrierten Nutzern. Nutzer können
              Verbraucher im Sinne von § 13 BGB oder Unternehmer im Sinne von
              § 14 BGB sein.
            </p>
            <p>
              Abweichende Bedingungen des Nutzers gelten nur, wenn der Anbieter
              ihrer Geltung ausdrücklich in Textform zugestimmt hat.
            </p>
            <p>
              Ein Nutzungsvertrag kommt zustande, wenn der Nutzer die
              Registrierung abschließt und der Anbieter das Benutzerkonto
              freischaltet oder die Nutzung ermöglicht. Bei entgeltlichen
              Plänen kommt der Vertrag nach den Angaben im Bestellprozess und
              der anschließenden Bestätigung zustande.
            </p>
          </Section>

          <Section id="leistung" title="3. Leistungsgegenstand und Verfügbarkeit">
            <p>
              ALQEV ist eine digitale Organisations- und Assistenzplattform.
              Je nach Entwicklungsstand und gewähltem Tarif können insbesondere
              folgende Funktionen angeboten werden:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Erstellung und Verwaltung persönlicher Vorgänge,</li>
              <li>Übersichten zu Aufgaben, Fristen und Dokumentstatus,</li>
              <li>Upload, Speicherung, Vorschau und Löschung von Dokumenten,</li>
              <li>KI-gestützte Hinweise, Empfehlungen und Chatfunktionen,</li>
              <li>OCR- und Dokumentenanalysefunktionen,</li>
              <li>mehrsprachige Benutzeroberflächen,</li>
              <li>kostenlose und gegebenenfalls entgeltliche Zusatzfunktionen.</li>
            </ul>
            <p>
              Der konkrete Funktionsumfang ergibt sich aus der jeweils
              aktuellen Leistungsbeschreibung und dem gewählten Tarif.
            </p>
            <p>
              Eine jederzeit unterbrechungsfreie oder fehlerfreie
              Verfügbarkeit wird nicht geschuldet, soweit nicht ausdrücklich
              etwas anderes vereinbart ist. Wartung, Sicherheitsmaßnahmen,
              technische Störungen und Ausfälle externer Dienstleister können
              die Verfügbarkeit vorübergehend beeinträchtigen.
            </p>
          </Section>

          <Section id="konto" title="4. Registrierung und Benutzerkonto">
            <p>
              Die Nutzung geschützter Bereiche setzt ein persönliches
              Benutzerkonto voraus. Angaben müssen vollständig und richtig
              sein und bei Änderungen aktualisiert werden.
            </p>
            <p>
              Das Mindestalter für ein eigenes Benutzerkonto beträgt 18 Jahre.
              Minderjährige dürfen ALQEV nur mit wirksamer Zustimmung ihrer
              gesetzlichen Vertreter und im rechtlich zulässigen Umfang nutzen.
            </p>
            <p>
              Zugangsdaten sind geheim zu halten. Der Nutzer muss den Anbieter
              unverzüglich informieren, wenn er einen unbefugten Zugriff
              vermutet.
            </p>
            <p>
              Mehrfachkonten zur Umgehung von Beschränkungen, die Weitergabe
              des Kontos und automatisierte Registrierungen sind unzulässig.
            </p>
          </Section>

          <Section id="pflichten" title="5. Allgemeine Pflichten der Nutzer">
            <p>Der Nutzer verpflichtet sich insbesondere:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>nur rechtmäßige und wahrheitsgemäße Inhalte zu verwenden,</li>
              <li>geltendes Recht und Rechte Dritter zu beachten,</li>
              <li>wichtige Daten zusätzlich selbst zu sichern,</li>
              <li>Hinweise, Fristen und Ausgaben eigenverantwortlich zu prüfen,</li>
              <li>Sicherheitsvorgaben und Dateibeschränkungen einzuhalten,</li>
              <li>die Plattform nicht missbräuchlich einzusetzen.</li>
            </ul>
            <p>
              Der Nutzer bleibt für seine behördlichen, rechtlichen,
              finanziellen, beruflichen und sonstigen Entscheidungen selbst
              verantwortlich. ALQEV übernimmt keine Vertretung gegenüber
              Behörden, Gerichten, Versicherungen, Banken, Arbeitgebern oder
              sonstigen Dritten.
            </p>
          </Section>

          <Section id="dokumente" title="6. Dokumente, Uploads und Nutzerinhalte">
            <p>
              Nutzer dürfen nur Inhalte und Dokumente hochladen, speichern oder
              verarbeiten, zu deren Nutzung und Verarbeitung sie berechtigt
              sind. Dies gilt insbesondere für personenbezogene Daten Dritter,
              Ausweisdokumente, behördliche Unterlagen, Bilder und geschützte
              Werke.
            </p>
            <p>Unzulässig sind insbesondere:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>gefälschte, manipulierte oder rechtswidrig erlangte Dokumente,</li>
              <li>Schadsoftware, Viren oder technisch schädliche Dateien,</li>
              <li>Inhalte, die Rechte Dritter verletzen,</li>
              <li>strafbare oder sonst rechtswidrige Inhalte.</li>
            </ul>
            <p>
              Der Nutzer räumt dem Anbieter an hochgeladenen Inhalten nur die
              Rechte ein, die zur Speicherung, Darstellung, technischen
              Verarbeitung, Analyse und Erbringung der gewählten Funktionen
              erforderlich sind.
            </p>
            <p>
              Rechte an Nutzerinhalten verbleiben beim Nutzer. Nach
              Vertragsende gelten die gesetzlichen Regelungen zu
              personenbezogenen Daten und zu vom Nutzer bereitgestellten
              Inhalten.
            </p>
          </Section>

          <Section id="ki" title="7. KI-, Chat- und OCR-Funktionen">
            <p>
              KI-Ausgaben werden automatisiert erstellt. Sie können
              unvollständig, ungenau, veraltet, missverständlich oder sachlich
              falsch sein.
            </p>
            <p>
              KI-Ausgaben sind keine verbindliche Rechtsberatung,
              Steuerberatung, medizinische Beratung, Finanzberatung oder
              behördliche Auskunft. Sie ersetzen keine Prüfung durch eine
              qualifizierte Fachperson oder die zuständige Stelle.
            </p>
            <p>
              Der Nutzer muss insbesondere Fristen, Voraussetzungen,
              Rechtsfolgen, Gebühren, Zuständigkeiten und
              Dokumentenanforderungen anhand offizieller Quellen oder durch
              Fachpersonen überprüfen.
            </p>
            <p>
              ALQEV garantiert keinen bestimmten Erfolg eines Antrags,
              Verfahrens oder sonstigen Vorhabens. Entscheidungen treffen der
              Nutzer und die jeweils zuständigen Stellen.
            </p>
          </Section>

          <Section id="verboten" title="8. Unzulässige Nutzung">
            <ul className="list-disc space-y-2 pl-6">
              <li>Angriffe oder unbefugte Sicherheitstests,</li>
              <li>Umgehung von Sicherheitsmaßnahmen oder Zugriffsbeschränkungen,</li>
              <li>Scraping, Bots oder massenhafte automatisierte Abfragen,</li>
              <li>Reverse Engineering, soweit nicht zwingend erlaubt,</li>
              <li>Umgehung von Tarif-, Speicher- oder API-Limits,</li>
              <li>Spam, Phishing oder Schadsoftware,</li>
              <li>Beeinträchtigung der Verfügbarkeit oder Integrität,</li>
              <li>Nutzung im Namen Dritter ohne Berechtigung.</li>
            </ul>
            <p>
              Bei Verdacht auf Missbrauch darf der Anbieter angemessene
              Schutzmaßnahmen treffen, insbesondere Zugriffe begrenzen oder
              Funktionen vorübergehend sperren.
            </p>
          </Section>

          <Section id="plaene" title="9. Kostenlose und entgeltliche Pläne">
            <p>
              ALQEV kann einen kostenlosen Tarif sowie entgeltliche Tarife oder
              Zusatzleistungen anbieten. Umfang, Nutzungsgrenzen, Preis und
              Abrechnungszeitraum ergeben sich aus der jeweils aktuellen
              Leistungs- und Preisbeschreibung.
            </p>
            <p>
              Kostenlose Funktionen können Nutzungs-, Speicher-, Dokumenten-,
              Anfrage- oder KI-Limits unterliegen.
            </p>
            <p>
              Entgeltliche Funktionen werden erst Vertragsbestandteil, wenn sie
              im Bestellprozess ausdrücklich ausgewählt und bestätigt wurden.
              Solange kein entgeltlicher Bestellprozess aktiviert ist, entstehen
              keine Zahlungspflichten.
            </p>
          </Section>

          <Section id="zahlung" title="10. Preise, Zahlung, Laufzeit und Kündigung">
            <p>
              Alle gegenüber Verbrauchern angegebenen Preise verstehen sich
              einschließlich der gesetzlichen Umsatzsteuer, soweit diese
              anfällt.
            </p>
            <p>
              Vor Abschluss einer Bestellung werden Gesamtpreis,
              Abrechnungszeitraum, Vertragslaufzeit und
              Kündigungsbedingungen angezeigt.
            </p>
            <p>
              Zahlungen können über einen im Bestellprozess bezeichneten
              Zahlungsdienstleister abgewickelt werden. Dessen Bedingungen
              gelten ergänzend, soweit sie wirksam einbezogen werden.
            </p>
            <p>
              Kündigungen sind über die bereitgestellte Online-Funktion oder
              in Textform an info@alqev.com möglich. Gesetzlich erforderliche
              Kündigungsmöglichkeiten werden bereitgestellt, sobald
              entsprechende entgeltliche Dauerschuldverhältnisse angeboten
              werden.
            </p>
          </Section>

          <Section id="widerruf" title="11. Widerrufsrecht für Verbraucher">
            <p>
              Verbrauchern steht bei Fernabsatzverträgen grundsätzlich ein
              gesetzliches Widerrufsrecht zu. Vor Abschluss eines
              entgeltlichen Vertrags werden eine gesonderte
              Widerrufsbelehrung und ein Muster-Widerrufsformular
              bereitgestellt.
            </p>
            <p>
              Bei digitalen Dienstleistungen oder digitalen Inhalten kann das
              Widerrufsrecht nur unter den gesetzlichen Voraussetzungen
              vorzeitig erlöschen. Soweit erforderlich, wird vor Beginn der
              Leistung eine ausdrückliche Zustimmung und Bestätigung
              eingeholt.
            </p>
            <p>
              Diese AGB ersetzen keine gesetzlich erforderliche
              Widerrufsbelehrung.
            </p>
          </Section>

          <Section id="aenderungen" title="12. Bereitstellung, Aktualisierungen und Änderungen">
            <p>
              Eine digitale Dienstleistung gilt als bereitgestellt, sobald sie
              dem Nutzer zugänglich ist. Notwendige Aktualisierungen
              einschließlich Sicherheitsaktualisierungen werden nach Maßgabe
              der gesetzlichen Vorschriften bereitgestellt.
            </p>
            <p>
              Der Anbieter darf Funktionen ändern, weiterentwickeln, ersetzen
              oder neu strukturieren, wenn hierfür ein triftiger Grund besteht,
              insbesondere technische Weiterentwicklung,
              Sicherheitsanforderungen, geänderte Rechtslage, Änderungen
              externer Dienste oder verbesserte Nutzerfreundlichkeit.
            </p>
            <p>
              Änderungen dürfen Verbrauchern keine zusätzlichen Kosten
              verursachen. Über wesentliche Änderungen wird klar und
              verständlich informiert. Gesetzliche Informations- und
              Beendigungsrechte bleiben unberührt.
            </p>
          </Section>

          <Section id="maengel" title="13. Gesetzliche Mängelrechte">
            <p>
              Für digitale Produkte gelten gegenüber Verbrauchern die
              gesetzlichen Vorschriften, insbesondere die §§ 327 ff. BGB.
              Dies umfasst Rechte bei unterbliebener Bereitstellung, Mängeln,
              fehlenden Aktualisierungen und unzulässigen Änderungen.
            </p>
            <p>
              Nutzer sollen erkennbare Fehler möglichst genau beschreiben.
              Gesetzliche Rechte werden dadurch nicht eingeschränkt.
            </p>
          </Section>

          <Section id="haftung" title="14. Haftung">
            <p>
              Der Anbieter haftet unbeschränkt bei Vorsatz und grober
              Fahrlässigkeit sowie bei schuldhafter Verletzung von Leben,
              Körper oder Gesundheit.
            </p>
            <p>
              Bei leicht fahrlässiger Verletzung einer wesentlichen
              Vertragspflicht haftet der Anbieter nur auf den
              vorhersehbaren, vertragstypischen Schaden.
            </p>
            <p>
              Im Übrigen ist die Haftung für leichte Fahrlässigkeit
              ausgeschlossen. Unberührt bleiben Ansprüche nach dem
              Produkthaftungsgesetz, aufgrund übernommener Garantien,
              arglistigen Verschweigens eines Mangels und sonstige zwingende
              gesetzliche Haftung.
            </p>
            <p>
              Der Anbieter haftet nicht für Entscheidungen, die allein auf
              ungeprüften KI-Ausgaben, unvollständigen Nutzereingaben oder
              nicht verifizierten Informationen beruhen, soweit keine
              zwingende gesetzliche Haftung eingreift.
            </p>
          </Section>

          <Section id="sperrung" title="15. Sperrung, Kündigung und Vertragsende">
            <p>
              Der Nutzer kann ein kostenloses Nutzungsverhältnis grundsätzlich
              jederzeit beenden. Für entgeltliche Verträge gelten die
              vereinbarte Laufzeit und die gesetzlichen Kündigungsrechte.
            </p>
            <p>
              Das Recht zur außerordentlichen Kündigung aus wichtigem Grund
              bleibt unberührt. Ein wichtiger Grund kann insbesondere bei
              erheblichen oder wiederholten Verstößen, rechtswidriger Nutzung,
              Sicherheitsangriffen oder fortdauerndem Zahlungsverzug vorliegen.
            </p>
            <p>
              Soweit zumutbar und rechtlich geboten, wird der Nutzer vor einer
              dauerhaften Sperrung informiert. Bei akuter Gefahr darf eine
              sofortige vorläufige Sperrung erfolgen.
            </p>
          </Section>

          <Section id="rechte" title="16. Urheberrecht, Marken und Plattformrechte">
            <p>
              Plattform, Software, Benutzeroberfläche, Struktur, Gestaltung,
              Logos, Marken, Texte und Vorlagen sind rechtlich geschützt.
            </p>
            <p>
              Der Nutzer erhält nur ein einfaches, nicht übertragbares Recht,
              ALQEV während der Vertragsdauer vertragsgemäß zu nutzen.
            </p>
            <p>
              Eine Vervielfältigung, öffentliche Zugänglichmachung,
              Unterlizenzierung oder kommerzielle Verwertung ist ohne
              Zustimmung nicht gestattet, soweit sie nicht zwingend gesetzlich
              erlaubt ist.
            </p>
          </Section>

          <Section id="datenschutz" title="17. Datenschutz">
            <p>
              Informationen zur Verarbeitung personenbezogener Daten enthält
              die{" "}
              <Link
                href="/datenschutz"
                className="font-medium text-indigo-300 underline decoration-indigo-400/40 underline-offset-4"
              >
                Datenschutzerklärung
              </Link>
              .
            </p>
            <p>
              Nutzer müssen bei der Verarbeitung personenbezogener Daten Dritter
              die anwendbaren Datenschutzvorschriften beachten.
            </p>
          </Section>

          <Section id="schluss" title="18. Schlussbestimmungen">
            <p>
              Es gilt das Recht der Bundesrepublik Deutschland unter
              Ausschluss des UN-Kaufrechts. Gegenüber Verbrauchern gilt diese
              Rechtswahl nur, soweit ihnen dadurch nicht der Schutz zwingender
              Bestimmungen ihres gewöhnlichen Aufenthaltsstaats entzogen wird.
            </p>
            <p>
              Für Verbraucher gelten die gesetzlichen Gerichtsstände. Ist der
              Nutzer Kaufmann, juristische Person des öffentlichen Rechts oder
              öffentlich-rechtliches Sondervermögen, ist – soweit gesetzlich
              zulässig – der Geschäftssitz des Anbieters Gerichtsstand.
            </p>
            <p>
              Die Europäische Plattform zur Online-Streitbeilegung wurde zum
              20. Juli 2025 eingestellt. Der Anbieter ist derzeit weder
              verpflichtet noch bereit, an einem Streitbeilegungsverfahren vor
              einer Verbraucherschlichtungsstelle teilzunehmen.
            </p>
            <p>
              Sollten einzelne Bestimmungen unwirksam sein, bleibt die
              Wirksamkeit der übrigen Bestimmungen unberührt. An die Stelle der
              unwirksamen Bestimmung treten die gesetzlichen Vorschriften.
            </p>
            <p>
              Rechtserhebliche Erklärungen können an{" "}
              <a
                href="mailto:info@alqev.com"
                className="font-medium text-indigo-300 underline decoration-indigo-400/40 underline-offset-4"
              >
                info@alqev.com
              </a>{" "}
              gerichtet werden.
            </p>
            <p className="text-slate-500">Stand: {LAST_UPDATED}</p>
          </Section>
        </div>

        <footer className="mt-10 flex flex-col gap-4 border-t border-white/10 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 ALQEV · Inhaber: Ali Arik</p>
          <div className="flex flex-wrap gap-5">
            <Link href="/" className="transition hover:text-white">
              Startseite
            </Link>
            <Link href="/datenschutz" className="transition hover:text-white">
              Datenschutz
            </Link>
            <a href="mailto:info@alqev.com" className="transition hover:text-white">
              Kontakt
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}