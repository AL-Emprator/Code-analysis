import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getOwaspTopic,
  owaspTopics,
} from "../../../lib/owaspTop10";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return owaspTopics.map((topic) => ({
    slug: topic.slug,
  }));
}

export default async function OwaspDetailPage({
  params,
}: Props) {
  const { slug } = await params;

  const topic = getOwaspTopic(slug);

  if (!topic) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#080e20] px-5 py-14 text-slate-100">
      <article className="mx-auto max-w-3xl">
        <Link
          href="/owasp-top-10"
          className="text-sm font-medium text-cyan-300 hover:text-cyan-200"
        >
          ← Alle Sicherheitsrisiken
        </Link>

        <div className="mt-10">
          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 font-mono text-xs font-semibold text-cyan-300">
            {topic.id}
          </span>

          <h1 className="mt-7 text-3xl font-bold sm:text-4xl">
            {topic.title}
          </h1>

          <p className="mt-3 text-slate-400">
            {topic.english}
          </p>
        </div>

        <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-xl font-semibold text-white">
            Was bedeutet diese Schwachstelle?
          </h2>

          <p className="mt-4 leading-7 text-slate-300">
            {topic.description}
          </p>
        </section>

        <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-xl font-semibold text-white">
            Einfaches Beispiel
          </h2>

          <p className="mt-4 leading-7 text-slate-300">
            {topic.example}
          </p>
        </section>

        <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-xl font-semibold text-white">
            Wie kann ich mich schützen?
          </h2>

          <ul className="mt-4 list-disc space-y-3 pl-5 text-slate-300">
            {topic.protection.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.04] p-6">
          <h2 className="text-xl font-semibold text-white">
            Erkennung durch unsere Security-Regeln
          </h2>

          <p className="mt-4 leading-7 text-slate-300">
            {topic.coverage}
          </p>

          {topic.ruleExamples.length > 0 && (
            <div className="mt-5 space-y-2">
              <h3 className="text-sm font-semibold text-cyan-300">
                Vorhandene Regelbeispiele
              </h3>

              {topic.ruleExamples.map((rule) => (
                <div
                  key={rule}
                  className="rounded-lg border border-white/10 bg-slate-950 p-3 font-mono text-xs text-slate-200"
                >
                  {rule}
                </div>
              ))}
            </div>
          )}

          <p className="mt-5 text-xs leading-5 text-slate-400">
            Die Regelbeispiele stellen keine vollständige
            OWASP-Abdeckung dar. Auch bei einem Scan ohne
            Findings können Sicherheitsprobleme bestehen.
          </p>
        </section>

        <div className="mt-10 flex flex-wrap gap-4">
          <a
            href={topic.owaspUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Offizielle OWASP-Dokumentation ↗
          </a>

          <Link
            href="/owasp-top-10"
            className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
          >
            Zur Übersicht
          </Link>
        </div>
      </article>
    </main>
  );
}
