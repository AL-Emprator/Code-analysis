
import Link from "next/link";
import { owaspTopics } from "../../lib/owaspTop10";

export const metadata = {
  title: "OWASP Top 10 | Code Analysis Platform",
  description:
    "Die OWASP Top 10 Sicherheitsrisiken einfach erklärt.",
};

export default function OwaspTop10Page() {
  return (
    <main className="min-h-screen bg-[#080e20] px-5 py-14 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="text-sm text-cyan-300 hover:text-cyan-200"
        >
          ← Zur Startseite
        </Link>

        <div className="mt-10">
          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-cyan-300">
            Security Knowledge Base
          </span>

          <h1 className="mt-7 text-4xl font-bold tracking-tight sm:text-5xl">
            OWASP Top 10{" "}
            <span className="text-cyan-300">2025</span>
          </h1>

          <p className="mt-4 max-w-3xl text-slate-300">
            Entdecke die zehn wichtigsten Sicherheitsrisiken
            für Webanwendungen und erfahre, wie du deine
            Anwendungen besser schützen kannst.
          </p>

          <p className="mt-3 max-w-3xl text-sm text-slate-400">
            Unsere Code Analysis Platform verwendet eigene
            Security-Regeln und Semgrep. Nicht alle OWASP-Kategorien
            werden von unserem Scanner vollständig abgedeckt.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {owaspTopics.map((topic) => (
            <Link
              key={topic.id}
              href={`/owasp-top-10/${topic.slug}`}
              className="group rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition duration-200 hover:-translate-y-1 hover:border-cyan-400/40 hover:bg-cyan-400/[0.05]"
            >
              <div className="flex items-start justify-between">
                <span className="font-mono text-sm font-bold text-cyan-300">
                  {topic.id}
                </span>

                <span className="text-xl text-slate-400 transition group-hover:text-cyan-300">
                  ↗
                </span>
              </div>

              <h2 className="mt-4 text-xl font-semibold text-white">
                {topic.title}
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {topic.english}
              </p>

              <p className="mt-4 text-sm leading-6 text-slate-300">
                {topic.description}
              </p>

              <div className="mt-6 border-t border-white/10 pt-4">
                <p className="text-xs text-cyan-200">
                  {topic.ruleExamples.length > 0
                    ? "Beispielregeln im Analyzer vorhanden"
                    : "Keine spezifische Regelabdeckung bestätigt"}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-slate-400">
            Die Informationen basieren auf der offiziellen{" "}
            <a
              href="https://top10.owasp.org/2025/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-300 underline underline-offset-4"
            >
              OWASP Top 10:2025
            </a>
            . Die Erklärungen wurden vereinfacht.
          </p>
        </div>
      </div>
    </main>
  );
}
