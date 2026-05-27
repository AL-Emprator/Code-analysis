@AGENTS.md
# Agent Instructions

Project: Code Analysis Platform

Always follow the current project structure:

- frontend: Next.js, React, TypeScript, Tailwind CSS
- backend: FastAPI, Python, PostgreSQL
- analyzer: Python security scanner
- worker: Celery / Redis
- docs: project documentation

Important rules:
- Do not add real secrets, API keys, or tokens.
- Use GitHub repository linking instead of ZIP/code upload.
- Keep code clean, typed, and readable.
- Use comments for backend integration points.
- Frontend should be UI/UX only unless explicitly requested.
- Backend should expose clean REST API endpoints.
- Analyzer should return JSON results.
- Docker should be kept working after changes.

Security focus:
- hardcoded secrets
- SQL injection
- XSS
- command injection
- insecure HTTP URLs
- unsafe file operations

Project status:
- Frontend home page is now a responsive dark-theme Login / Sign Up UI for the Code Analysis Platform.
- The page includes email, password, GitHub OAuth entry point, and GitHub repository URL inputs.
- Backend integration is still pending and is documented with inline comments in the frontend page.

# Important Note 
After major changes, please update this file (CLAUDE.md). Keep this file up to date with the project’s status.