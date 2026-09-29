import sys
from datetime import datetime, timezone

from sqlalchemy import delete, select

from app.database import create_database_session
from app.models import AnalysisFile, AnalysisJob, AnalysisResult
from app.storage import read_repository_file
from app.storage import get_repository_directory



#rules bughunting
from app.findings import Finding, format_findings_as_text
from app.rules.communication import scan_insecure_communication
from app.rules.injections import scan_command_injection, scan_sql_injection
from app.rules.php import scan_php_security
from app.rules.python import scan_python_security
from app.rules.secrets import scan_secrets
from app.rules.xss import scan_xss

from app.semgrep_runner import run_semgrep_scan
from app.semgrep_normalizer import normalize_semgrep_results
from app.semgrep_normalizer import format_semgrep_findings_as_text

#Das ist erstmal eine einfache Analyse ohne KI. Sie zählt Zeilen, Funktionen, Klassen, TODOs und lange Zeilen.

def analyze_code_content(
    content: str,
    file_path: str,
    language: str | None,
) -> tuple[str, str]:
    lines = content.splitlines()

    line_count = len(lines)
    character_count = len(content)

    function_count = sum(
        1 for line in lines if line.strip().startswith("def ")
    )

    class_count = sum(
        1 for line in lines if line.strip().startswith("class ")
    )

    todo_count = sum(
        1 for line in lines if "TODO" in line or "FIXME" in line
    )

    security_findings = run_security_analysis(
        content=content,
        file_path=file_path,
        language=language,
    )

    summary = (
        f"Datei {file_path} wurde analysiert.\n\n"
        f"Zeilen: {line_count}\n"
        f"Zeichen: {character_count}\n"
        f"Funktionen: {function_count}\n"
        f"Klassen: {class_count}\n"
        f"TODO/FIXME-Kommentare: {todo_count}\n"
        f"Gefundene Sicherheitsprobleme: {len(security_findings)}"
    )

    issues = format_findings_as_text(security_findings)

    return summary, issues


# Analyze a single file for a given job
def analyze_file(job_id: str, file_id: int) -> None:
    database = create_database_session()

    try:
        job = database.scalar(
            select(AnalysisJob).where(
                AnalysisJob.id == job_id,
            )
        )

        if job is None:
            raise ValueError("Analyse-Job wurde nicht gefunden.")

        analysis_file = database.scalar(
            select(AnalysisFile).where(
                AnalysisFile.id == file_id,
                AnalysisFile.job_id == job.id,
            )
        )

        if analysis_file is None:
            raise ValueError("Analyse-Datei wurde nicht gefunden.")

        job.status = "analyzing"
        job.error_message = None
        database.commit()

        content = read_repository_file(
            job_id=job.id,
            file_path=analysis_file.path,
        )

        summary, custom_issues = analyze_code_content(
            content=content,
            file_path=analysis_file.path,
            language=analysis_file.language,
        )

        repository_path = get_repository_directory(job.id)

        semgrep_issues = "Keine Semgrep Findings gefunden."

        try:
            semgrep_output = run_semgrep_scan(str(repository_path))
            semgrep_findings = normalize_semgrep_results(semgrep_output)

            semgrep_findings_by_file = group_semgrep_findings_by_file(
                findings=semgrep_findings,
                repository_path=str(repository_path),
            )

            file_semgrep_findings = semgrep_findings_by_file.get(
                analysis_file.path,
                [],
            )

            semgrep_issues = format_semgrep_findings_as_text(
                file_semgrep_findings
            )

            print(
                f"[analyzer] Semgrep file scan completed for job={job.id}, "
                f"file={analysis_file.path}, "
                f"findings={len(file_semgrep_findings)}"
            )

        except Exception as semgrep_error:
            print(
                f"[analyzer] Semgrep file scan failed for job={job.id}, "
                f"file={analysis_file.path}: {semgrep_error}"
            )

            semgrep_issues = (
                "Semgrep konnte für diese Datei nicht ausgeführt werden. "
                f"Fehler: {semgrep_error}"
            )

        combined_issues = (
            custom_issues
            + "\n\n"
            + "=== Semgrep Findings ===\n"
            + semgrep_issues
        )

        database.execute(
            delete(AnalysisResult).where(
                AnalysisResult.job_id == job.id,
                AnalysisResult.file_id == analysis_file.id,
            )
        )

        database.add(
            AnalysisResult(
                job_id=job.id,
                file_id=analysis_file.id,
                file_path=analysis_file.path,
                summary=summary,
                issues=combined_issues,
                created_at=datetime.now(timezone.utc),
            )
        )

        job.status = "completed"
        job.completed_at = datetime.now(timezone.utc)
        job.error_message = None

        database.commit()

        print(
            f"[analyzer] File analysis completed for job={job.id}, "
            f"file={analysis_file.path}"
        )

    except Exception as error:
        database.rollback()

        job = database.scalar(
            select(AnalysisJob).where(
                AnalysisJob.id == job_id,
            )
        )

        if job is not None:
            job.status = "failed"
            job.error_message = str(error)
            job.completed_at = datetime.now(timezone.utc)
            database.commit()

        print(f"[analyzer] File analysis failed: {error}")
        raise

    finally:
        database.close()


def group_semgrep_findings_by_file(
    findings: list[dict],
    repository_path: str,
) -> dict[str, list[dict]]:
    grouped: dict[str, list[dict]] = {}

    normalized_repository_path = repository_path.replace("\\", "/").rstrip("/")

    for finding in findings:
        file_path = finding.get("file_path")

        if not file_path:
            continue

        normalized_file_path = str(file_path).replace("\\", "/")

        if normalized_file_path.startswith(normalized_repository_path + "/"):
            normalized_file_path = normalized_file_path[
                len(normalized_repository_path) + 1:
            ]

        grouped.setdefault(normalized_file_path, []).append(finding)

    return grouped


def analyze_repository(job_id: str) -> None:
    database = create_database_session()

    try:
        job = database.scalar(
            select(AnalysisJob).where(
                AnalysisJob.id == job_id,
            )
        )

        if job is None:
            raise ValueError("Analyse-Job wurde nicht gefunden.")

        job.status = "analyzing"
        job.error_message = None
        database.commit()

        analysis_files = database.scalars(
            select(AnalysisFile)
            .where(
                AnalysisFile.job_id == job.id,
                AnalysisFile.is_selectable.is_(True),
            )
            .order_by(AnalysisFile.path.asc())
        ).all()

        if not analysis_files:
            raise ValueError("Keine analysierbaren Dateien gefunden.")

        repository_path = get_repository_directory(job.id)

        semgrep_findings: list[dict] = []
        semgrep_findings_by_file: dict[str, list[dict]] = {}

        try:
            semgrep_output = run_semgrep_scan(str(repository_path))
            semgrep_findings = normalize_semgrep_results(semgrep_output)

            semgrep_findings_by_file = group_semgrep_findings_by_file(
                findings=semgrep_findings,
                repository_path=str(repository_path),
            )

            print(
                f"[analyzer] Semgrep scan completed for job={job.id}, "
                f"findings={len(semgrep_findings)}"
            )

        except Exception as semgrep_error:
            print(
                f"[analyzer] Semgrep scan failed for job={job.id}: "
                f"{semgrep_error}"
            )

            semgrep_findings = []
            semgrep_findings_by_file = {}

        analyzed_count = 0
        failed_files: list[str] = []

        for analysis_file in analysis_files:
            try:
                content = read_repository_file(
                    job_id=job.id,
                    file_path=analysis_file.path,
                )

                summary, custom_issues = analyze_code_content(
                    content=content,
                    file_path=analysis_file.path,
                    language=analysis_file.language,
                )

                file_semgrep_findings = semgrep_findings_by_file.get(
                    analysis_file.path,
                    [],
                )

                semgrep_issues = format_semgrep_findings_as_text(
                    file_semgrep_findings
                )

                combined_issues = (
                    custom_issues
                    + "\n\n"
                    + "=== Semgrep Findings ===\n"
                    + semgrep_issues
                )

                database.execute(
                    delete(AnalysisResult).where(
                        AnalysisResult.job_id == job.id,
                        AnalysisResult.file_id == analysis_file.id,
                    )
                )

                database.add(
                    AnalysisResult(
                        job_id=job.id,
                        file_id=analysis_file.id,
                        file_path=analysis_file.path,
                        summary=summary,
                        issues=combined_issues,
                        created_at=datetime.now(timezone.utc),
                    )
                )

                analyzed_count += 1

            except Exception as file_error:
                failed_files.append(
                    f"{analysis_file.path}: {file_error}"
                )

        if analyzed_count == 0:
            raise ValueError(
                "Keine Datei konnte analysiert werden. "
                + "; ".join(failed_files[:5])
            )

        job.status = "completed"
        job.completed_at = datetime.now(timezone.utc)

        semgrep_summary = (
            f" Semgrep Findings insgesamt: {len(semgrep_findings)}."
            if semgrep_findings
            else " Semgrep hat keine Findings gefunden oder konnte nicht ausgeführt werden."
        )

        if failed_files:
            job.error_message = (
                f"{analyzed_count} Datei(en) analysiert. "
                f"{len(failed_files)} Datei(en) konnten nicht analysiert werden."
                + semgrep_summary
            )
        else:
            job.error_message = semgrep_summary.strip()

        database.commit()

        print(
            f"[analyzer] Repository analysis completed for job={job.id}, "
            f"files={analyzed_count}, failed={len(failed_files)}, "
            f"semgrep_findings={len(semgrep_findings)}"
        )

    except Exception as error:
        database.rollback()

        job = database.scalar(
            select(AnalysisJob).where(
                AnalysisJob.id == job_id,
            )
        )

        if job is not None:
            job.status = "failed"
            job.error_message = str(error)
            job.completed_at = datetime.now(timezone.utc)
            database.commit()

        print(f"[analyzer] Repository analysis failed: {error}")
        raise

    finally:
        database.close()

        
# Rules for security analysis 
def run_security_analysis(
    content: str,
    file_path: str,
    language: str | None,
) -> list[Finding]:
    findings: list[Finding] = []

    findings.extend(scan_secrets(content))
    findings.extend(scan_insecure_communication(content))
    findings.extend(scan_sql_injection(content))
    findings.extend(scan_command_injection(content))
    findings.extend(scan_xss(content))

    lower_file_path = file_path.lower()

    if lower_file_path.endswith(".php") or language == "PHP":
        findings.extend(scan_php_security(content))

    if lower_file_path.endswith(".py") or language == "Python":
        findings.extend(scan_python_security(content))

    return findings


#Hilf Funktion, die Findings nach Datei gruppiert, um die Ausgabe zu verbessern.
#Semgrep einmal pro Repo laufen lassen, dann Findings nach Datei gruppieren.
def group_findings_by_file(findings: list[dict]) -> dict[str, list[dict]]:
    grouped: dict[str, list[dict]] = {}

    for finding in findings:
        file_path = finding.get("file_path")

        if not file_path:
            continue

        # Semgrep liefert manchmal absolute Pfade.
        # Wir wollen nur den relativen Pfad im Repo.
        normalized_path = file_path.replace("\\", "/")

        marker = "/repos/"
        if marker in normalized_path:
            parts = normalized_path.split(marker, 1)[1].split("/", 1)
            if len(parts) == 2:
                normalized_path = parts[1]

        grouped.setdefault(normalized_path, []).append(finding)

    return grouped


def main() -> None:
    if len(sys.argv) not in {3, 4}:
        print("Usage:")
        print("  Datei analysieren: python -m app.analyzer file <job_id> <file_id>")
        print("  Repo analysieren:  python -m app.analyzer repo <job_id>")
        raise SystemExit(1)

    mode = sys.argv[1]

    if mode == "file":
        if len(sys.argv) != 4:
            print("Usage: python -m app.analyzer file <job_id> <file_id>")
            raise SystemExit(1)

        job_id = sys.argv[2]
        file_id = int(sys.argv[3])

        analyze_file(
            job_id=job_id,
            file_id=file_id,
        )

        return

    if mode == "repo":
        if len(sys.argv) != 3:
            print("Usage: python -m app.analyzer repo <job_id>")
            raise SystemExit(1)

        job_id = sys.argv[2]

        analyze_repository(
            job_id=job_id,
        )

        return

    print(f"Unbekannter Analyse-Modus: {mode}")
    raise SystemExit(1)


if __name__ == "__main__":
    main()