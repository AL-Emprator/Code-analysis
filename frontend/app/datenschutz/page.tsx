
import Link from "next/link";

export const metadata = {
  title: "Datenschutz | Code Analysis Platform",
};

export default function DatenschutzPage() {
  return (
    <main className="min-h-screen bg-[#080e20] px-5 py-12 text-slate-200">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="text-sm text-cyan-300 hover:text-cyan-200"
        >
          ← Zurück zur Startseite
        </Link>

        <h1 className="mt-8 text-3xl font-bold text-white">
          Datenschutzinformationen
        </h1>

        <p className="mt-4 text-sm leading-7 text-slate-400">
          Hier informieren wir darüber, wie die Code Analysis
          Platform personenbezogene Daten und Repository-Inhalte
          verarbeitet.
        </p>

        <div className="mt-8 space-y-8">
          <Section title="1. Verantwortliche Stelle">
            SOP TEAM GmbH
          </Section>

          <Section title="2. GitHub-Anmeldung">
            Die Plattform nutzt GitHub OAuth zur Anmeldung.
            Dabei können Profilinformationen wie GitHub-ID,
            Benutzername, E-Mail-Adresse und Profilbild
            verarbeitet werden. Ein GitHub Access Token
            wird für autorisierte GitHub-API-Zugriffe verwendet.
          </Section>

          <Section title="3. Repository-Analyse">
            Bei einer Analyse wird das ausgewählte Repository
            heruntergeladen. Der Quellcode wird automatisiert
            mit eigenen Sicherheitsregeln und Semgrep untersucht.
            Dabei können Sicherheitsbefunde und Ausschnitte
            des Quellcodes gespeichert werden.
          </Section>

          <Section title="4. Speicherung">
            Analyse-Jobs, Dateimetadaten und Ergebnisse werden
            in einer Datenbank gespeichert. Geklonte
            Repository-Dateien werden separat gespeichert.

            [Hosting-Ort, Zugriffsberechtigungen, Verschlüsselung
            und tatsächlich geltende Aufbewahrungsdauer ergänzen.]
          </Section>

          <Section title="5. Externe Dienste">
            Für die Anmeldung und den Repository-Zugriff wird
            GitHub genutzt.

            [Prüfen und ergänzen, ob weitere externe Dienste
            Daten erhalten, insbesondere bei Semgrep-Regeln,
            Updates, Telemetrie oder gehosteten Scans.]
          </Section>

          <Section title="6. Löschen von Analysen">
            Analyse-Jobs können über die Profilseite gelöscht
            werden. Dabei sollen die zugehörigen Datenbankeinträge
            und lokal geklonten Repository-Dateien entfernt werden.

            [Tatsächliches Löschverhalten, Backups und
            Aufbewahrungsfristen überprüfen und ergänzen.]
          </Section>

          <Section title="7. Rechtsgrundlage">
            [Rechtsgrundlage für jede Datenverarbeitung nach
            Art. 6 DSGVO bestimmen und ergänzen.]
          </Section>

          <Section title="8. Datenschutzrechte">
            [Informationen zu Auskunft, Berichtigung, Löschung,
            Einschränkung, Datenübertragbarkeit, Widerspruch,
            gegebenenfalls Widerruf und Beschwerderecht
            sowie Kontaktmöglichkeiten ergänzen.]
          </Section>
        </div>

        <div className="mt-10 border-t border-white/10 pt-5">
          <p className="text-xs text-amber-300">
            Entwicklungsvorlage: Vor öffentlicher Bereitstellung
            müssen die Platzhalter ergänzt und die Angaben
            rechtlich sowie technisch geprüft werden.
          </p>
        </div>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="text-lg font-semibold text-white">
        {title}
      </h2>

      <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-300">
        {children}
      </div>
    </section>
  );
}
