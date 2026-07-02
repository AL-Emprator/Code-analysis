"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  getAnalysisJob,
  type AnalysisJobResponse,
  type AnalysisJobStatus,
} from "../../../lib/api";

function getStatusLabel(status: AnalysisJobStatus) {
  switch (status) {
    case "queued":
      return "Wartet auf Verarbeitung";

    case "running":
      return "Analyse läuft";

    case "completed":
      return "Analyse abgeschlossen";

    case "failed":
      return "Analyse fehlgeschlagen";

    default:
      return status;
  }
}

function getStatusClasses(status: AnalysisJobStatus) {
  switch (status) {
    case "completed":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";

    case "failed":
      return "border-rose-500/30 bg-rose-500/10 text-rose-200";

    case "running":
      return "border-cyan-500/30 bg-cyan-500/10 text-cyan-200";

    case "queued":
    default:
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  }
}

export default function AnalysisDashboardPage() {
  const params = useParams<{ jobId: string }>();
  const router = useRouter();

  const jobId = params.jobId;

  const [job, setJob] = useState<AnalysisJobResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  //Solange der Job noch läuft, sollte das Dashboard regelmäßig den Status neu laden.
    useEffect(() => {
    if (!jobId) {
        setErrorMessage("Die Job-ID fehlt.");
        setIsLoading(false);
        return;
    }

    let intervalId: ReturnType<typeof setInterval> | null = null;
    let isCancelled = false;

    async function loadJob() {
        try {
        setErrorMessage(null);

        const response = await getAnalysisJob(jobId);

        if (isCancelled) {
            return;
        }

        setJob(response);

        if (
            response.status === "completed" ||
            response.status === "failed"
        ) {
            if (intervalId) {
            clearInterval(intervalId);
            }
        }
        } catch (error) {
        if (isCancelled) {
            return;
        }

        setErrorMessage(
            error instanceof Error
            ? error.message
            : "Der Analyse-Job konnte nicht geladen werden."
        );

        if (intervalId) {
            clearInterval(intervalId);
        }
        } finally {
        if (!isCancelled) {
            setIsLoading(false);
        }
        }
    }

    void loadJob();

    intervalId = setInterval(() => {
        void loadJob();
    }, 3000);

    return () => {
        isCancelled = true;

        if (intervalId) {
        clearInterval(intervalId);
        }
    };
    }, [jobId]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-cyan-400/20 border-t-cyan-400" />

          <p className="mt-4 text-sm text-slate-300">
            Analyse-Job wird geladen...
          </p>
        </div>
      </main>
    );
  }

  if (errorMessage || !job) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="w-full max-w-lg rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6">
          <h1 className="text-xl font-semibold">
            Job konnte nicht geladen werden
          </h1>

          <p className="mt-3 text-sm text-rose-100">
            {errorMessage ?? "Unbekannter Fehler"}
          </p>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-6 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Zurück zur Startseite
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.16),_transparent_28%),linear-gradient(to_bottom_right,_rgba(15,23,42,1),_rgba(2,6,23,1))]" />

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-cyan-300">
              Analysis Dashboard
            </p>

            <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
              {job.repositoryOwner}/{job.repositoryName}
            </h1>

            <a
              href={job.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm text-slate-300 underline decoration-white/20 underline-offset-4 hover:text-white"
            >
              {job.repoUrl}
            </a>
          </div>

          <div
            className={`inline-flex rounded-full border px-4 py-2 text-sm font-medium ${getStatusClasses(
              job.status
            )}`}
          >
            {getStatusLabel(job.status)}
          </div>
        </div>

        <section className="mt-10 grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-slate-400">Job-ID</p>

            <p className="mt-2 break-all font-mono text-sm text-white">
              {job.jobId}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-slate-400">Repository</p>

            <p className="mt-2 font-medium text-white">
              {job.repositoryOwner}/{job.repositoryName}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-slate-400">Erstellt am</p>

            <p className="mt-2 font-medium text-white">
              {new Date(job.createdAt).toLocaleString("de-DE")}
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-950/80 p-6 backdrop-blur-xl sm:p-8">
          <h2 className="text-xl font-semibold text-white">
            Analysefortschritt
          </h2>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300">
                Aktueller Status
              </span>

              <span className="font-medium text-white">
                {getStatusLabel(job.status)}
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all ${
                  job.status === "queued"
                    ? "w-1/4"
                    : job.status === "running"
                      ? "w-2/3"
                      : "w-full"
                }`}
              />
            </div>

            {job.status === "queued" && (
              <p className="text-sm leading-6 text-slate-400">
                Der Job wurde erstellt und wartet darauf, vom Analyzer
                verarbeitet zu werden.
              </p>
            )}

            {job.status === "running" && (
              <p className="text-sm leading-6 text-slate-400">
                Das Repository wird momentan analysiert.
              </p>
            )}

            {job.status === "completed" && (
              <p className="text-sm leading-6 text-emerald-200">
                Die Analyse wurde erfolgreich abgeschlossen.
              </p>
            )}

            {job.status === "failed" && (
              <p className="text-sm leading-6 text-rose-200">
                {job.errorMessage ??
                  "Die Analyse konnte nicht abgeschlossen werden."}
              </p>
            )}
          </div>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Neues Repository einreichen
          </button>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 px-5 py-3 text-sm font-semibold text-slate-950"
          >
            Status aktualisieren
          </button>
        </div>
      </div>
    </main>
  );
}

