import sys
from datetime import datetime, timezone

from sqlalchemy import delete, select

from app.database import create_database_session
from app.models import AnalysisFile, AnalysisJob, AnalysisResult
from app.storage import read_repository_file



#rules bughunting
from app.findings import Finding, format_findings_as_text
from app.rules.communication import scan_insecure_communication
from app.rules.injections import scan_command_injection, scan_sql_injection
from app.rules.php import scan_php_security
from app.rules.python import scan_python_security
from app.rules.secrets import scan_secrets
from app.rules.xss import scan_xss

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
                AnalysisFile.job_id == job_id,
            )
        )

        if analysis_file is None:
            raise ValueError("Datei wurde nicht gefunden.")

        job.status = "analyzing"
        database.commit()

        content = read_repository_file(
            job_id=job.id,
            file_path=analysis_file.path,
        )

        summary, issues = analyze_code_content(
            content=content,
            file_path=analysis_file.path,
            language=analysis_file.language,
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
                issues=issues,
                created_at=datetime.now(timezone.utc),
            )
        )

        job.status = "completed"
        job.completed_at = datetime.now(timezone.utc)
        job.error_message = None

        database.commit()

        print(
            f"[analyzer] Analysis completed for job={job.id}, file={analysis_file.path}"
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

        print(f"[analyzer] Analysis failed: {error}")
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


def main() -> None:
    if len(sys.argv) != 3:
        print("Usage: python -m app.analyzer <job_id> <file_id>")
        raise SystemExit(1)

    job_id = sys.argv[1]
    file_id = int(sys.argv[2])

    analyze_file(
        job_id=job_id,
        file_id=file_id,
    )


if __name__ == "__main__":
    main()