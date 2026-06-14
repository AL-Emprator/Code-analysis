# Code Analysis Platform

A small web platform for analyzing GitHub repositories with a clean onboarding flow.

---

## Project structure

Top-level tree:

```
code-platform/
├─ docker-compose.yml
├─ analyzer/            # (empty) analysis worker / engine (to be implemented)
├─ backend/             # minimal FastAPI backend (see backend/app/main.py)
├─ docs/                # documentation
├─ frontend/            # Next.js frontend app
│  ├─ app/
│  │  ├─ globals.css
│  │  ├─ layout.tsx
│  │  └─ page.tsx       # onboarding / auth UI (client-side)
│  ├─ public/
│  ├─ Dockerfile
│  ├─ package.json
│  ├─ next.config.ts
│  └─ tsconfig.json
├─ worker/              # (empty) background worker (to be implemented)
└─ README.md            # this file

```

Notes:
- The frontend is implemented in Next.js and provides the onboarding UI.
- A minimal backend API server has been added using FastAPI at `backend/app/main.py` with a simple HTML root and OpenAPI docs available at `/docs`.

---

## How the project works (overview)

- The frontend is a Next.js app that provides an onboarding page where users can login, register, or submit a GitHub repository URL for analysis. The UI contains placeholders for authentication and repository submission flows.
- The backend, analysis engine, and worker processes are not implemented yet; the frontend currently assumes endpoints will exist for auth (login/register/OAuth) and repo submission.
- Typical flow (to implement):
  1. User signs up or logs in (POST /api/auth/register or /api/auth/login).
  2. User can optionally start GitHub OAuth (GET /api/auth/oauth/github/start) to grant access to private repos.
 3. User pastes a repo URL and submits it to the backend (POST /api/analysis/submit).
  4. Backend enqueues analysis work (analyzer/worker) and returns a job id or status.

---

## Technologies, frameworks, libraries, and tools used

- Frontend: Next.js (app router), React
- Styling: Tailwind CSS (configured in frontend)
- Tooling: ESLint, TypeScript (types present), PostCSS
- Container: Docker / docker-compose (project includes docker-compose.yml and frontend Dockerfile)

---

## Frontend setup instructions

1. Navigate to the frontend folder:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Run the dev server:

```bash
npm run dev
```

The frontend uses Next.js; open http://localhost:3000 by default.

---

## Backend setup instructions

A minimal backend API server has been added using FastAPI. The entrypoint for the sample app is `backend/app/main.py` and exposes a simple HTML root at `/` and interactive API docs at `/docs`.

Recommended Python quick start (from project root):

1. Create or activate a virtual environment (optional but recommended):

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate    # Windows
source .venv/bin/activate    # macOS / Linux
```

2. Install runtime dependencies:

```bash
python -m pip install --upgrade pip
python -m pip install fastapi uvicorn[standard]
```

3. Run the dev server:

```bash
# from the `backend` folder
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

4. Open the app:

- HTML root: http://127.0.0.1:8000/
- OpenAPI / docs: http://127.0.0.1:8000/docs

Planned backend responsibilities (to implement beyond the minimal stub):

- Authentication endpoints: `POST /api/auth/login`, `POST /api/auth/register`.
- GitHub OAuth starter and callback: `GET /api/auth/oauth/github/start`, `GET /api/auth/oauth/github/callback`.
- Analysis submission: `POST /api/analysis/submit` accepting `{ repoUrl }` and returning `{ jobId }` or status.

Environment variables recommended for future backend work remain the same (OAuth client id/secret, DB connection, JWT secret, etc.).

---

## Environment variables (recommended)

The repository does not currently use environment variables in the frontend. The backend (when added) will likely need the following environment variables:

- `GITHUB_CLIENT_ID` — GitHub OAuth app client ID
- `GITHUB_CLIENT_SECRET` — GitHub OAuth app client secret (server-only)
- `DATABASE_URL` — database connection string (if persisting users/jobs)
- `JWT_SECRET` — secret used to sign JWTs (if using JWTs)
- `PORT` — backend server port (default: 3001)
- `NEXT_PUBLIC_API_URL` — frontend may use this to target backend API in development

Include a `.env` file in the `backend/` directory for these values. Keep secrets out of version control.

---

## How to install dependencies (summary)

- Frontend: `cd frontend && npm install`
- Backend (Python FastAPI example): `cd backend && python -m pip install -r requirements.txt` or `python -m pip install fastapi uvicorn[standard]`

---

## How to start the frontend and backend (summary)

- Frontend (development):

```bash
cd frontend
npm run dev
```

- Backend (development — FastAPI example):

```bash
cd backend
uv run uvicorn app.main:app --reload
```

- Docker (if you add services to docker-compose.yml):

```bash
docker-compose up --build
```

---

## Useful commands

- `cd frontend && npm run dev` — start frontend dev server
- `cd frontend && npm run build` — build frontend for production
- `cd frontend && npm run start` — start production frontend server
- `npm install` — install packages in the current folder
- `docker-compose up` — run services if docker-compose is configured

---

## Notes about current unfinished parts

- The `analyzer/` and `worker/` folders are still empty — server-side analysis engine and background worker are unimplemented.
- The `backend/` folder contains a minimal FastAPI app at `backend/app/main.py` as a starting point for API implementation.
- Frontend `page.tsx` contains UI placeholders for authentication, GitHub OAuth, and repository submission. The UI does not yet call real backend endpoints.
- There are no environment variable files or secrets configured; OAuth and token exchanges must be implemented server-side before enabling OAuth flows.
- Token handling strategy: frontend currently does not store JWTs; when implemented, prefer HttpOnly secure cookies for production.

---

If you want, I can now scaffold the frontend API client and auth hook, or create backend route stubs in `backend/` and document the API contract. Tell me which you prefer.

