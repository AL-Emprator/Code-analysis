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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

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
  });

  const payload = (await response.json().catch(() => ({}))) as T;

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null && "message" in payload
        ? String((payload as ApiErrorPayload).message)
        : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return payload;
}

export async function login(payload: AuthPayload) {
  return request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function register(payload: AuthPayload) {
  return request<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function startGithubOAuth() {
  return request<StartGithubOAuthResponse>("/api/auth/oauth/github/start", {
    method: "GET",
  });
}

export async function submitRepo(payload: RepoPayload) {
  return request<SubmitRepoResponse>("/api/analysis/submit", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}