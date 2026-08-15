"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  getAnalysisJob,
  getAnalysisJobFiles,
  getAnalysisResult,
  startFileAnalysis,
  type AnalysisFile,
  type AnalysisJobResponse,
  type AnalysisJobStatus,
  type AnalysisResultResponse,
} from "../../../lib/api";

function getStatusLabel(status: AnalysisJobStatus) {
  switch (status) {
    case "queued":
      return "Wartet auf Verarbeitung";
    case "cloning":
      return "Repository wird geklont";
    case "indexing":
      return "Dateien werden indexiert";
    case "ready_for_selection":
      return "Bereit zur Dateiauswahl";
    case "running":
      return "Analyse l채uft";
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
    case "ready_for_selection":
      return "border-indigo-500/30 bg-indigo-500/10 text-indigo-200";
    case "cloning":
    case "indexing":
      return "border-sky-500/30 bg-sky-500/10 text-sky-200";
    case "queued":
    default:
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  }
}

function getProgressClasses(status: AnalysisJobStatus) {
  switch (status) {
    case "queued":
      return "w-1/6";
    case "cloning":
      return "w-1/3";
    case "indexing":
      return "w-1/2";
    case "ready_for_selection":
      return "w-2/3";
    case "running":
      return "w-5/6";
    case "completed":
    case "failed":
    default:
      return "w-full";
  }
}

function shouldStopPolling(
  status: AnalysisJobStatus,
  analysisWasStarted: boolean
) {
  return (
    status === "completed" ||
    status === "failed" ||
    (status === "ready_for_selection" && !analysisWasStarted)
  );
}

export default function AnalysisDashboardPage() {
  const params = useParams<{ jobId: string }>();
  const router = useRouter();
  const jobId = params.jobId;

  const [job, setJob] = useState<AnalysisJobResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [files, setFiles] = useState<AnalysisFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState("");
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [filesErrorMessage, setFilesErrorMessage] = useState<string | null>(
    null
  );

  const [analysisResult, setAnalysisResult] =
    useState<AnalysisResultResponse | null>(null);
  const [isStartingAnalysis, setIsStartingAnalysis] = useState(false);
  const [isLoadingResult, setIsLoadingResult] = useState(false);
  const [analysisErrorMessage, setAnalysisErrorMessage] = useState<
    string | null
  >(null);
  const [analysisWasStarted, setAnalysisWasStarted] = useState(false);

  useEffect(() => {
    if (!jobId) {
      setErrorMessage("Die Job-ID fehlt.");
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function loadJob() {
      try {
        setErrorMessage(null);

        const response = await getAnalysisJob(jobId);

        if (isCancelled) {
          return;
        }

        setJob(response);

        if (response.status === "completed" || response.status === "failed") {
          setAnalysisWasStarted(false);
        }

        if (!shouldStopPolling(response.status, analysisWasStarted)) {
          timeoutId = setTimeout(() => {
            void loadJob();
          }, 3000);
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
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadJob();

    return () => {
      isCancelled = true;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [analysisWasStarted, jobId]);

  useEffect(() => {
    if (!jobId || job?.status !== "ready_for_selection") {
      setFiles([]);
      setSelectedFileId("");
      setFilesErrorMessage(null);
      return;
    }

    let isCancelled = false;

    async function loadFiles() {
      try {
        setIsLoadingFiles(true);
        setFilesErrorMessage(null);

        const response = await getAnalysisJobFiles(jobId);

        if (isCancelled) {
          return;
        }

        setFiles(response.files);
        setSelectedFileId(
          response.files.length > 0 ? String(response.files[0].id) : ""
        );
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setFilesErrorMessage(
          error instanceof Error
            ? error.message
            : "Dateien konnten nicht geladen werden."
        );
      } finally {
        if (!isCancelled) {
          setIsLoadingFiles(false);
        }
      }
    }

    void loadFiles();

    return () => {
      isCancelled = true;
    };
  }, [jobId, job?.status]);

  useEffect(() => {
    if (!jobId || job?.status !== "completed") {
      return;
    }

    let isCancelled = false;

    async function loadResult() {
      try {
        setIsLoadingResult(true);
        setAnalysisErrorMessage(null);

        const result = await getAnalysisResult(jobId);

        if (!isCancelled) {
          setAnalysisResult(result);
        }
      } catch (error) {
        if (!isCancelled) {
          setAnalysisErrorMessage(
            error instanceof Error
              ? error.message
              : "Das Analyse-Ergebnis konnte nicht geladen werden."
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingResult(false);
        }
      }
    }

    void loadResult();

    return () => {
      isCancelled = true;
    };
  }, [jobId, job?.status]);

  async function handleStartAnalysis() {
    if (!jobId || !selectedFileId || isStartingAnalysis) {
      return;
    }

    const fileId = Number(selectedFileId);

    if (!Number.isInteger(fileId)) {
      setAnalysisErrorMessage("Die ausgew채hlte Datei-ID ist ung체ltig.");
      return;
    }

    try {
      setIsStartingAnalysis(true);
      setAnalysisErrorMessage(null);
      setAnalysisResult(null);

      await startFileAnalysis(jobId, fileId);

      // Hide the selection immediately and restart status polling.
      setJob((currentJob) =>
        currentJob
          ? {
              ...currentJob,
              status: "running",
            }
          : currentJob
      );
      setAnalysisWasStarted(true);
    } catch (error) {
      setAnalysisWasStarted(false);
      setAnalysisErrorMessage(
        error instanceof Error
          ? error.message
          : "Analyse konnte nicht gestartet werden."
      );
    } finally {
      setIsStartingAnalysis(false);
    }
  }

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
            Zur체ck zur Startseite
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
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
              <span className="text-slate-300">Aktueller Status</span>
              <span className="font-medium text-white">
                {getStatusLabel(job.status)}
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all ${getProgressClasses(
                  job.status
                )}`}
              />
            </div>

            {job.status === "queued" && (
              <p className="text-sm leading-6 text-slate-400">
                Der Job wurde erstellt und wartet darauf, vom Analyzer
                verarbeitet zu werden.
              </p>
            )}

            {job.status === "cloning" && (
              <p className="text-sm leading-6 text-slate-400">
                Das Repository wird momentan geklont.
              </p>
            )}

            {job.status === "indexing" && (
              <p className="text-sm leading-6 text-slate-400">
                Die Dateien des Repositorys werden momentan indexiert.
              </p>
            )}

            {job.status === "ready_for_selection" && (
              <p className="text-sm leading-6 text-indigo-200">
                Das Repository ist indexiert. W채hle unten eine Datei aus.
              </p>
            )}

            {job.status === "running" && (
              <p className="text-sm leading-6 text-slate-400">
                Die ausgew채hlte Datei wird momentan analysiert.
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

        {analysisErrorMessage && (
          <div className="mt-8 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-100">
            {analysisErrorMessage}
          </div>
        )}

        {job.status === "ready_for_selection" && (
          <section className="mt-8 rounded-3xl border border-white/10 bg-slate-950/80 p-6 backdrop-blur-xl sm:p-8">
            <h2 className="text-xl font-semibold text-white">
              Datei zur Analyse ausw채hlen
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Das Repository wurde indexiert. W채hle jetzt eine Datei aus, die
              analysiert werden soll.
            </p>

            {filesErrorMessage ? (
              <p className="mt-6 text-sm text-rose-200">{filesErrorMessage}</p>
            ) : isLoadingFiles ? (
              <p className="mt-6 text-sm text-slate-300">
                Dateien werden geladen...
              </p>
            ) : files.length === 0 ? (
              <p className="mt-6 text-sm text-amber-200">
                Es wurden keine analysierbaren Dateien gefunden.
              </p>
            ) : (
              <div className="mt-6 space-y-4">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-200">
                    Datei ausw채hlen
                  </span>

                  <select
                    value={selectedFileId}
                    onChange={(event) => setSelectedFileId(event.target.value)}
                    disabled={isStartingAnalysis}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/60 focus:ring-4 focus:ring-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {files.map((file) => (
                      <option key={file.id} value={String(file.id)}>
                        {file.path}
                        {file.language ? ` �� ${file.language}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={() => void handleStartAnalysis()}
                  disabled={!selectedFileId || isStartingAnalysis}
                  className="rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 px-5 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isStartingAnalysis
                    ? "Analyse wird gestartet..."
                    : "Ausgew채hlte Datei analysieren"}
                </button>
              </div>
            )}
          </section>
        )}

        {isLoadingResult && (
          <section className="mt-8 rounded-3xl border border-white/10 bg-slate-950/80 p-6 sm:p-8">
            <p className="text-sm text-slate-300">
              Analyse-Ergebnis wird geladen...
            </p>
          </section>
        )}

        {analysisResult && (
          <section className="mt-8 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white">
              Analyse-Ergebnis
            </h2>

            <p className="mt-2 text-sm text-slate-300">
              Datei: {analysisResult.filePath}
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <h3 className="font-semibold text-white">Zusammenfassung</h3>
                <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                  {analysisResult.summary}
                </pre>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <h3 className="font-semibold text-white">
                  Gefundene Hinweise
                </h3>
                <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                  {analysisResult.issues}
                </pre>
              </div>
            </div>
          </section>
        )}

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
