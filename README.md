# Code Analysis Platform

Web application for analyzing GitHub repositories for potential security issues. The project combines custom static-analysis rules with Semgrep, presents findings in a dashboard, and supports file-level and repository-wide scans.

> **Project status:** Active development / prototype. Results are advisory and do not guarantee that a repository is secure. Do not deploy publicly without reviewing authentication, permissions, data handling and the privacy documentation.

## Features

- Login/registration and GitHub OAuth integration.
- Submit a GitHub repository URL or select a repository from the GitHub profile view.
- Background repository cloning and source-file indexing via a worker.
- Select an individual file for analysis or analyze the complete repository.
- Custom static checks for security patterns such as secrets, insecure communication, injection and XSS, depending on language/rule coverage.
- Semgrep scanning with local custom and community rules.
- Normalized findings with severity, source location, rule identifiers, code context and recommendations when available.
- Deduplication of overlapping Semgrep findings, preserving originating rule IDs.
- Security summary/statistics and detailed finding cards in the dashboard.
- Profile with analysis history, job deletion and Markdown export.
- Repository privacy notice, a first-analysis acknowledgement dialog on the home page, and a privacy information page at `/datenschutz`.

**Limitations:** Rule coverage varies by language. The privacy acknowledgement currently uses browser `sessionStorage` on the home page; it is not a backend-enforced authorization or legal consent record. The profile's direct repository submission path must be reviewed separately before claiming the same dialog is enforced there. The privacy page contains unfinished legal/operational details.

## Architecture

```text
Next.js frontend (port 3000)
        |
        v
FastAPI backend (port 8000) ---- SQLite (/data/code_platform.db)
        |                               |
        +--> Background worker --------+--> /data/repos/<job_id>
        |
        +--> Python analyzer
                 |-- Custom security rules
                 |-- Semgrep (local YAML rules)
                 +-- Normalization / deduplication
```

Typical workflow:

1. The user authenticates and submits a GitHub repository.
2. The backend creates a job; the worker clones the repository and indexes its files.
3. The dashboard displays indexed files and supports a file-level or full-repository scan.
4. The analyzer runs custom checks and Semgrep; the backend stores findings and job status.
5. The frontend displays security statistics, findings and available reports.

## Repository layout

```text
code-platform/
├── docker-compose.yml
├── frontend/
│   ├── app/
│   │   ├── page.tsx                    # Login / repository submission
│   │   ├── profile/page.tsx           # GitHub repositories and history
│   │   ├── dashboard/[jobId]/page.tsx # Job status and findings
│   │   └── datenschutz/page.tsx       # Privacy information
│   ├── components/
│   │   ├── SecurityFindings.tsx
│   │   ├── SecurityOverview.tsx
│   │   ├── RepositoryPrivacyNotice.tsx
│   │   └── RepositoryPrivacyDialog.tsx
│   └── lib/
│       ├── api.ts
│       └── privacyAcknowledgement.ts
├── backend/
│   ├── app/                           # FastAPI routes/models/schemas
│   ├── data/                          # Local SQLite DB and cloned repos
│   └── .env                           # Local secrets (do not commit)
├── worker/app/                        # Repository cloning / indexing
├── analyzer/
│   ├── app/                           # Scanning and result storage
│   └── semgrep-rules/
│       ├── custom/                    # Project-owned YAML rules
│       └── community/                 # Local external rules checkout
└── docs/
```

## Requirements

- Docker Desktop with Docker Compose
- Git
- Optional for running parts outside Docker: Node.js/npm, Python 3.12 and `uv`

The backend project currently targets **Python 3.12**. Keep local Python versions, Docker images and `uv.lock` consistent across team members.

## Quick start (Docker Compose)

Run from the project root in PowerShell:

```powershell
git clone https://github.com/AL-Emprator/Code-analysis.git
cd Code-analysis

# Set up backend/.env first (see below)
docker compose up -d --build
docker compose ps
docker compose logs -f backend worker
```

Open:

- Frontend: http://localhost:3000
- FastAPI documentation: http://localhost:8000/docs
- Privacy page: http://localhost:3000/datenschutz

Stop services without deleting volumes:

```powershell
docker compose down
```

**Do not use `docker compose down -v` unless you intentionally want to remove the Compose-managed volumes. Back up your local database and repository copies before changing volume mounts.**

## Environment configuration

Create `backend/.env` locally. Configure the exact credentials and keys required by `backend/app/api/auth.py` and the project's environment settings, including GitHub OAuth credentials for GitHub sign-in. Do **not** commit real credentials or tokens.

The Compose file sets these backend/worker values:

```dotenv
DATABASE_URL=sqlite:////data/code_platform.db
REPOSITORY_STORAGE_DIR=/data/repos
ANALYZER_COMMAND=uv run python -m app.analyzer
ANALYZER_WORKDIR=/analyzer
```

These paths refer to the **container**, not the Windows host. The Compose file bind-mounts `./backend/data` to `/data` for backend and worker. Check the actual mount before removing any old named volumes:

```powershell
docker inspect code-platform-backend-1 --format '{{json .Mounts}}'
docker compose exec backend ls -lah /data
```

The container name may differ depending on the cloned directory name.

## Semgrep rules — important for teammates

The Python runner currently references these local configurations:

```text
/analyzer/semgrep-rules/community/c/lang/security
/analyzer/semgrep-rules/community/python/lang/security
/analyzer/semgrep-rules/custom/vue-security.yml
```

The `community/` checkout is **not included by Git** in this project. Every developer who needs these scans must provision it locally:

```powershell
git clone https://github.com/semgrep/semgrep-rules.git analyzer/semgrep-rules/community
```

If the directory already exists, inspect or update that checkout instead of cloning over it. For reproducibility, the team should agree on and pin a specific community-rules commit.

Verify inside the backend container (it mounts `./analyzer` at `/analyzer`):

```powershell
docker compose exec backend sh -c "cd /analyzer && uv run semgrep --version"
docker compose exec backend ls /analyzer/semgrep-rules/community/python/lang/security
docker compose exec backend sh -c "cd /analyzer && uv run semgrep scan --config /analyzer/semgrep-rules/custom/vue-security.yml --json --metrics=off /data/repos/JOB_ID"
```

Replace `JOB_ID` with an existing job directory. A scan returning zero findings does not by itself demonstrate that the correct rules ran successfully: inspect errors, logs, and the configured paths. Repositories at different commits may also give different results.

## Development and diagnostics

```powershell
# Services
docker compose up -d --build
docker compose ps
docker compose restart backend
docker compose logs -f backend
docker compose logs -f worker

# Container shell and runtime checks
docker compose exec backend sh
docker compose exec backend uv run python --version

# Analyzer: scan a repository or one indexed file
docker compose exec backend sh -c "cd /analyzer && uv run python -m app.analyzer repo JOB_ID"
docker compose exec backend sh -c "cd /analyzer && uv run python -m app.analyzer file JOB_ID FILE_ID"

# Frontend type-check
docker compose exec frontend npx tsc --noEmit

# List cloned repositories
docker compose exec backend ls -lah /data/repos
```

### SQLite database

Local bind-mounted database: `backend/data/code_platform.db` (container: `/data/code_platform.db`).

```powershell
# List analysis jobs
docker compose exec backend python -c "import sqlite3; db=sqlite3.connect('/data/code_platform.db'); print(db.execute('SELECT id, status, repo_url FROM analysis_jobs ORDER BY created_at DESC LIMIT 10').fetchall()); db.close()"

# Inspect stored result summaries
docker compose exec backend python -c "import sqlite3; db=sqlite3.connect('/data/code_platform.db'); print(db.execute('SELECT job_id, file_path, summary FROM analysis_results ORDER BY created_at DESC LIMIT 10').fetchall()); db.close()"

# Consistent SQLite backup (saved in /data)
docker compose exec backend python -c "import sqlite3; src=sqlite3.connect('/data/code_platform.db'); dst=sqlite3.connect('/data/code_platform_backup.db'); src.backup(dst); dst.close(); src.close()"
```

The results table stores summaries, issue text and structured JSON findings. Do not commit database files, cloned repositories or secrets.

## Privacy and security notes

Starting an analysis causes the selected repository to be cloned into local storage and scanned. Analysis metadata and results are stored in SQLite; findings may contain code excerpts. Only submit repositories that you are authorized to process.

- `RepositoryPrivacyNotice` explains repository access near the submission UI.
- `RepositoryPrivacyDialog` is used on the home page before first submission in a browser-tab session.
- `frontend/lib/privacyAcknowledgement.ts` records acknowledgement in `sessionStorage`. This is **not** server-enforced and is **not** proof of GDPR consent.
- The privacy information page is available at `/datenschutz`, but still contains placeholders requiring verification before production use.
- Review GitHub OAuth scopes, token protection, access controls, deletion behavior, retention, backups and external service contacts before deployment.
- Do not assume deleting a job automatically removes every copy or backup without verifying implementation.

## Current development considerations

- Static analysis can produce false positives and false negatives; confirm reported vulnerabilities before acting on them.
- Semgrep deduplication groups potentially overlapping rule matches and retains their rule identifiers; it is heuristic, not proof that two alerts are semantically identical.
- Team environments need consistent Python versions, lockfiles and locally provisioned community rules.
- Production readiness still requires hardening, privacy/legal review and end-to-end testing.

For API routes and request schemas, use the live OpenAPI documentation at **http://localhost:8000/docs**.
