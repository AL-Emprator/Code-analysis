"use client";

import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import {
  login,
  register,
  startGithubOAuth,
  submitRepo,
} from "../lib/api";

type AuthMode = "login" | "signup";

function AuthField({
  label,
  type,
  placeholder,
  autoComplete,
  value,
  onChange,
}: {
  label: string;
  type: string;
  placeholder: string;
  autoComplete?: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-200">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 placeholder:text-slate-500 shadow-sm outline-none transition focus:border-cyan-400/60 focus:ring-4 focus:ring-cyan-400/10"
      />
    </label>
  );
}

function AuthButton({
  children,
  variant = "primary",
  type = "button",
  onClick,
  disabled = false,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary";
  type?: "button" | "submit";
  onClick?: () => void | Promise<void>;
  disabled?: boolean;
}) {
  const baseClasses =
    "inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-cyan-400/20";
  const variantClasses =
    variant === "primary"
      ? "bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-500 text-slate-950 shadow-lg shadow-cyan-500/20 hover:brightness-110"
      : "border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {children}
    </button>
  );
}

function GithubIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="currentColor"
    >
      <path d="M12 2C6.477 2 2 6.59 2 12.253c0 4.533 2.865 8.378 6.84 9.74.5.095.683-.22.683-.487 0-.24-.01-.875-.014-1.716-2.782.617-3.369-1.375-3.369-1.375-.455-1.189-1.11-1.507-1.11-1.507-.907-.635.069-.622.069-.622 1.003.072 1.531 1.055 1.531 1.055.892 1.57 2.341 1.116 2.91.854.09-.661.349-1.115.635-1.371-2.22-.26-4.555-1.14-4.555-5.07 0-1.12.39-2.036 1.029-2.753-.103-.261-.446-1.31.098-2.728 0 0 .84-.277 2.75 1.052A9.38 9.38 0 0 1 12 7.32c.85.004 1.705.12 2.505.351 1.909-1.329 2.747-1.052 2.747-1.052.546 1.418.203 2.467.1 2.728.64.717 1.028 1.633 1.028 2.753 0 3.94-2.339 4.807-4.566 5.062.359.317.678.94.678 1.894 0 1.367-.013 2.469-.013 2.802 0 .27.18.587.688.487A10.27 10.27 0 0 0 22 12.253C22 6.59 17.523 2 12 2Z" />
    </svg>
  );
}

export default function Home() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      if (mode === "login") {
        await login({ email, password });
      } else {
        await register({ email, password });
      }

      const repoResponse = await submitRepo({ repoUrl });

      setStatusMessage(
        repoResponse?.jobId
          ? `Submitted repository for analysis. Job ID: ${repoResponse.jobId}`
          : "Repository submitted for analysis."
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Request failed. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGithubOAuth() {
    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await startGithubOAuth();

      if (response?.url) {
        window.location.href = response.url;
        return;
      }

      setStatusMessage("GitHub OAuth flow started.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to start GitHub OAuth."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.22),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.18),_transparent_28%),linear-gradient(to_bottom_right,_rgba(15,23,42,1),_rgba(2,6,23,1))]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.05)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="max-w-2xl space-y-6">
            <span className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.24em] text-cyan-200">
              Code Analysis Platform
            </span>

            <div className="space-y-4">
              <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Analyze GitHub repos with a clean, modern workflow.
              </h1>
              <p className="max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                Sign in or create an account, then connect a repository to start
                reviewing code quality, patterns, and structure from one place.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["Fast onboarding", "Switch between login and sign up instantly."],
                ["GitHub-ready", "Paste a repo URL to prepare analysis."],
                ["Responsive UI", "Built to feel polished on mobile and desktop."],
              ].map(([title, body]) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-slate-950/30 backdrop-blur"
                >
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-r from-cyan-500/20 via-sky-500/10 to-indigo-500/20 blur-2xl" />
            <div className="relative rounded-[2rem] border border-white/10 bg-slate-950/85 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl sm:p-8">
              <div className="mb-8 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-200/90">
                    Access portal
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    {mode === "login" ? "Welcome back" : "Create your account"}
                  </h2>
                </div>

                <div className="rounded-full border border-white/10 bg-white/5 p-1">
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      mode === "login"
                        ? "bg-white text-slate-950 shadow"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      mode === "signup"
                        ? "bg-white text-slate-950 shadow"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    Sign Up
                  </button>
                </div>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    mode === "login"
                      ? "bg-slate-100 text-slate-950"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    mode === "signup"
                      ? "bg-slate-100 text-slate-950"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  Sign Up
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <AuthField
                  label="Email address"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />

                <AuthField
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-200">
                    GitHub repository URL
                  </span>
                  <input
                    type="url"
                    placeholder="https://github.com/owner/repo"
                    value={repoUrl}
                    onChange={(event) => setRepoUrl(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 placeholder:text-slate-500 shadow-sm outline-none transition focus:border-cyan-400/60 focus:ring-4 focus:ring-cyan-400/10"
                  />
                </label>

                <div className="grid gap-3 pt-2 sm:grid-cols-2">
                  <AuthButton type="submit" disabled={isSubmitting}>
                    {mode === "login" ? "Login to Dashboard" : "Create Account"}
                  </AuthButton>

                  <AuthButton
                    variant="secondary"
                    type="button"
                    onClick={handleGithubOAuth}
                    disabled={isSubmitting}
                  >
                    <span className="inline-flex items-center gap-2">
                      <GithubIcon />
                      Continue with GitHub
                    </span>
                  </AuthButton>
                </div>
              </form>

              {(statusMessage || errorMessage) && (
                <div
                  className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
                    errorMessage
                      ? "border-rose-500/30 bg-rose-500/10 text-rose-100"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                  }`}
                >
                  {errorMessage ?? statusMessage}
                </div>
              )}

              <div className="mt-8 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300 sm:grid-cols-2">
                <div>
                  <p className="font-semibold text-white">Built for analysis workflows</p>
                  <p className="mt-1 leading-6">
                    Paste a repository URL and move toward code insights without
                    leaving the onboarding flow.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-white">Secure integration ready</p>
                  <p className="mt-1 leading-6">
                    Swap the placeholder actions for backend calls when the API is
                    ready.
                  </p>
                </div>
              </div>

              {/* Login, registration, OAuth, and repo submission now go through the frontend API client. */}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
