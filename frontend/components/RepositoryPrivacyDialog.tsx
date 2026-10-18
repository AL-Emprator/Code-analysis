
"use client";

import { useState } from "react";
import Link from "next/link";

type RepositoryPrivacyDialogProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
};

export default function RepositoryPrivacyDialog({
  open,
  onCancel,
  onConfirm,
  loading = false,
}: RepositoryPrivacyDialogProps) {
  const [confirmed, setConfirmed] = useState(false);

  if (!open) return null;

  function handleConfirm() {
    if (!confirmed || loading) return;
    onConfirm();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="repository-privacy-title"
        aria-describedby="repository-privacy-description"
        className="w-full max-w-xl rounded-3xl border border-cyan-400/20 bg-slate-950 p-6 shadow-2xl sm:p-8"
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="rounded-xl bg-cyan-400/10 p-3 text-xl">
            🛡️
          </span>
          <div>
            <h2
              id="repository-privacy-title"
              className="text-xl font-semibold text-white"
            >
              Hinweis zum Repository-Zugriff
            </h2>
            <p className="text-xs text-slate-400">
              Datenschutz und Sicherheitsanalyse
            </p>
          </div>
        </div>

        <p
          id="repository-privacy-description"
          className="mb-5 text-sm leading-6 text-slate-300"
        >
          Bevor du eine Analyse startest, möchten wir dich
          darüber informieren, wie deine Repository-Daten
          verarbeitet werden.
        </p>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          <div>
            <h3 className="font-semibold text-white">
              1. Repository herunterladen
            </h3>
            <p className="mt-1">
              Das ausgewählte GitHub-Repository wird auf
              unseren Server kopiert.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-white">
              2. Quellcode analysieren
            </h3>
            <p className="mt-1">
              Der Quellcode wird mit eigenen Sicherheitsregeln
              und Semgrep auf mögliche Schwachstellen untersucht.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-white">
              3. Ergebnisse speichern
            </h3>
            <p className="mt-1">
              Repository-Kopien, Analyse-Jobs und Ergebnisse
              werden gespeichert. Gespeicherte Analysen
              kannst du über deine Profilseite löschen.
            </p>
          </div>
        </div>

        <label className="mt-6 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-1 h-4 w-4 accent-cyan-400"
          />

          <span className="text-sm leading-6 text-slate-300">
            Ich habe die Hinweise zur Datenverarbeitung
            gelesen und verstanden. Ich bin berechtigt,
            dieses Repository analysieren zu lassen.
          </span>
        </label>

        <Link
          href="/datenschutz"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-sm text-cyan-300 underline underline-offset-4 hover:text-cyan-200"
        >
          Vollständige Datenschutzinformationen
        </Link>

        <div className="mt-7 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-slate-200 hover:bg-white/10 disabled:opacity-50"
          >
            Abbrechen
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!confirmed || loading}
            className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading
              ? "Analyse wird gestartet..."
              : "Verstanden – Analyse starten"}
          </button>
        </div>
      </section>
    </div>
  );
}
