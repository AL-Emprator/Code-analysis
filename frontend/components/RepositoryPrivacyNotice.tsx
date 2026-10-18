
"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  compact?: boolean;
};

export default function RepositoryPrivacyNotice({
  compact = false,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section
      aria-label="Datenschutzhinweis zur Repository-Analyse"
      className="rounded-2xl border border-cyan-400/20 bg-cyan-950/10 p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-white">
            Datenschutz & Repository-Zugriff
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-300">
            Wenn du eine Analyse startest, wird das ausgewählte
            GitHub-Repository auf unseren Server kopiert und
            automatisch auf mögliche Sicherheitsprobleme untersucht.
            Dabei werden Quellcode und Analyseergebnisse verarbeitet
            und gespeichert.
          </p>

          {!compact && (
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Bitte analysiere nur Repositories, für die du die
              erforderliche Berechtigung besitzt.
            </p>
          )}

          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
            className="mt-3 text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
          >
            {expanded
              ? "Weniger anzeigen ↑"
              : "Was passiert mit meinen Daten? ↓"}
          </button>

          {expanded && (
            <div className="mt-4 space-y-3 border-t border-white/10 pt-4 text-sm leading-6 text-slate-300">
              <p>
                <strong className="text-white">
                  Repository-Zugriff:
                </strong>{" "}
                Die Plattform lädt das ausgewählte Repository
                herunter und analysiert dessen Dateien.
              </p>

              <p>
                <strong className="text-white">
                  Datenspeicherung:
                </strong>{" "}
                Analyse-Jobs, Dateiinformationen und erkannte
                Sicherheitsprobleme werden in der Datenbank
                gespeichert. Geklonte Repository-Dateien werden
                separat abgelegt.
              </p>

              <p>
                <strong className="text-white">
                  Löschen:
                </strong>{" "}
                Deine gespeicherten Analyse-Jobs kannst du
                über die Profilseite löschen.
              </p>

              <p>
                <strong className="text-white">
                  GitHub:
                </strong>{" "}
                Für die Anmeldung und den Zugriff auf deine
                verfügbaren Repositories nutzt die Plattform
                GitHub OAuth.
              </p>
            </div>
          )}

          <Link
            href="/datenschutz"
            className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-cyan-300 underline underline-offset-4 hover:text-cyan-200"
          >
            Vollständige Datenschutzinformationen
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
