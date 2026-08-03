import type { ReactNode } from "react";
import Link from "next/link";

export const metadata = {
  title: "Datenschutzerklärung | ALQEV",
  description:
    "Informationen zur Verarbeitung personenbezogener Daten bei der Nutzung von ALQEV.",
};

const LAST_UPDATED = "2. August 2026";

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

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-indigo-300 underline decoration-indigo-400/40 underline-offset-4 transition hover:text-indigo-200"
    >
      {children}
    </a>
  );
}

export default function DatenschutzPage() {
  const navigation = [
    ["verantwortlicher", "1. Verantwortlicher"],
    ["grundlagen", "2. Grundlagen"],
    ["hosting", "3. Hosting und Logdaten"],
    ["konto", "4. Benutzerkonto"],
    ["firebase", "5. Firebase"],
    ["prozesse", "6. Prozessdaten"],
    ["dokumente", "7. Dokumente"],
    ["ki", "8. KI und OCR"],
    ["kommunikation", "9. Kommunikation"],
    ["speicherdauer", "10. Speicherdauer"],
    ["empfaenger", "11. Empfänger"],
    ["endgeraet", "12. Endgerätezugriff"],
    ["sicherheit", "13. Sicherheit"],
    ["rechte", "14. Betroffenenrechte"],
    ["beschwerde", "15. Beschwerderecht"],
    ["bereitstellung", "16. Datenbereitstellung"],
    ["automatisierung", "17. Automatisierung"],
    ["aenderungen", "18. Änderungen"],
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
            Datenschutzerklärung
          </h1>

          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
            Diese Datenschutzerklärung erläutert, wie personenbezogene Daten
            bei der Nutzung der ALQEV-Webanwendung verarbeitet werden. Sie gilt
            insbesondere für Benutzerkonten, die Verwaltung persönlicher
            Vorgänge, Dokumentenfunktionen und KI-gestützte Assistenz.
          </p>

          <p className="mt-5 text-sm text-slate-500">Stand: {LAST_UPDATED}</p>
        </header>

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
          <Section id="verantwortlicher" title="1. Verantwortlicher">
            <p>
              Verantwortlicher im Sinne der Datenschutz-Grundverordnung
              (DSGVO) und der sonstigen anwendbaren Datenschutzvorschriften ist:
            </p>

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

            <p>
              Ein Datenschutzbeauftragter ist derzeit nicht bestellt. Fragen
              zum Datenschutz und Anträge zur Ausübung von
              Betroffenenrechten können an die oben genannte E-Mail-Adresse
              gerichtet werden.
            </p>
          </Section>

          <Section id="grundlagen" title="2. Allgemeine Grundlagen der Datenverarbeitung">
            <p>
              Personenbezogene Daten sind alle Informationen, die sich auf eine
              identifizierte oder identifizierbare natürliche Person beziehen.
              Wir verarbeiten solche Daten nur, wenn dies zur Bereitstellung,
              Sicherheit und Weiterentwicklung von ALQEV erforderlich ist oder
              eine andere gesetzliche Rechtsgrundlage besteht.
            </p>

            <p>Je nach Verarbeitung stützen wir uns insbesondere auf:</p>

            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong className="text-white">Art. 6 Abs. 1 lit. b DSGVO</strong>{" "}
                für vorvertragliche Maßnahmen und die Erfüllung des
                Nutzungsverhältnisses.
              </li>
              <li>
                <strong className="text-white">Art. 6 Abs. 1 lit. c DSGVO</strong>{" "}
                zur Erfüllung rechtlicher Verpflichtungen.
              </li>
              <li>
                <strong className="text-white">Art. 6 Abs. 1 lit. f DSGVO</strong>{" "}
                für berechtigte Interessen, insbesondere einen sicheren,
                stabilen und missbrauchsgeschützten Betrieb sowie die
                Geltendmachung oder Abwehr von Rechtsansprüchen.
              </li>
              <li>
                <strong className="text-white">Art. 6 Abs. 1 lit. a DSGVO</strong>{" "}
                bei einer ausdrücklich erteilten Einwilligung.
              </li>
            </ul>

            <p>
              Soweit besondere Kategorien personenbezogener Daten nach Art. 9
              DSGVO betroffen sind, erfolgt eine Verarbeitung nur, wenn eine
              Ausnahme nach Art. 9 Abs. 2 DSGVO greift. Nutzer sollen solche
              Daten nur bereitstellen, wenn sie für den selbst gewählten
              Vorgang tatsächlich erforderlich sind. Soweit erforderlich,
              wird eine ausdrückliche Einwilligung gesondert eingeholt.
            </p>
          </Section>

          <Section id="hosting" title="3. Hosting, Bereitstellung und Server-Logdaten">
            <p>
              ALQEV wird über die Infrastruktur von Vercel Inc.,
              340 S Lemon Ave #4133, Walnut, CA 91789, USA, bereitgestellt.
              Beim Aufruf der Anwendung können technisch erforderliche Daten
              verarbeitet werden, insbesondere IP-Adresse, Datum und Uhrzeit,
              aufgerufene URL, Referrer-URL, Browsertyp, Betriebssystem,
              Geräteinformationen, HTTP-Status und Diagnoseinformationen.
            </p>

            <p>
              Die Verarbeitung dient der sicheren Auslieferung, Stabilität,
              Fehleranalyse und Abwehr missbräuchlicher Zugriffe. Rechtsgrundlage
              ist Art. 6 Abs. 1 lit. f DSGVO. Das berechtigte Interesse liegt
              im sicheren und zuverlässigen Betrieb der Plattform.
            </p>

            <p>
              Vercel kann Daten in Drittländern, insbesondere in den USA,
              verarbeiten. Hierfür können ein anwendbarer
              Angemessenheitsbeschluss, insbesondere das EU-US Data Privacy
              Framework, Standardvertragsklauseln und ergänzende
              Schutzmaßnahmen eingesetzt werden.
            </p>

            <p>
              Weitere Informationen:{" "}
              <ExternalLink href="https://vercel.com/legal/privacy-policy">
                Datenschutzerklärung von Vercel
              </ExternalLink>{" "}
              und{" "}
              <ExternalLink href="https://vercel.com/legal/dpa">
                Vercel Data Processing Addendum
              </ExternalLink>
              .
            </p>
          </Section>

          <Section id="konto" title="4. Registrierung, Anmeldung und Benutzerkonto">
            <p>
              Für geschützte Bereiche ist ein Benutzerkonto erforderlich.
              Dabei können insbesondere Name, E-Mail-Adresse, Benutzerkennung,
              bevorzugte Sprache, Land, Onboarding-Angaben, Kontostatus,
              Tarifstatus, Anmeldezeitpunkte und sicherheitsbezogene
              technische Daten verarbeitet werden.
            </p>

            <p>
              Die Verarbeitung erfolgt zur Einrichtung, Verwaltung und
              Absicherung des Kontos sowie zur Bereitstellung personalisierter
              Funktionen auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO.
              Die E-Mail-Adresse wird unter anderem zur Kontoverifikation,
              Passwortzurücksetzung und für sicherheitsrelevante Nachrichten
              verwendet. Passwörter sind für uns nicht im Klartext einsehbar.
            </p>
          </Section>

          <Section id="firebase" title="5. Google Firebase">
            <p>
              ALQEV nutzt Dienste von Google Firebase. Je nach Dienst erfolgt
              die Leistungserbringung durch Google Ireland Limited,
              Gordon House, Barrow Street, Dublin 4, Irland, Google LLC,
              1600 Amphitheatre Parkway, Mountain View, CA 94043, USA, oder
              andere verbundene Google-Unternehmen.
            </p>

            <h3 className="pt-2 text-base font-semibold text-white">
              5.1 Firebase Authentication
            </h3>
            <p>
              Firebase Authentication wird für Registrierung, Anmeldung,
              Sitzungsverwaltung, E-Mail-Verifikation und
              Passwortzurücksetzung eingesetzt. Verarbeitet werden können
              insbesondere E-Mail-Adresse, Benutzerkennung, Passwortdaten in
              geschützter Form, Authentifizierungsstatus, IP-Adresse,
              User-Agent und technische Sicherheitsinformationen.
            </p>

            <h3 className="pt-2 text-base font-semibold text-white">
              5.2 Cloud Firestore
            </h3>
            <p>
              Cloud Firestore wird zur Speicherung von Profil-, Prozess-,
              Status-, Präferenz-, Nutzungs- und Anwendungsdaten eingesetzt.
              Dazu können Prozessarten, Fristen, Notizen, Dokumentstatus,
              KI-Auswertungsergebnisse und administrative Protokolle gehören.
            </p>

            <h3 className="pt-2 text-base font-semibold text-white">
              5.3 Cloud Storage for Firebase
            </h3>
            <p>
              Cloud Storage for Firebase wird für hochgeladene Dateien
              verwendet. Zugriffe werden durch Authentifizierung und
              Sicherheitsregeln auf benutzerbezogene Speicherbereiche
              beschränkt.
            </p>

            <p>
              Die Verarbeitung erfolgt zur Vertragserfüllung nach Art. 6
              Abs. 1 lit. b DSGVO und zur Gewährleistung des sicheren Betriebs
              nach Art. 6 Abs. 1 lit. f DSGVO. Google handelt bei
              Kundendaten grundsätzlich als Auftragsverarbeiter.
            </p>

            <p>
              Firebase Authentication wird nach Angaben von Google
              ausschließlich in Rechenzentren in den USA betrieben. Andere
              Firebase-Dienste können – abhängig von Dienst und gewählter
              Region – auf globaler Google-Infrastruktur verarbeitet werden.
              Für Drittlandübermittlungen können das EU-US Data Privacy
              Framework, Standardvertragsklauseln und ergänzende
              Schutzmaßnahmen eingesetzt werden.
            </p>

            <p>
              Weitere Informationen:{" "}
              <ExternalLink href="https://firebase.google.com/support/privacy/">
                Datenschutz und Sicherheit bei Firebase
              </ExternalLink>{" "}
              sowie{" "}
              <ExternalLink href="https://firebase.google.com/terms/data-processing-terms/">
                Firebase Data Processing and Security Terms
              </ExternalLink>
              .
            </p>
          </Section>

          <Section id="prozesse" title="6. Profil-, Prozess- und Organisationsdaten">
            <p>
              Nutzer können persönliche Vorgänge anlegen und verwalten.
              Verarbeitet werden können insbesondere Vorgangstyp, Bezeichnung,
              Land, Kategorie, Bearbeitungsstatus, Fortschritt, Fristen,
              Notizen, Dokumentlisten, Aufgaben, Empfehlungen und Zeitstempel.
            </p>

            <p>
              Diese Daten werden genutzt, um gewünschte Funktionen
              bereitzustellen, Vorgänge zu strukturieren, Fortschritt
              darzustellen, Fristen und fehlende Unterlagen zu erkennen und
              personalisierte Hinweise zu erzeugen. Rechtsgrundlage ist
              Art. 6 Abs. 1 lit. b DSGVO.
            </p>

            <p>
              Nutzer dürfen Daten Dritter nur eintragen oder hochladen, wenn
              sie hierzu berechtigt sind. Nicht erforderliche Daten sollten
              vor dem Hochladen geschwärzt oder entfernt werden.
            </p>
          </Section>

          <Section id="dokumente" title="7. Dokumente, Dateiuploads und sensible Inhalte">
            <p>
              ALQEV ermöglicht das Hochladen von PDF- und Bilddateien.
              Verarbeitet werden können Dateiname, Dateityp, Dateigröße,
              Speicherpfad, Upload-Zeitpunkt, Dokumentstatus, technische
              Metadaten und der Dokumentinhalt.
            </p>

            <p>
              Dokumente können Namen, Adressen, Geburtsdaten,
              Identifikationsnummern, Unterschriften, Behördenangaben,
              finanzielle Informationen oder andere vertrauliche Inhalte
              enthalten. Nutzer bestimmen selbst, welche Dokumente sie
              hochladen.
            </p>

            <p>
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, soweit die
              Verarbeitung zur vom Nutzer gewählten Funktion erforderlich ist.
              Für besondere Kategorien personenbezogener Daten gelten
              zusätzlich die Anforderungen aus Abschnitt 2.
            </p>

            <p>
              Dateien werden in benutzerbezogenen Speicherpfaden abgelegt.
              Sicherheitsregeln beschränken Zugriffe grundsätzlich auf den
              jeweiligen Kontoinhaber und technisch berechtigte
              Administrationsprozesse. Nutzer können hochgeladene Dateien in
              der Anwendung löschen. Metadaten oder technische
              Sicherungskopien können vorübergehend fortbestehen, soweit dies
              technisch erforderlich oder gesetzlich zulässig ist.
            </p>
          </Section>

          <Section id="ki" title="8. KI-gestützte Assistenz, Dokumentenanalyse und OCR">
            <p>
              ALQEV bietet KI-gestützte Funktionen zur Strukturierung von
              Vorgängen, Beantwortung von Fragen, Erkennung möglicher nächster
              Schritte und Analyse hochgeladener Dokumente. Dabei können
              Texteingaben, Prozessinformationen, Dokumentbezeichnungen,
              Dokumentinhalte, erkannter Text, ausgewählte Profildaten,
              Sprache, Auswertungsergebnisse und technische Metadaten
              verarbeitet werden.
            </p>

            <p>
              Zur technischen Erbringung können externe KI- und
              Cloud-Dienstanbieter eingesetzt werden. Welche Anbieter konkret
              eingesetzt werden, richtet sich nach der jeweils aktiven
              technischen Konfiguration. Vor einer wesentlichen Änderung oder
              Einbindung eines neuen Anbieters wird diese Erklärung
              aktualisiert und – falls erforderlich – eine Einwilligung
              eingeholt.
            </p>

            <p>
              Die Verarbeitung erfolgt zur Erbringung der angeforderten
              Funktion auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO. Soweit
              die Verarbeitung nicht zur Vertragserfüllung erforderlich ist,
              kann sie auf einer Einwilligung gemäß Art. 6 Abs. 1 lit. a DSGVO
              beruhen. Bei besonderen Kategorien personenbezogener Daten
              gelten zusätzlich die Anforderungen des Art. 9 DSGVO.
            </p>

            <p>
              KI-Ausgaben werden automatisiert erzeugt und können
              unvollständig, veraltet oder fehlerhaft sein. Sie ersetzen keine
              Rechts-, Steuer-, Medizin-, Finanz- oder sonstige professionelle
              Beratung. Wichtige Angaben sind anhand offizieller Quellen oder
              durch qualifizierte Fachpersonen zu überprüfen.
            </p>

            <p>
              Nutzer sollten nur solche Daten an KI-Funktionen übermitteln, die
              für den jeweiligen Zweck erforderlich sind. Nicht benötigte
              Angaben, insbesondere zu Gesundheit, Religion, politischen
              Ansichten, biometrischen Merkmalen oder anderen besonders
              sensiblen Bereichen, sollen entfernt oder geschwärzt werden.
            </p>
          </Section>

          <Section id="kommunikation" title="9. E-Mail-Kommunikation und Support">
            <p>
              Bei einer Kontaktaufnahme per E-Mail verarbeiten wir die
              übermittelten Kontaktdaten, den Nachrichteninhalt, Anhänge und
              technische Versandinformationen, um die Anfrage zu bearbeiten
              und gegebenenfalls Rückfragen zu beantworten.
            </p>

            <p>
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, wenn die Anfrage
              ein Vertragsverhältnis oder vorvertragliche Maßnahmen betrifft.
              In anderen Fällen erfolgt die Verarbeitung auf Grundlage von
              Art. 6 Abs. 1 lit. f DSGVO. Das berechtigte Interesse liegt in
              ordnungsgemäßer Kommunikation und Dokumentation.
            </p>

            <p>
              Für info@alqev.com wird ein E-Mail-Dienst von Namecheap, Inc.,
              4600 E Washington St, Suite 300, Phoenix, AZ 85034, USA, genutzt.
              Dabei kann eine Verarbeitung in den USA oder anderen
              Drittländern stattfinden.
            </p>

            <p>
              Weitere Informationen:{" "}
              <ExternalLink href="https://www.namecheap.com/legal/general/privacy-policy/">
                Datenschutzerklärung von Namecheap
              </ExternalLink>
              .
            </p>
          </Section>

          <Section id="speicherdauer" title="10. Speicherdauer und Löschung">
            <p>
              Daten werden grundsätzlich nur so lange gespeichert, wie dies für
              den jeweiligen Zweck erforderlich ist. Danach werden sie
              gelöscht oder anonymisiert, sofern keine gesetzlichen
              Aufbewahrungsfristen, berechtigten
              Rechtsverteidigungsinteressen oder technischen Gründe
              entgegenstehen.
            </p>

            <ul className="list-disc space-y-2 pl-6">
              <li>
                Kontodaten werden grundsätzlich für die Dauer des
                Nutzungsverhältnisses gespeichert.
              </li>
              <li>
                Profil-, Prozess- und Dokumentdaten bleiben gespeichert, bis
                sie gelöscht werden, das Konto gelöscht wird oder der Zweck
                entfällt.
              </li>
              <li>
                Support- und E-Mail-Kommunikation kann bis zum Abschluss der
                Anfrage und im Rahmen gesetzlicher Aufbewahrungs- oder
                Verjährungsfristen gespeichert werden.
              </li>
              <li>
                Sicherheits-, Fehler- und Serverprotokolle werden nur so lange
                aufbewahrt, wie sie zur Systemsicherheit, Fehleranalyse oder
                Rechtsverteidigung erforderlich sind.
              </li>
              <li>
                Gesetzlich aufbewahrungspflichtige Geschäftsunterlagen werden
                für die jeweils geltende gesetzliche Dauer gespeichert.
              </li>
            </ul>

            <p>
              Löschanfragen können an{" "}
              <a
                href="mailto:info@alqev.com"
                className="font-medium text-indigo-300 underline decoration-indigo-400/40 underline-offset-4"
              >
                info@alqev.com
              </a>{" "}
              gerichtet werden. Zum Schutz vor unberechtigten Anfragen kann
              eine Identitätsprüfung erforderlich sein.
            </p>
          </Section>

          <Section id="empfaenger" title="11. Empfänger, Auftragsverarbeiter und Drittländer">
            <p>
              Daten werden nur übermittelt, wenn dies zur Leistungserbringung
              erforderlich ist, eine gesetzliche Pflicht besteht, eine
              Einwilligung vorliegt oder eine andere Rechtsgrundlage die
              Übermittlung erlaubt.
            </p>

            <p>Mögliche Empfänger beziehungsweise Dienstleister sind insbesondere:</p>

            <ul className="list-disc space-y-2 pl-6">
              <li>Google/Firebase für Authentifizierung, Datenbank und Dateispeicherung,</li>
              <li>Vercel für Hosting und Bereitstellung der Webanwendung,</li>
              <li>Namecheap für Domain- und E-Mail-Dienste,</li>
              <li>technische KI- oder OCR-Dienstanbieter, soweit aktiviert,</li>
              <li>
                technische Berater oder Dienstleister, soweit dies für
                Wartung, Sicherheit oder Fehlerbehebung erforderlich ist,
              </li>
              <li>
                Behörden, Gerichte oder andere Stellen bei gesetzlicher
                Verpflichtung.
              </li>
            </ul>

            <p>
              Bei Übermittlungen außerhalb des Europäischen Wirtschaftsraums
              wird ein angemessenes Schutzniveau angestrebt. Je nach Empfänger
              erfolgt die Übermittlung auf Grundlage eines
              Angemessenheitsbeschlusses nach Art. 45 DSGVO, geeigneter
              Garantien nach Art. 46 DSGVO, insbesondere
              Standardvertragsklauseln, oder einer Ausnahme nach Art. 49 DSGVO.
            </p>
          </Section>

          <Section id="endgeraet" title="12. Cookies, lokale Speicherung und Endgerätezugriff">
            <p>
              ALQEV kann technisch erforderliche Cookies, lokalen
              Browserspeicher und ähnliche Technologien verwenden. Dazu
              gehören insbesondere Authentifizierungs- und
              Sicherheitsinformationen, Sitzungszustände,
              Spracheinstellungen und lokale Präferenzen.
            </p>

            <p>
              Soweit eine Speicherung oder ein Zugriff auf Informationen im
              Endgerät unbedingt erforderlich ist, um einen ausdrücklich
              gewünschten digitalen Dienst bereitzustellen, erfolgt dies auf
              Grundlage von § 25 Abs. 2 Nr. 2 TDDDG. Die anschließende
              Verarbeitung personenbezogener Daten stützt sich je nach Zweck
              auf Art. 6 Abs. 1 lit. b oder lit. f DSGVO.
            </p>

            <p>
              Derzeit ist kein Einsatz von Werbe-, Marketing- oder
              Reichweitenanalyse-Cookies vorgesehen. Werden künftig
              einwilligungspflichtige Analyse-, Marketing- oder
              Tracking-Technologien eingebunden, erfolgt dies erst nach
              vorheriger Einwilligung. Diese Datenschutzerklärung wird dann
              ergänzt.
            </p>
          </Section>

          <Section id="sicherheit" title="13. Technische und organisatorische Sicherheitsmaßnahmen">
            <p>
              Wir treffen angemessene technische und organisatorische
              Maßnahmen, um Daten vor Verlust, Manipulation, unberechtigter
              Offenlegung und unberechtigtem Zugriff zu schützen. Dazu gehören
              je nach Funktion verschlüsselte Datenübertragung,
              Authentifizierung, rollen- und benutzerbezogene Zugriffsregeln,
              beschränkte Speicherpfade, Dateityp- und Größenbeschränkungen,
              Sicherheitsprotokollierung und Softwareaktualisierungen.
            </p>

            <p>
              Die Plattform verwendet TLS/HTTPS. Ein absoluter Schutz kann bei
              elektronischer Datenverarbeitung dennoch nicht garantiert
              werden. Nutzer sollten starke, einzigartige Passwörter
              verwenden, Zugangsdaten geheim halten und Sitzungen auf
              gemeinsam genutzten Geräten beenden.
            </p>
          </Section>

          <Section id="rechte" title="14. Rechte betroffener Personen">
            <p>
              Betroffene Personen haben im Rahmen der gesetzlichen
              Voraussetzungen insbesondere folgende Rechte:
            </p>

            <ul className="list-disc space-y-2 pl-6">
              <li>Auskunft gemäß Art. 15 DSGVO,</li>
              <li>Berichtigung gemäß Art. 16 DSGVO,</li>
              <li>Löschung gemäß Art. 17 DSGVO,</li>
              <li>Einschränkung der Verarbeitung gemäß Art. 18 DSGVO,</li>
              <li>Datenübertragbarkeit gemäß Art. 20 DSGVO,</li>
              <li>Widerspruch gemäß Art. 21 DSGVO,</li>
              <li>
                Widerruf einer Einwilligung gemäß Art. 7 Abs. 3 DSGVO mit
                Wirkung für die Zukunft,
              </li>
              <li>
                Schutz vor ausschließlich automatisierten Entscheidungen nach
                Art. 22 DSGVO.
              </li>
            </ul>

            <div className="rounded-2xl border border-indigo-400/20 bg-indigo-400/10 p-5">
              <p className="font-semibold text-indigo-100">
                Widerspruch gegen Verarbeitungen aufgrund berechtigter Interessen
              </p>
              <p className="mt-2 text-indigo-100/80">
                Erfolgt eine Verarbeitung auf Grundlage von Art. 6 Abs. 1
                lit. f DSGVO, kann aus Gründen der besonderen Situation
                Widerspruch eingelegt werden. Die Daten werden dann nicht mehr
                verarbeitet, sofern keine zwingenden schutzwürdigen Gründe
                oder Gründe zur Geltendmachung, Ausübung oder Verteidigung von
                Rechtsansprüchen entgegenstehen.
              </p>
            </div>

            <p>
              Zur Ausübung der Rechte genügt eine Nachricht an{" "}
              <a
                href="mailto:info@alqev.com"
                className="font-medium text-indigo-300 underline decoration-indigo-400/40 underline-offset-4"
              >
                info@alqev.com
              </a>
              . Ein geeigneter Identitätsnachweis kann verlangt werden.
            </p>
          </Section>

          <Section id="beschwerde" title="15. Beschwerderecht bei einer Aufsichtsbehörde">
            <p>
              Betroffene Personen haben nach Art. 77 DSGVO das Recht, sich bei
              einer Datenschutzaufsichtsbehörde zu beschweren, insbesondere in
              dem Mitgliedstaat ihres gewöhnlichen Aufenthaltsorts,
              Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes.
            </p>

            <address className="not-italic rounded-2xl border border-white/10 bg-black/20 p-5">
              <strong className="text-white">
                Landesbeauftragte für Datenschutz und Informationsfreiheit
                Nordrhein-Westfalen
              </strong>
              <br />
              Kavalleriestraße 2–4
              <br />
              40213 Düsseldorf
              <br />
              Deutschland
              <br />
              <ExternalLink href="https://www.ldi.nrw.de/">
                www.ldi.nrw.de
              </ExternalLink>
            </address>
          </Section>

          <Section id="bereitstellung" title="16. Pflicht zur Bereitstellung von Daten">
            <p>
              Bestimmte Daten sind erforderlich, um ein Benutzerkonto
              anzulegen und gewünschte Funktionen zu nutzen. Ohne diese Angaben
              können Registrierung, Anmeldung, Prozessverwaltung,
              Dokumentenspeicherung oder personalisierte Funktionen nicht oder
              nur eingeschränkt angeboten werden.
            </p>

            <p>
              Optionale Angaben sind als solche erkennbar oder ergeben sich aus
              dem Kontext. Nutzer entscheiden grundsätzlich selbst, welche
              freiwilligen Inhalte, Notizen und Dokumente sie bereitstellen.
            </p>
          </Section>

          <Section id="automatisierung" title="17. Automatisierte Auswertungen und Entscheidungen">
            <p>
              ALQEV kann automatisierte Priorisierungen, Risikohinweise,
              Fortschrittswerte und Empfehlungen erzeugen. Diese dienen der
              Orientierung und Organisation. Sie entfalten keine rechtliche
              Wirkung und stellen grundsätzlich keine ausschließlich
              automatisierte Entscheidung mit rechtlicher oder ähnlich
              erheblicher Wirkung im Sinne von Art. 22 DSGVO dar.
            </p>

            <p>
              Werden künftig Funktionen eingeführt, die solche Wirkungen
              entfalten können, werden vor ihrer Aktivierung die erforderlichen
              Informationen, Schutzmaßnahmen und gegebenenfalls Einwilligungen
              bereitgestellt.
            </p>
          </Section>

          <Section id="aenderungen" title="18. Änderungen dieser Datenschutzerklärung">
            <p>
              Diese Datenschutzerklärung wird angepasst, wenn sich Rechtslage,
              Plattformfunktionen, eingesetzte Dienstleister oder
              Datenverarbeitungen ändern. Es gilt die jeweils auf dieser Seite
              veröffentlichte Fassung.
            </p>

            <p>
              Änderungen, die eine neue Einwilligung erfordern, werden nicht
              allein durch Aktualisierung dieses Textes wirksam. In diesem Fall
              wird eine gesonderte Einwilligung eingeholt.
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