"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  getCurrentUser,
  getMarkdownExportUrl,
  getMyAnalysisJobs,
  getMyAnalysisStats,
  submitRepo,
  type GitHubRepository,
  type GitHubRepositoriesResponse,
  type CurrentUser,
  type UserAnalysisJob,
  type UserAnalysisStatsResponse,
  getGitHubRepositories,

} from "../../lib/api";

function getStatusLabel(status: string) {
  switch (status) {
    case "queued":
      return "Wartet";
    case "cloning":
      return "Repository wird geklont";
    case "indexing":
      return "Dateien werden indexiert";
    case "ready_for_selection":
      return "Bereit zur Analyse";
    case "analyzing":
    case "running":
      return "Analyse läuft";
    case "completed":
      return "Abgeschlossen";
    case "failed":
      return "Fehlgeschlagen";
    default:
      return status;
  }
}

function getStatusClasses(status: string) {
  switch (status) {
    case "completed":
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
    case "failed":
      return "border-rose-400/30 bg-rose-400/10 text-rose-200";
    case "analyzing":
    case "running":
      return "border-cyan-400/30 bg-cyan-400/10 text-cyan-200";
    default:
      return "border-white/10 bg-white/5 text-slate-200";
  }
}

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [jobs, setJobs] = useState<UserAnalysisJob[]>([]);
  const [stats, setStats] = useState<UserAnalysisStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [githubRepositories, setGithubRepositories] = useState<GitHubRepository[]>([]);
  const [isStartingGitHubRepo, setIsStartingGitHubRepo] = useState<string | null>(null); 

  useEffect(() => {
    async function loadProfileData() {
      try {
        setErrorMessage(null);

        const [currentUserResponse, jobsResponse, statsResponse, githubRepositoriesResponse] =
          await Promise.all([
            getCurrentUser(),
            getMyAnalysisJobs(),
            getMyAnalysisStats(),
            getGitHubRepositories(),
          ]);

        if (!currentUserResponse.authenticated) {
          router.push("/");
          return;
        }

        setUser(currentUserResponse.user);
        setJobs(jobsResponse.jobs);
        setStats(statsResponse);
        setGithubRepositories(githubRepositoriesResponse.repositories);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Profil konnte nicht geladen werden."
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadProfileData();
  }, [router]);



  async function handleAnalyzeGitHubRepository(repository: GitHubRepository) {
  try {
    setIsStartingGitHubRepo(repository.fullName);
    setErrorMessage(null);

    const response = await submitRepo({ repoUrl: repository.htmlUrl });

    router.push(`/dashboard/${response.jobId}`);
  } catch (error) {
    setErrorMessage(
      error instanceof Error
        ? error.message
        : "Repository konnte nicht analysiert werden."
    );
  } finally {
    setIsStartingGitHubRepo(null);
  }
}



  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-cyan-400/20 border-t-cyan-400" />
          <p className="mt-4 text-sm text-slate-300">
            Profil wird geladen...
          </p>
        </div>
      </main>
    );
  }

  if (errorMessage || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="w-full max-w-lg rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6">
          <h1 className="text-xl font-semibold">
            Profil konnte nicht geladen werden
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
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.16),_transparent_28%),linear-gradient(to_bottom_right,_rgba(15,23,42,1),_rgba(2,6,23,1))]" />

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-cyan-300">
              User Profile
            </p>

            <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
              Mein Profil
            </h1>

            <p className="mt-3 text-sm text-slate-300">
              Übersicht über deine Analysen, Repositories und exportierbaren Reports.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Zur Startseite
          </button>
        </div>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name ?? user.githubLogin}
                className="h-24 w-24 rounded-full border border-cyan-400/30 object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-2xl font-semibold text-cyan-100">
                {user.githubLogin.slice(0, 1).toUpperCase()}
              </div>
            )}

            <div>
              <h2 className="text-2xl font-semibold text-white">
                {user.name ?? user.githubLogin}
              </h2>

              <p className="mt-1 text-sm text-cyan-200">
                @{user.githubLogin}
              </p>

              <p className="mt-2 text-sm text-slate-300">
                {user.email ?? "Keine E-Mail hinterlegt"}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-5">
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <p className="text-sm text-slate-400">Analysen</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {stats?.totalJobs ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <p className="text-sm text-slate-400">Abgeschlossen</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-200">
              {stats?.completedJobs ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <p className="text-sm text-slate-400">Fehlgeschlagen</p>
            <p className="mt-2 text-2xl font-semibold text-rose-200">
              {stats?.failedJobs ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <p className="text-sm text-slate-400">Dateien</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {stats?.totalFiles ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <p className="text-sm text-slate-400">Reports</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {stats?.totalResults ?? 0}
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-950/80 p-6 backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Meine GitHub Repositories
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Wähle ein Repository direkt aus deinem GitHub-Account aus und starte die Analyse.
              </p>
            </div>
          </div>

          {githubRepositories.length === 0 ? (
            <p className="mt-6 text-sm text-slate-300">
              Es wurden keine GitHub-Repositories gefunden.
            </p>
          ) : (
            <div className="mt-6 grid gap-4">
              {githubRepositories.map((repository) => (
                <article
                  key={repository.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-cyan-400/30 hover:bg-white/10"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-white">
                          {repository.fullName}
                        </h3>

                        <span className="rounded-full border border-white/10 bg-slate-950/60 px-2.5 py-1 text-xs text-slate-300">
                          {repository.private ? "Private" : "Public"}
                        </span>

                        {repository.language && (
                          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-xs text-cyan-100">
                            {repository.language}
                          </span>
                        )}

                        {repository.fork && (
                          <span className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-2.5 py-1 text-xs text-yellow-100">
                            Fork
                          </span>
                        )}
                      </div>

                      <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                        {repository.description ?? "Keine Beschreibung vorhanden."}
                      </p>

                      <p className="mt-2 text-xs text-slate-500">
                        Aktualisiert:{" "}
                        {repository.updatedAt
                          ? new Date(repository.updatedAt).toLocaleString("de-DE")
                          : "Unbekannt"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <a
                        href={repository.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                      >
                        GitHub öffnen
                      </a>

                      <button
                        type="button"
                        onClick={() => void handleAnalyzeGitHubRepository(repository)}
                        disabled={isStartingGitHubRepo === repository.fullName}
                        className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isStartingGitHubRepo === repository.fullName
                          ? "Analyse startet..."
                          : "Analysieren"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-950/80 p-6 backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Meine Repositories
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Hier siehst du deine bisherigen Analyse-Jobs.
              </p>
            </div>
          </div>

          {jobs.length === 0 ? (
            <p className="mt-6 text-sm text-slate-300">
              Du hast noch keine Repositories analysiert.
            </p>
          ) : (
            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
              <div className="hidden grid-cols-[1.5fr_1fr_1fr_1.2fr] gap-4 border-b border-white/10 bg-white/5 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 md:grid">
                <span>Repository</span>
                <span>Status</span>
                <span>Erstellt am</span>
                <span>Aktionen</span>
              </div>

              <div className="divide-y divide-white/10">
                {jobs.map((job) => (
                  <article
                    key={job.jobId}
                    className="grid gap-4 px-5 py-5 md:grid-cols-[1.5fr_1fr_1fr_1.2fr] md:items-center"
                  >
                    <div>
                      <h3 className="font-semibold text-white">
                        {job.repositoryOwner}/{job.repositoryName}
                      </h3>

                      <a
                        href={job.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block break-all text-xs text-slate-400 underline decoration-white/20 underline-offset-4 hover:text-white"
                      >
                        {job.repoUrl}
                      </a>
                    </div>

                    <div>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(
                          job.status
                        )}`}
                      >
                        {getStatusLabel(job.status)}
                      </span>
                    </div>

                    <div className="text-sm text-slate-300">
                      {new Date(job.createdAt).toLocaleString("de-DE")}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => router.push(`/dashboard/${job.jobId}`)}
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                      >
                        Öffnen
                      </button>

                      <a
                        href={getMarkdownExportUrl(job.jobId)}
                        className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20"
                      >
                        Report exportieren
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}