"use client"; // Diese Komponente läuft im Browser, nicht nur auf dem Server.

/*  
Das ist Nötig , weil der Code Dinge benutzt wie 

  useState(...)
  window.location.href = ...
  onClick
  onSubmit


*/

//useState speichert veränderliche Werte im UI, zum Beispiel E-Mail, Passwort oder Fehlermeldungen.
// ChangeEvent und FormEvent sind Typen für Ereignisse, die bei der Interaktion mit Formularen auftreten.
// ReactNode ist ein Typ, zum Beispiel Text, Icon oder JSX innerhalb eines Buttons.


import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";

//Dann kommen die API-Funktionen: login, register, startGithubOAuth und submitRepo, die wir in lib/api.ts definiert haben.
//Die sind Eigene Frontend-API-Wrapper, die Requests an dein Backend schicken.
import {
  login,
  register,
  startGithubOAuth,
  submitRepo,
  resetAuthCookies,
  getCurrentUser,
  type CurrentUser,
} from "../lib/api";

import { useRouter } from "next/navigation";// useRouter ist ein Hook von Next.js, der uns erlaubt, den Benutzer zu einer anderen Seite weiterzuleiten.

type AuthMode = "login" | "signup"; 

// AuthField ist eine wiederverwendbare Komponente für Eingabefelder mit Label, z.B. E-Mail und Passwort.
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
  // Der Wert kommt aus React-State, und jede Änderung wird über onChange zurück in den State geschrieben
  // Wenn der Benutzer tippt, wird email aktualisiert.
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
        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 placeholder:text-slate-500 shadow-sm outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
      />
    </label>
  );
}

type AuthStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated";


//Das ist eine wiederverwendbare Button-Komponente. 
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
    "inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-cyan-400/30";
  const variantClasses =
    variant === "primary"
      ? "bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-500 text-slate-950 shadow-md shadow-cyan-500/10 hover:brightness-110"
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

// Kleines Markenzeichen für die Navigation (Schild-Symbol, passend zum Security-Thema).
function LogoMark() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-500 text-slate-950">
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3 4.5 6v5.2c0 4.6 3.2 7.9 7.5 9.3 4.3-1.4 7.5-4.7 7.5-9.3V6L12 3Z" />
        <path d="m9.3 12 1.9 1.9 3.6-3.8" />
      </svg>
    </span>
  );
}

// Icons für die drei Funktionskarten. Bewusst einfach gehalten, jeweils passend zur Funktion.
function IconKey() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="15" r="4" />
      <path d="M10.8 12.2 20 3" />
      <path d="M16.3 6.7 19 9.4" />
      <path d="M13.4 9.6 15.6 11.8" />
    </svg>
  );
}

function IconInjection() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m7.5 9 3 3-3 3" />
      <path d="M13 15h3.5" />
    </svg>
  );
}

function IconResults() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6.5h10.5M9 12h10.5M9 17.5h10.5" />
      <path d="M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" />
    </svg>
  );
}

// Wiederverwendbare Karte für die drei unterstützten Funktionen.
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-cyan-400/30 hover:bg-white/[0.07]">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
        {icon}
      </div>
      <p className="mt-3 text-sm font-semibold text-white">{title}</p>
      <p className="mt-1.5 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}

// Schrittanzeige über dem Repository-Formular: zeigt den dreistufigen Ablauf und hebt den aktuellen Schritt hervor.
function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps: { step: 1 | 2 | 3; label: string }[] = [
    { step: 1, label: "Repository" },
    { step: 2, label: "Datei auswählen" },
    { step: 3, label: "Ergebnisse" },
  ];

  return (
    <ol className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1.5">
      {steps.map((item, index) => {
        const isActive = item.step === current;

        return (
          <li key={item.step} className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1.5 text-xs font-medium sm:text-sm ${
                isActive ? "text-cyan-200" : "text-slate-500"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full border text-[11px] ${
                  isActive
                    ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-200"
                    : "border-white/10 text-slate-500"
                }`}
              >
                {item.step}
              </span>
              {item.label}
            </span>

            {index < steps.length - 1 && (
              <span className="text-slate-600">→</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}


// Das ist die Hauptkomponente der Seite, die den gesamten UI- und Interaktionscode enthält.
export default function Home() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);


  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const router = useRouter();


  useEffect(() => {
    async function checkAuthentication() {
      try {
        const response = await getCurrentUser();
      
        if (response.authenticated) {
          setCurrentUser(response.user);
          setAuthStatus("authenticated");
        } else {
          setCurrentUser(null);
          setAuthStatus("unauthenticated");
        }
      } catch {
        setCurrentUser(null);
        setAuthStatus("unauthenticated");
        
      }
    }

    void checkAuthentication();
  }, []);


  // handleSubmit ist die Funktion, die aufgerufen wird, wenn das Formular abgeschickt wird. 
  // Sie kümmert sich um Login/Registrierung und Repo-Submission.
  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // Das verhindert, dass der Browser die Seite neu lädt.
    setIsSubmitting(true); // Aktiviert den Ladezustand, z.B. um Buttons zu deaktivieren.
    setErrorMessage(null); // Löscht vorherige Fehlermeldungen.
    setStatusMessage(null); // Löscht vorherige Statusmeldungen.

    try {
      if (mode === "login") { // Wenn wir im Login-Modus sind, rufen wir die login-Funktion auf.
        await login({ email, password }); // Das ist die API-Funktion, die einen Request an dein Backend schickt, um den Benutzer zu authentifizieren.
      } else {
        await register({ email, password }); // Wenn wir im Signup-Modus sind, rufen wir die register-Funktion auf, um ein neues Konto zu erstellen.
      }

      const authResponse = await getCurrentUser(); // Nachdem der Benutzer eingeloggt oder registriert ist, holen wir die aktuellen Benutzerdaten vom Backend.
      if (!authResponse.authenticated) {
        throw new Error(
          "Die Authentifizierung konnte nicht bestätigt werden."
        );
      }

      setCurrentUser(authResponse.user);
      setAuthStatus("authenticated");
    
      setStatusMessage(
        mode === "login"
          ? "Erfolgreich angemeldet."
          : "Konto erfolgreich erstellt."
      );
    } catch (error) {
        setCurrentUser(null);
        setAuthStatus("unauthenticated");

      setErrorMessage(
          error instanceof Error
            ? error.message
            : "Authentifizierung fehlgeschlagen. Bitte überprüfe deine Angaben und versuche es erneut."
        );

    } finally {
        setIsSubmitting(false);
      }
    }

 // handleResetCookies ist die Funktion, die aufgerufen wird, wenn der Benutzer den "Reset Cookies"-Button klickt.
    async function handleResetCookies() {
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await resetAuthCookies();

      setStatusMessage(response.message);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Cookies konnten nicht gelöscht werden."
      );
    }
  }


  // handleGithubOAuth ist die Funktion, 
  // die aufgerufen wird, wenn der Benutzer den "Continue with GitHub"-Button klickt.
  async function handleGithubOAuth() {
    setIsSubmitting(true); // Aktiviert den Ladezustand, z.B. um Buttons zu deaktivieren.
    setErrorMessage(null); // Löscht vorherige Fehlermeldungen.
    setStatusMessage(null); // Löscht vorherige Statusmeldungen.

    // Wir rufen die startGithubOAuth-Funktion auf, 
    // die einen Request an dein Backend schickt, um den OAuth-Flow zu starten.
    try {
      const response = await startGithubOAuth();


      // Wenn die Antwort eine URL enthält, 
      // leiten wir den Benutzer dorthin weiter, um den OAuth-Flow abzuschließen.
      if (response?.url) {
        window.location.href = response.url;
        return;
      }

      setStatusMessage("GitHub-Anmeldung wird gestartet.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Die GitHub-Anmeldung konnte nicht gestartet werden."
      );
    } finally {
      setIsSubmitting(false);
    }
  }


  async function handleRepoSubmit(event: FormEvent<HTMLFormElement>){

    event.preventDefault();

      if (authStatus !== "authenticated") {
      setErrorMessage(
        "Du musst zuerst angemeldet sein."
      );
      return;
    }

    const normalizedRepoUrl = repoUrl.trim();

    if (!normalizedRepoUrl) {
      setErrorMessage(
        "Bitte gib eine GitHub-Repository-URL ein."
      );
      return;
    }


    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
    const response = await submitRepo({
      repoUrl: normalizedRepoUrl,
    });

    if (!response.jobId) {
      throw new Error(
        "Das Backend hat keine Job-ID zurückgegeben."
      );
    }

    router.push(`/dashboard/${response.jobId}`);

   } catch (error) {
    
      setErrorMessage(
          error instanceof Error
            ? error.message
            : "Repository konnte nicht geladen werden. Bitte überprüfe die URL und versuche es erneut."
        );
  } finally {
    setIsSubmitting(false);
  }
 }

 

  // Wenn der Authentifizierungsstatus noch geladen wird, zeigen wir eine Ladeanzeige an.
  if (authStatus === "loading") {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <p className="text-sm text-slate-300">
        Anmeldung wird geprüft...
      </p>
    </main>
  );
}


  return (
    <>
      {/* Navigation: links Logo/Plattformname, rechts Analysen-Link und kompaktes Profilmenü. */}
      <nav className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <span className="text-base font-semibold text-white">
              CodeSentinel
            </span>
          </div>

          {authStatus === "authenticated" && currentUser && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/profile")}
                className="text-sm font-medium text-slate-300 transition hover:text-white"
              >
                Analysen
              </button>

              <button
                type="button"
                onClick={() => router.push("/profile")}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1.5 pl-1.5 pr-3 text-sm font-medium text-white transition hover:border-cyan-400/40 hover:bg-cyan-400/10"
              >
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.githubLogin}
                    className="h-6 w-6 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400/20 text-xs font-semibold text-cyan-100">
                    {(currentUser.name ?? currentUser.githubLogin ?? "P")
                      .slice(0, 1)
                      .toUpperCase()}
                  </span>
                )}
                <span className="max-w-[7rem] truncate">
                  {currentUser.name ?? currentUser.githubLogin}
                </span>
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.12),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(99,102,241,0.10),_transparent_28%),linear-gradient(to_bottom_right,_rgba(15,23,42,1),_rgba(2,6,23,1))]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.04)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20" />

        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="grid w-full items-start gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <section className="max-w-2xl space-y-8">
              <div className="space-y-4">
                <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  Finde Sicherheitslücken in deinem Code.
                </h1>
                <p className="max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                  Analysiere Python- und PHP-Repositories direkt von GitHub.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <FeatureCard
                  icon={<IconKey />}
                  title="Secrets erkennen"
                  description="Findet hart codierte Passwörter, Tokens und andere sensible Daten im Quellcode."
                />
                <FeatureCard
                  icon={<IconInjection />}
                  title="Injection prüfen"
                  description="Erkennt SQL-, Command- und XSS-Schwachstellen in Python- und PHP-Dateien."
                />
                <FeatureCard
                  icon={<IconResults />}
                  title="Ergebnisse anzeigen"
                  description="Zeigt Befunde nach Schweregrad sortiert an und lässt sich als Report exportieren."
                />
              </div>
            </section>

            <section className="relative">
              <div className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-gradient-to-r from-cyan-500/10 via-sky-500/5 to-indigo-500/10 blur-xl" />
              <div className="relative rounded-[2rem] border border-white/10 bg-slate-950/85 p-6 shadow-xl shadow-cyan-950/20 backdrop-blur-xl sm:p-8">
                {authStatus === "unauthenticated" ? (
                  <div className="mb-8 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-200/90">
                        Anmeldebereich
                      </p>

                      <h2 className="mt-2 text-2xl font-semibold text-white">
                        {mode === "login"
                          ? "Willkommen zurück"
                          : "Konto erstellen"}
                      </h2>
                    </div>
                  </div>
                ) : (
                  <>
                    <StepIndicator current={1} />

                    <div className="mb-6">
                      <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-200/90">
                        Repository-Analyse
                      </p>

                      <h2 className="mt-2 text-2xl font-semibold text-white">
                        Repository einreichen
                      </h2>
                    </div>
                  </>
                )}

                {authStatus === "unauthenticated" && (
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
                      Anmelden
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
                      Registrieren
                    </button>
                  </div>
                )}

                {authStatus === "unauthenticated" ? (
                  <form className="space-y-4" onSubmit={handleAuthSubmit}>
                    {/* E-Mail-Eingabefeld */}
                    <AuthField
                      label="E-Mail-Adresse"
                      type="email"
                      placeholder="du@beispiel.de"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />

                    <AuthField
                      label="Passwort"
                      type="password"
                      placeholder="••••••••"
                      autoComplete={
                        mode === "login"
                          ? "current-password"
                          : "new-password"
                      }
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />

                    <div className="grid gap-3 pt-2 sm:grid-cols-2">
                      <AuthButton
                        type="submit"
                        disabled={isSubmitting}
                      >
                        {isSubmitting
                          ? "Bitte warten..."
                          : mode === "login"
                            ? "Anmelden"
                            : "Konto erstellen"}
                      </AuthButton>

                      <AuthButton
                        variant="secondary"
                        type="button"
                        onClick={handleGithubOAuth}
                        disabled={isSubmitting}
                      >
                        <span className="inline-flex items-center gap-2">
                          <GithubIcon />
                          Mit GitHub fortfahren
                        </span>
                      </AuthButton>
                    </div>
                  </form>
                ) : (
                  <form className="space-y-4" onSubmit={handleRepoSubmit}>
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-slate-200">
                        GitHub-Repository-URL
                      </span>

                      <div className="relative">
                        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                          <GithubIcon />
                        </span>

                        <input
                          type="url"
                          required
                          placeholder="https://github.com/eigentuemer/repository"
                          value={repoUrl}
                          onChange={(event) => setRepoUrl(event.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-3.5 pl-11 pr-4 text-base text-slate-100 placeholder:text-slate-500 shadow-sm outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
                        />
                      </div>
                    </label>

                    <AuthButton
                      type="submit"
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? "Repository wird geladen..."
                        : "Repository laden →"}
                    </AuthButton>
                  </form>
                )}

                {(statusMessage || errorMessage) && (
                  <div
                    role="status"
                    className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
                      errorMessage
                        ? "border-rose-500/30 bg-rose-500/10 text-rose-100"
                        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                    }`}
                  >
                    {errorMessage ?? statusMessage}
                  </div>
                )}

                {/* Login, registration, OAuth, and repo submission now go through the frontend API client. */}
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
