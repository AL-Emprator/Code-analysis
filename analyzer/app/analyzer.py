import sys
from datetime import datetime, timezone

from sqlalchemy import delete, select

from app.database import create_database_session
from app.models import AnalysisFile, AnalysisJob, AnalysisResult
from app.storage import read_repository_file

#Das ist erstmal eine einfache Analyse ohne KI. Sie zählt Zeilen, Funktionen, Klassen, TODOs und lange Zeilen.

def analyze_code_content(content: str, file_path: str) -> tuple[str, str]:
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

    summary = (
        f"Datei {file_path} wurde analysiert.\n\n"
        f"Zeilen: {line_count}\n"
        f"Zeichen: {character_count}\n"
        f"Funktionen: {function_count}\n"
        f"Klassen: {class_count}\n"
        f"TODO/FIXME-Kommentare: {todo_count}"
    )

    issues_list: list[str] = []

    if line_count > 500:
        issues_list.append(
            "Die Datei ist sehr groß. Es könnte sinnvoll sein, sie in kleinere Module aufzuteilen."
        )

    if todo_count > 0:
        issues_list.append(
            f"Die Datei enthält {todo_count} TODO/FIXME-Kommentar(e)."
        )

    long_lines = [
        index + 1
        for index, line in enumerate(lines)
        if len(line) > 120
    ]

    if long_lines:
        issues_list.append(
            f"Es gibt {len(long_lines)} Zeile(n) mit mehr als 120 Zeichen."
        )

    if not issues_list:
        issues_list.append("Keine offensichtlichen einfachen Probleme gefunden.")

    issues = "\n".join(f"- {issue}" for issue in issues_list)

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