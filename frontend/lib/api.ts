type AuthPayload = {
  email: string;
  password: string;
};

type RepoPayload = {
  repoUrl: string;
};

type ApiErrorPayload = {
  message?: string;
};

export type AuthResponse = Record<string, unknown>;

export type StartGithubOAuthResponse = {
  url?: string;
};


export type SubmitRepoResponse = {
  jobId?: string;
  status: "queued" | "running" | "completed" | "failed";
};

export type AnalysisJobStatus =
  | "queued"
  | "running"
  | "cloning"
  | "indexing"
  | "ready_for_selection"
  | "analyzing"
  | "completed"
  | "failed";

export type AnalysisJobResponse = {
  jobId: string;
  repoUrl: string;
  repositoryOwner: string;
  repositoryName: string;
  status: AnalysisJobStatus;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};


export type AnalysisFile = {
  id: number;
  path: string;
  filename: string;
  extension: string | null;
  language: string | null;
  sizeBytes: number;
  selectable: boolean;
};

export type AnalysisJobFilesResponse = {
  jobId: string;
  status: AnalysisJobStatus;
  files: AnalysisFile[];
};

export type StartFileAnalysisResponse = {
  jobId: string;
  fileId: number;
  status: AnalysisJobStatus;
};

export type AnalysisResultResponse = {
  jobId: string;
  fileId: number;
  filePath: string;
  summary: string;
  issues: string;
  createdAt: string;
};

export async function getAnalysisJob(jobId: string) {
  return request<AnalysisJobResponse>(
    `/api/analysis/jobs/${encodeURIComponent(jobId)}`,
    {
      method: "GET",
    }
  );
}

export async function startFileAnalysis(jobId: string, fileId: number) {
  return request<StartFileAnalysisResponse>(
    `/api/analysis/jobs/${encodeURIComponent(jobId)}/analyze`,
    {
      method: "POST",
      body: JSON.stringify({
        fileId,
      }),
    }
  );
}

export async function getAnalysisResult(jobId: string) {
  return request<AnalysisResultResponse>(
    `/api/analysis/jobs/${encodeURIComponent(jobId)}/result`,
    {
      method: "GET",
    }
  );
}

export async function getAnalysisJobFiles(jobId: string) {
  return request<AnalysisJobFilesResponse>(
    `/api/analysis/jobs/${encodeURIComponent(jobId)}/files`,
    {
      method: "GET",
    }
  );
}


// Das ist der Typ für den aktuellen Benutzer, 
// der von deinem Backend zurückgegeben wird. 
// Er enthält die ID, E-Mail, GitHub-Login, Name und Avatar-URL des Benutzers.
export type CurrentUser = {
  id: number;
  email: string | null;
  githubLogin: string;
  name: string | null;
  avatarUrl: string | null;
};

// Das ist der Typ für die Antwort, 
// die dein Backend zurückgibt, 
// wenn du den aktuellen Benutzer abfragst.
export type CurrentUserResponse = {
  authenticated: boolean;
  user: CurrentUser;
};


// API_BASE_URL ist die Basis-URL für alle API-Requests. Sie wird aus der Umgebungsvariable NEXT_PUBLIC_API_URL gelesen,
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

// Das ist eine generische Funktion, die alle API-Requests an dein Backend schickt. Sie nimmt den Pfad und die Request-Optionen entgegen, 
// führt den Fetch durch und behandelt die Antwort.
// path ist der Endpunkt, z.B. "/api/auth/login", 
// und options sind die Fetch-Optionen wie Methode, Headers und Body.

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include", // Das sorgt dafür, dass Cookies (wie Auth-Cookies) bei jedem Request mitgeschickt werden.
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => ({}))) as T;

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "detail" in payload
        ? String((payload as { detail?: string }).detail)
        : typeof payload === "object" &&
            payload !== null &&
            "message" in payload
          ? String((payload as { message?: string }).message)
          : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return payload;
}


// Das sind die API-Funktionen, die wir in der Hauptkomponente verwenden, um mit dem Backend zu kommunizieren.
export async function login(payload: AuthPayload) {
  return request<AuthResponse>("/api/auth/login", { // Sie schickt einen POST-Request an /api/auth/login mit den Anmeldedaten im Body.
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// register ist die Funktion, die die Registrierungsdaten an dein Backend schickt, um ein neues Konto zu erstellen.
export async function register(payload: AuthPayload) { 
  return request<AuthResponse>("/api/auth/register", { // Sie schickt einen POST-Request an /api/auth/register mit den Registrierungsdaten im Body.
    method: "POST",
    body: JSON.stringify(payload),
  });
}


//Später 

// startGithubOAuth ist die Funktion, die den GitHub OAuth-Flow startet.
export async function startGithubOAuth() {
  return request<StartGithubOAuthResponse>("/api/auth/oauth/github/start", {
    method: "GET",
  });
}

// submitRepo ist die Funktion, die die Repo-URL an dein Backend schickt, damit es mit der Analyse beginnen kann.
export async function submitRepo(payload: RepoPayload) {
  return request<SubmitRepoResponse>("/api/analysis/submit", { // Sie schickt einen POST-Request an /api/analysis/submit mit der Repo-URL im Body.
    method: "POST",
    body: JSON.stringify(payload), //"repoUrl": "https://github.com/owner/repo"
  });
}

// resetAuthCookies ist die Funktion, die die Authentifizierungs-Cookies zurücksetzt. Sie wird in der Entwicklungsumgebung verwendet, um den Zustand der Authentifizierung zu testen.
export type ResetCookiesResponse = {
  message: string;
};

export async function resetAuthCookies() {
  return request<ResetCookiesResponse>("/api/auth/dev/reset-cookies", {
    method: "POST",
  });
}


// getCurrentUser ist die Funktion, 
// die den aktuellen Benutzer vom Backend abfragt. 
// Sie wird verwendet, um zu prüfen, ob der Benutzer angemeldet ist und 
// um seine Daten zu erhalten.

export async function getCurrentUser() {
  return request<CurrentUserResponse>("/api/auth/me", {
    method: "GET",
  });
}