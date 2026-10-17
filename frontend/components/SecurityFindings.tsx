
"use client";

import { useState } from "react";
import type { SecurityFinding } from "../lib/api";

type Props = {
  findings: SecurityFinding[];
};

const severityStyles: Record<string, string> = {
  CRITICAL: "border-rose-500/40 bg-rose-500/15 text-rose-300",
  HIGH: "border-orange-500/40 bg-orange-500/15 text-orange-300",
  MEDIUM: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  LOW: "border-blue-500/40 bg-blue-500/15 text-blue-300",
  INFO: "border-slate-500/40 bg-slate-500/15 text-slate-300",
};

const severityOrder: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFO: 4,
};

function displayFilePath(path: string | null): string {
  if (!path) return "Unbekannte Datei";

  // Remove the internal repository storage prefix.
  return path
    .replace(/\\/g, "/")
    .replace(/^.*\/repos\/[^/]+\//, "")
    .replace(/^\.\//, "");
}

function getCweUrl(cwe: string): string | null {
  const match = cwe.match(/CWE-(\d+)/i);

  if (!match) return null;

  return `https://cwe.mitre.org/data/definitions/${match[1]}.html`;
}

function FindingCard({ finding }: { finding: SecurityFinding }) {
  const [expanded, setExpanded] = useState(false);

  const severity = finding.severity?.toUpperCase() || "INFO";

  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70">
      <div className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              severityStyles[severity] ?? severityStyles.INFO
            }`}
          >
            {severity}
          </span>

          <span className="text-xs text-slate-400">
            {finding.start_line != null
              ? `Zeile ${finding.start_line}`
              : "Zeile unbekannt"}
          </span>
        </div>

        <h3 className="mt-4 text-lg font-semibold text-white">
          {finding.title || "Security Finding"}
        </h3>

        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">
          {finding.message}
        </p>

        <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/70 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Betroffene Datei
          </p>

          <p className="mt-2 break-all font-mono text-xs text-cyan-200">
            {displayFilePath(finding.file_path)}
          </p>
        </div>

        {finding.code && (
          <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
            <div className="bg-white/5 px-4 py-2 text-xs font-semibold text-slate-400">
              Betroffener Code
            </div>

            <pre className="overflow-x-auto bg-slate-950 p-4 text-xs leading-6 text-slate-200">
              <code>{finding.code}</code>
            </pre>
          </div>
        )}

        <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
          <h4 className="text-sm font-semibold text-emerald-300">
            Empfohlene Lösung
          </h4>

          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">
            {finding.recommendation ||
              "Überprüfe den betroffenen Code und die Sicherheitsregel."}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(finding.cwe ?? []).map((cwe) => {
            const url = getCweUrl(cwe);

            return url ? (
              <a
                key={cwe}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-cyan-200 hover:bg-white/10"
              >
                {cwe}
              </a>
            ) : (
              <span
                key={cwe}
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300"
              >
                {cwe}
              </span>
            );
          })}

          {(finding.owasp ?? []).map((owasp) => (
            <span
              key={owasp}
              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300"
            >
              {owasp}
            </span>
          ))}
        </div>

        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
          className="mt-5 text-sm font-medium text-cyan-300 hover:text-cyan-200"
        >
          {expanded ? "Technische Details ausblenden ↑" : "Technische Details anzeigen ↓"}
        </button>

        {expanded && (
          <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-slate-900/60 p-4 text-xs text-slate-300">
            <p>
              <strong>Scanner:</strong> {finding.tool}
            </p>

            <p className="break-all">
              <strong>Rule ID:</strong> {finding.rule_id}
            </p>

            <p>
              <strong>Original Severity:</strong>{" "}
              {finding.original_severity ?? "Unbekannt"}
            </p>

            <p>
              <strong>Confidence:</strong>{" "}
              {finding.confidence ?? "Nicht angegeben"}
            </p>

            <p>
              <strong>Kategorie:</strong>{" "}
              {finding.category ?? "Nicht angegeben"}
            </p>

            {finding.sources && finding.sources.length > 0 && (
              <p className="break-all">
                <strong>Quellen:</strong> {finding.sources.join(", ")}
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export default function SecurityFindings({ findings }: Props) {
  const [filter, setFilter] = useState("ALL");

  const sortedFindings = [...findings].sort(
    (a, b) =>
      (severityOrder[a.severity?.toUpperCase()] ?? 4) -
      (severityOrder[b.severity?.toUpperCase()] ?? 4)
  );

  const filteredFindings =
    filter === "ALL"
      ? sortedFindings
      : sortedFindings.filter(
          (finding) => finding.severity?.toUpperCase() === filter
        );

  if (findings.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-slate-950/50 p-5">
        <p className="text-sm text-slate-400">
          Keine Semgrep-Findings für diese Analyse gespeichert.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Sicherheitsprobleme
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            {findings.length} Semgrep-Finding(s) gefunden
          </p>
        </div>

        <select
          aria-label="Nach Schweregrad filtern"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-sm text-white"
        >
          <option value="ALL">Alle Schweregrade</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
          <option value="INFO">Info</option>
        </select>
      </div>

      <div className="grid gap-4">
        {filteredFindings.map((finding, index) => (
          <FindingCard
            key={`${finding.id}-${finding.rule_id}-${index}`}
            finding={finding}
          />
        ))}
      </div>

      {filteredFindings.length === 0 && (
        <p className="text-sm text-slate-400">
          Keine Findings mit diesem Schweregrad.
        </p>
      )}
    </section>
  );
}

