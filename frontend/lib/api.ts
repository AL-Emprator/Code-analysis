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
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,

    credentials: "include", // Wir senden Cookies mit, damit die Session auf dem Server erkannt wird.

  });

  // Wir versuchen, die Antwort als JSON zu parsen. Wenn das fehlschlägt (z.B. weil die Antwort leer ist), verwenden wir ein leeres Objekt 
  // als Fallback.
  const payload = (await response.json().catch(() => ({}))) as T;

  // Wenn die Antwort einen Fehlerstatus hat (z.B. 400 oder 500), werfen wir einen Fehler mit einer Nachricht, 
  // die entweder aus dem Payload
  // kommt (wenn es ein "message"-Feld gibt) oder eine generische Nachricht mit dem Statuscode enthält.
  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null && "message" in payload
        ? String((payload as ApiErrorPayload).message)
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
    body: JSON.stringify(payload),
  });
}