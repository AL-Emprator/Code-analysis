# Docker Cheat Sheet – Code Analysis Platform

Praktische Befehle für **PowerShell auf Windows**. Alle Befehle aus dem Projektverzeichnis ausführen:

```powershell
cd D:\code-platform
```

> **Sicherheit:** `docker compose down -v`, `docker volume rm` und `rm -rf` können Daten löschen. Vorher immer Datenbank und Mounts prüfen. Job-IDs in Beispielen ersetzen.

## 1. Docker Compose: Starten und Verwalten

| Aufgabe | Befehl |
|---|---|
| Services starten | `docker compose up -d` |
| Neu bauen und starten | `docker compose up -d --build` |
| Status prüfen | `docker compose ps` |
| Services stoppen | `docker compose stop` |
| Services neu starten | `docker compose restart` |
| Backend neu starten | `docker compose restart backend` |
| Worker neu starten | `docker compose restart worker` |
| Frontend neu starten | `docker compose restart frontend` |
| Container entfernen, Daten-Volumes behalten | `docker compose down` |
| Ohne Build-Cache bauen | `docker compose build --no-cache` |
| Konfiguration prüfen | `docker compose config` |
| Optionalen Analyzer-Service starten | `docker compose --profile tools run --rm analyzer ...` |

Bei Änderungen in gemounteten `.py`-/`.tsx`-Dateien ist meist **kein Image-Build** notwendig. Bei Dockerfiles oder Abhängigkeiten neu bauen.

## 2. Logs / Fehlersuche

```powershell
docker compose logs -f
docker compose logs -f backend
docker compose logs -f worker
docker compose logs -f frontend
docker compose logs --tail=100 backend
docker compose logs -f backend worker
```

`Ctrl+C` beendet die Log-Anzeige, nicht den Container.

## 3. Shell und Python im Container

```powershell
docker compose exec backend sh
docker compose exec worker sh
docker compose exec frontend sh
docker compose exec backend uv run python --version
docker compose exec worker uv run python --version
docker compose exec backend sh -c "cd /analyzer && uv run python --version"
```

`exec` verwendet einen laufenden Container, `run --rm` einen neuen temporären Container.

## 4. Datenbank: SQLite

Die DB wird im Container erwartet unter `/data/code_platform.db`. Bei aktivem Bind-Mount `./backend/data:/data` liegt sie auf Windows unter `backend/data/code_platform.db`.

### Tabellen anzeigen

```powershell
docker compose exec backend python -c "import sqlite3; db=sqlite3.connect('/data/code_platform.db'); print(db.execute('SELECT name FROM sqlite_master WHERE type=char(116)||char(97)||char(98)||char(108)||char(101)').fetchall()); db.close()"
```

### Analyse-Jobs

```powershell
docker compose exec backend python -c "import sqlite3; db=sqlite3.connect('/data/code_platform.db'); print(db.execute('SELECT id, repo_url, status FROM analysis_jobs ORDER BY created_at DESC LIMIT 10').fetchall()); db.close()"
```

### Dateien eines Jobs

```powershell
docker compose exec backend python -c "import sqlite3; db=sqlite3.connect('/data/code_platform.db'); print(db.execute('SELECT id, path, language FROM analysis_files WHERE job_id=?', ('job_DEINE_ID',)).fetchall()); db.close()"
```

### Ergebnisse und Semgrep-Findings

```powershell
docker compose exec backend python -c "import sqlite3; db=sqlite3.connect('/data/code_platform.db'); print(db.execute('SELECT job_id, file_path, substr(issues,1,300) FROM analysis_results ORDER BY created_at DESC LIMIT 10').fetchall()); db.close()"

docker compose exec backend python -c "import sqlite3; db=sqlite3.connect('/data/code_platform.db'); print(db.execute('SELECT file_path, json_array_length(findings_json) FROM analysis_results WHERE findings_json IS NOT NULL').fetchall()); db.close()"
```

### Tabellenschema und Backup

```powershell
docker compose exec backend python -c "import sqlite3; db=sqlite3.connect('/data/code_platform.db'); print(db.execute('PRAGMA table_info(analysis_results)').fetchall()); db.close()"

docker compose exec backend python -c "import sqlite3; src=sqlite3.connect('/data/code_platform.db'); dst=sqlite3.connect('/data/code_platform_backup.db'); src.backup(dst); src.close(); dst.close(); print('Backup OK')"
```

## 5. Geklonte Repositories

Der Worker klont in `/data/repos/<job_id>`:

```powershell
docker compose exec backend ls -lah /data
docker compose exec backend ls -lah /data/repos
docker compose exec backend find /data/repos/job_DEINE_ID -maxdepth 3 -type f
docker compose exec backend cat /data/repos/job_DEINE_ID/src/components/TestComp.vue
docker compose exec backend grep -n 'v-html' /data/repos/job_DEINE_ID/src/components/TestComp.vue
```

Zum Löschen **bevorzugt den authentifizierten Delete-Endpoint der Plattform** verwenden, damit Datenbankeinträge und Repo-Verzeichnis zusammen entfernt werden. `rm -rf /data/repos/job_DEINE_ID` löscht nur Dateien und ist irreversibel.

## 6. Analyzer ausführen

Der Backend-Container startet den Analyzer in `/analyzer`:

```powershell
# Gesamtes Repository
docker compose exec backend sh -c "cd /analyzer && uv run python -m app.analyzer repo job_DEINE_ID"

# Einzelne Datei
docker compose exec backend sh -c "cd /analyzer && uv run python -m app.analyzer file job_DEINE_ID FILE_ID"
```

## 7. Semgrep prüfen und testen

```powershell
# Installierte Version
docker compose exec backend sh -c "cd /analyzer && uv run semgrep --version"

# Lokale Custom Rules
docker compose exec backend sh -c "cd /analyzer && uv run semgrep scan --config /analyzer/semgrep-rules/custom --json --metrics=off /data/repos/job_DEINE_ID"

# Einzelne Vue Rule
docker compose exec backend sh -c "cd /analyzer && uv run semgrep scan --config /analyzer/semgrep-rules/custom/vue-security.yml --json --metrics=off /data/repos/job_DEINE_ID"

# Vorhandene Community Rules prüfen
docker compose exec backend ls -lah /analyzer/semgrep-rules/community
```

**Wichtig für Teammitglieder:** `analyzer/semgrep-rules/community/` ist ggf. in `.gitignore` und wird nicht durch `git pull` mitgeladen. Die Community-Regeln müssen lokal separat beschafft werden. Fehlende Config-Pfade oder `results: []` im JSON separat untersuchen.

## 8. Volumes und Mounts

```powershell
docker volume ls
docker compose ps -a
docker inspect code-platform-backend-1 --format '{{json .Mounts}}'
docker inspect code-platform-backend-1 --format '{{json .Mounts}}' | ConvertFrom-Json | Where-Object Destination -eq '/data' | Format-List Type,Source,Name,Destination
```

Beim Freund kann das Compose-Projekt anders heißen (z. B. `code-analysis-backend-1`). Für den tatsächlichen Containernamen `docker compose ps -a` verwenden.

**Nicht blind löschen:** `analysis_data`, Datenbanken, Repo-Ordner und unbekannte Volumes. Python-Venv-Volumes (`backend_venv`, `worker_venv`, `analyzer_venv`) dürfen nur nach Stoppen aller zugehörigen Container gezielt neu erstellt werden, nachdem die Python-Versionen und Lockfiles abgestimmt sind.

## 9. Frontend und Backend prüfen

```powershell
# TypeScript-Check
docker compose exec frontend npx tsc --noEmit

# API- und Server-Logs
docker compose logs --tail=200 backend
```

- Frontend: http://localhost:3000
- FastAPI Swagger: http://localhost:8000/docs

## 10. Häufige Fehler

| Symptom | Zuerst prüfen |
|---|---|
| `ModuleNotFoundError: semgrep` | `cd /analyzer && uv run semgrep --version`; Analyzer-venv und `pyproject.toml` |
| `0 Semgrep Findings` | Richtige Job-ID, Repo-Inhalt, Rule-Konfiguration und JSON-`errors` |
| `Path is not defined` | In `analyzer.py`: `from pathlib import Path` |
| `volume is in use` | `docker compose --profile tools down` und `docker ps -a --filter volume=VOLUME_NAME` |
| `git pull` überschreibt Änderungen | `git status`, ggf. `git stash push -u`, pull, `git stash pop` |
| Python-Abhängigkeits-Build scheitert | Dockerfile, `.python-version`, `pyproject.toml`, `uv.lock` konsistent halten |
| DB fehlt | Tatsächlichen `/data`-Mount kontrollieren; nicht versehentlich neue leere DB anlegen |

---

**Projektstruktur:** `frontend` (Next.js), `backend` (FastAPI), `worker` (Klonen/Indexieren), `analyzer` (Custom Rules + Semgrep), SQLite (`/data/code_platform.db`).
