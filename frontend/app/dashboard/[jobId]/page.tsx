"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  getAnalysisJob,
  getAnalysisJobFiles,
  getAnalysisResult,
  startFileAnalysis,
  prepareNextAnalysis,
  type AnalysisFile,
  type AnalysisJobResponse,
  type AnalysisJobStatus,
  type AnalysisResultResponse,
} from "../../../lib/api";

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

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
    case "analyzing":
      return "Analyse läuft";
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

function getStatusDescription(
  status: AnalysisJobStatus,
  errorMessage?: string | null
) {
  switch (status) {
    case "queued":
      return "Der Job wurde erstellt und wartet darauf, vom Analyzer verarbeitet zu werden.";
    case "cloning":
      return "Das Repository wird momentan geklont.";
    case "indexing":
      return "Die Dateien des Repositorys werden momentan indexiert.";
    case "ready_for_selection":
      return "Das Repository ist indexiert. Wähle unten eine Datei aus.";
    case "analyzing":
    case "running":
      return "Die ausgewählte Datei wird momentan analysiert.";
    case "completed":
      return "Die Analyse wurde erfolgreich abgeschlossen.";
    case "failed":
      return errorMessage ?? "Die Analyse konnte nicht abgeschlossen werden.";
    default:
      return "";
  }
}

function getStatusClasses(status: AnalysisJobStatus) {
  switch (status) {
    case "completed":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    case "failed":
      return "border-rose-500/30 bg-rose-500/10 text-rose-200";
    case "analyzing":
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

function getStatusDotClasses(status: AnalysisJobStatus) {
  switch (status) {
    case "completed":
      return "bg-emerald-400";
    case "failed":
      return "bg-rose-400";
    case "analyzing":
    case "running":
      return "bg-cyan-400 animate-pulse";
    case "ready_for_selection":
      return "bg-indigo-400";
    case "cloning":
    case "indexing":
      return "bg-sky-400 animate-pulse";
    case "queued":
    default:
      return "bg-amber-400 animate-pulse";
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
    case "analyzing":
    case "running":
      return "w-5/6";
    case "completed":
    case "failed":
    default:
      return "w-full";
  }
}

function isTerminalOrWaitingStatus(status: AnalysisJobStatus) {
  return status === "completed" || status === "failed";
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

// ---------------------------------------------------------------------------
// Findings parsing
// ---------------------------------------------------------------------------

type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

interface ParsedFindingField {
  label: string;
  value: string;
}

interface ParsedFinding {
  severity: Severity;
  title: string;
  fields: ParsedFindingField[];
  raw: string;
}

const KNOWN_SEVERITIES: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

// Field labels rendered as inline "code-like" values (monospace, wrap-safe).
const CODE_FIELD_LABELS = new Set(["Code", "Regel", "Zeile"]);

function getSeverityClasses(severity: Severity) {
  switch (severity) {
    case "CRITICAL":
      return {
        badge: "border-rose-500/40 bg-rose-500/15 text-rose-200",
        border: "border-l-rose-500",
        dot: "bg-rose-400",
        panel: "bg-rose-500/[0.04]",
      };
    case "HIGH":
      return {
        badge: "border-orange-500/40 bg-orange-500/15 text-orange-200",
        border: "border-l-orange-500",
        dot: "bg-orange-400",
        panel: "bg-orange-500/[0.04]",
      };
    case "MEDIUM":
      return {
        badge: "border-amber-500/40 bg-amber-500/15 text-amber-200",
        border: "border-l-amber-500",
        dot: "bg-amber-400",
        panel: "bg-amber-500/[0.04]",
      };
    case "LOW":
      return {
        badge: "border-sky-500/40 bg-sky-500/15 text-sky-200",
        border: "border-l-sky-500",
        dot: "bg-sky-400",
        panel: "bg-sky-500/[0.04]",
      };
    case "UNKNOWN":
    default:
      return {
        badge: "border-slate-500/40 bg-slate-500/15 text-slate-300",
        border: "border-l-slate-500",
        dot: "bg-slate-400",
        panel: "bg-slate-500/[0.04]",
      };
  }
}

const SEVERITY_SORT_ORDER: Record<Severity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  UNKNOWN: 4,
};

/**
 * Splits the raw findings text (blocks separated by "---") into structured
 * findings. Each block's first line is expected to look like
 * "[SEVERITY] Title", followed by "Label: value" lines. Multi-line values
 * (e.g. Code, Erklärung, Vorschlag) are appended to the previous field.
 *
 * Returns null if the text does not contain any recognizable structure, so
 * callers can fall back to rendering the raw text.
 */
function splitFindingsText(issues: string): ParsedFinding[] | null {
  if (!issues || !issues.trim()) {
    return null;
  }

  const blocks = issues
    .split(/\r?\n-{3,}\r?\n?/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);

  if (blocks.length === 0) {
    return null;
  }

  const headerPattern = /^\[(CRITICAL|HIGH|MEDIUM|LOW)\]\s*(.*)$/i;
  const fieldPattern = /^([A-Za-zÄÖÜäöüß][\wÄÖÜäöüß ]{0,30}):\s?(.*)$/;

  const parsed: ParsedFinding[] = [];
  let recognizedCount = 0;

  for (const block of blocks) {
    const lines = block.split(/\r?\n/);
    const headerMatch = lines[0]?.match(headerPattern);

    let severity: Severity = "UNKNOWN";
    let title = lines[0] ?? "";
    let bodyLines = lines.slice(1);

    if (headerMatch) {
      severity = headerMatch[1].toUpperCase() as Severity;
      title = headerMatch[2]?.trim() || "Ohne Titel";
      recognizedCount += 1;
    } else {
      bodyLines = lines;
      title = "Hinweis";
    }

    const fields: ParsedFindingField[] = [];

    for (const line of bodyLines) {
      if (!line.trim()) {
        continue;
      }

      const fieldMatch = line.match(fieldPattern);

      if (fieldMatch) {
        fields.push({ label: fieldMatch[1].trim(), value: fieldMatch[2] });
      } else if (fields.length > 0) {
        // Continuation of the previous field's value (multi-line content).
        fields[fields.length - 1].value += `\n${line}`;
      } else {
        fields.push({ label: "Details", value: line });
      }
    }

    parsed.push({ severity, title, fields, raw: block });
  }

  // If nothing at all looked like our expected format, let the caller fall
  // back to a raw <pre> block instead of showing oddly-split fragments.
  if (recognizedCount === 0 && parsed.length <= 1) {
    return null;
  }

  return parsed.sort(
    (a, b) => SEVERITY_SORT_ORDER[a.severity] - SEVERITY_SORT_ORDER[b.severity]
  );
}

function countBySeverity(findings: ParsedFinding[]) {
  const counts: Record<Severity, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    UNKNOWN: 0,
  };

  for (const finding of findings) {
    counts[finding.severity] += 1;
  }

  return counts;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

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
      setAnalysisErrorMessage("Die ausgewählte Datei-ID ist ungültig.");
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

  async function handlePrepareNextAnalysis() {
    if (!jobId) {
      return;
    }

    try {
      setErrorMessage(null);
      setAnalysisResult(null);

      await prepareNextAnalysis(jobId);

      const refreshedJob = await getAnalysisJob(jobId);
      setJob(refreshedJob);

      const filesResponse = await getAnalysisJobFiles(jobId);
      setFiles(filesResponse.files);

      if (filesResponse.files.length > 0) {
        setSelectedFileId(String(filesResponse.files[0].id));
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Dateiauswahl konnte nicht vorbereitet werden."
      );
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
            Zurück zur Startseite
          </button>
        </div>
      </main>
    );
  }

  const parsedFindings = analysisResult
    ? splitFindingsText(analysisResult.issues)
    : null;
  const severityCounts = parsedFindings ? countBySeverity(parsedFindings) : null;

  return (
    <main className="relative min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.14),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(99,102,241,0.14),_transparent_30%),linear-gradient(to_bottom_right,_rgba(15,23,42,1),_rgba(2,6,23,1))]" />

      {/* Sticky status bar */}
      <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 text-sm text-slate-300">
            <span className="hidden font-mono text-xs text-slate-500 sm:inline">
              Job {job.jobId.slice(0, 8)}
            </span>
            <span className="hidden text-slate-600 sm:inline">·</span>
            <span className="truncate font-medium text-white">
              {job.repositoryOwner}/{job.repositoryName}
            </span>
          </div>

          <div
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium sm:text-sm ${getStatusClasses(
              job.status
            )}`}
          >
            <span
              className={`h-2 w-2 rounded-full ${getStatusDotClasses(job.status)}`}
            />
            {getStatusLabel(job.status)}
          </div>
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-cyan-300">
            Security Analysis Dashboard
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

        {/* Metadata */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Job-ID
            </p>
            <p className="mt-2 break-all font-mono text-sm text-white">
              {job.jobId}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Repository
            </p>
            <p className="mt-2 font-medium text-white">
              {job.repositoryOwner}/{job.repositoryName}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Erstellt am
            </p>
            <p className="mt-2 font-medium text-white">
              {new Date(job.createdAt).toLocaleString("de-DE")}
            </p>
          </div>

          {files.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Anzahl Dateien
              </p>
              <p className="mt-2 font-medium text-white">{files.length}</p>
            </div>
          )}
        </section>

        {/* Progress */}
        {!isTerminalOrWaitingStatus(job.status) || job.status === "failed" ? (
          <section className="mt-6 rounded-3xl border border-white/10 bg-slate-950/80 p-6 backdrop-blur-xl sm:p-8">
            <h2 className="text-lg font-semibold text-white">
              Analysefortschritt
            </h2>

            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">Aktueller Status</span>
                <span className="font-medium text-white">
                  {getStatusLabel(job.status)}
                </span>
              </div>

              <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getProgressClasses(
                    job.status
                  )} ${
                    job.status === "failed"
                      ? "bg-rose-500"
                      : "bg-gradient-to-r from-cyan-400 to-indigo-500"
                  }`}
                />
              </div>

              <p
                className={`text-sm leading-6 ${
                  job.status === "failed"
                    ? "text-rose-200"
                    : job.status === "ready_for_selection"
                    ? "text-indigo-200"
                    : "text-slate-400"
                }`}
              >
                {getStatusDescription(job.status, job.errorMessage)}
              </p>
            </div>
          </section>
        ) : null}

        {analysisErrorMessage && (
          <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-100">
            {analysisErrorMessage}
          </div>
        )}

        {/* File selection */}
        {job.status === "ready_for_selection" && (
          <section className="mt-6 rounded-3xl border border-white/10 bg-slate-950/80 p-6 backdrop-blur-xl sm:p-8">
            <h2 className="text-lg font-semibold text-white">
              Datei zur Analyse auswählen
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Das Repository wurde indexiert. Wähle jetzt eine Datei aus, die
              analysiert werden soll.
            </p>

            {filesErrorMessage ? (
              <p className="mt-6 text-sm text-rose-200">{filesErrorMessage}</p>
            ) : isLoadingFiles ? (
              <div className="mt-6 flex items-center gap-3 text-sm text-slate-300">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-400" />
                Dateien werden geladen...
              </div>
            ) : files.length === 0 ? (
              <p className="mt-6 text-sm text-amber-200">
                Es wurden keine analysierbaren Dateien gefunden.
              </p>
            ) : (
              <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-200">
                    Datei auswählen
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
                        {file.language ? ` — ${file.language}` : ""}
                      </option>
                    ))}
                  </select>

                  {(() => {
                    const selectedFile = files.find(
                      (file) => String(file.id) === selectedFileId
                    );

                    if (!selectedFile) {
                      return null;
                    }

                    return (
                      <span className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500">
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-slate-300">
                          {selectedFile.path}
                        </span>
                        {selectedFile.language && (
                          <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-indigo-200">
                            {selectedFile.language}
                          </span>
                        )}
                      </span>
                    );
                  })()}
                </label>

                <button
                  type="button"
                  onClick={() => void handleStartAnalysis()}
                  disabled={!selectedFileId || isStartingAnalysis}
                  className="inline-flex h-fit items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isStartingAnalysis && (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />
                  )}
                  {isStartingAnalysis
                    ? "Analyse wird gestartet..."
                    : "Ausgewählte Datei analysieren"}
                </button>
              </div>
            )}
          </section>
        )}

        {/* Loading result */}
        {isLoadingResult && (
          <section className="mt-6 rounded-3xl border border-white/10 bg-slate-950/80 p-6 sm:p-8">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-400" />
              Analyse-Ergebnis wird geladen...
            </div>
          </section>
        )}

        {/* Result */}
        {analysisResult && (
          <section className="mt-6 rounded-3xl border border-white/10 bg-slate-950/80 p-6 backdrop-blur-xl sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Analyse-Ergebnis
                </h2>
                <p className="mt-1 break-all font-mono text-xs text-slate-400">
                  {analysisResult.filePath}
                </p>
              </div>

              {severityCounts && (
                <div className="flex flex-wrap gap-2">
                  {KNOWN_SEVERITIES.filter(
                    (severity) => severityCounts[severity] > 0
                  ).map((severity) => {
                    const classes = getSeverityClasses(severity);
                    return (
                      <span
                        key={severity}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${classes.badge}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${classes.dot}`} />
                        {severity} · {severityCounts[severity]}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)]">
              {/* Summary — smaller, compact */}
              <div className="h-fit rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Zusammenfassung
                </h3>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-200">
                  {analysisResult.summary}
                </p>
              </div>

              {/* Findings — larger, scrollable, structured */}
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Gefundene Hinweise
                </h3>

                {parsedFindings ? (
                  <div className="mt-4 max-h-[32rem] space-y-3 overflow-y-auto pr-1">
                    {parsedFindings.map((finding, index) => {
                      const classes = getSeverityClasses(finding.severity);

                      return (
                        <details
                          key={`${finding.severity}-${index}`}
                          open={index === 0}
                          className={`group rounded-xl border border-white/10 border-l-4 ${classes.border} ${classes.panel} px-4 py-3`}
                        >
                          <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-2.5">
                              <span
                                className={`mt-0.5 inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-bold tracking-wide ${classes.badge}`}
                              >
                                {finding.severity}
                              </span>
                              <span className="text-sm font-medium leading-5 text-white">
                                {finding.title}
                              </span>
                            </div>
                            <svg
                              className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </summary>

                          {finding.fields.length > 0 && (
                            <dl className="mt-3 space-y-2 border-t border-white/10 pt-3">
                              {finding.fields.map((field, fieldIndex) => (
                                <div key={fieldIndex}>
                                  <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                                    {field.label}
                                  </dt>
                                  <dd
                                    className={`mt-0.5 whitespace-pre-wrap text-sm leading-5 text-slate-300 ${
                                      CODE_FIELD_LABELS.has(field.label)
                                        ? "break-all rounded-lg bg-black/30 px-2.5 py-1.5 font-mono text-xs text-slate-200"
                                        : ""
                                    }`}
                                  >
                                    {field.value.trim()}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          )}
                        </details>
                      );
                    })}
                  </div>
                ) : (
                  <pre className="mt-4 max-h-[32rem] overflow-y-auto whitespace-pre-wrap rounded-xl bg-black/30 p-4 text-sm leading-6 text-slate-300">
                    {analysisResult.issues}
                  </pre>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => void handlePrepareNextAnalysis()}
                className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20"
              >
                Andere Datei analysieren
              </button>
            </div>
          </section>
        )}

        {/* Footer actions */}
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
            className="rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110"
          >
            Status aktualisieren
          </button>
        </div>
      </div>
    </main>
  );
}
