import time
from datetime import datetime, timezone

from sqlalchemy import delete, select

from app.database import create_database_session
from app.models import AnalysisFile, AnalysisJob

import os
import shutil
import subprocess
import tempfile
from pathlib import Path


POLL_INTERVAL_SECONDS = 2

IGNORED_DIRECTORIES = {
    ".git",
    "node_modules",
    ".venv",
    "venv",
    "env",
    "__pycache__",
    ".next",
    "dist",
    "build",
    "coverage",
    "vendor",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
}

IGNORED_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".ico",
    ".pdf",
    ".zip",
    ".tar",
    ".gz",
    ".exe",
    ".dll",
    ".so",
    ".dylib",
    ".pyc",
    ".class",
    ".lock",
}

MAX_FILE_SIZE_BYTES = 500_000

# Define the directory where repository clones will be stored.
REPOSITORY_STORAGE_DIR = os.getenv(
    "REPOSITORY_STORAGE_DIR",
    "/data/repos",
)


# Get the directory path for a specific job's repository clone.
def get_repository_directory(job_id: str) -> Path:
    return Path(REPOSITORY_STORAGE_DIR) / job_id

# Detect the programming language of a file based on its extension.
def detect_language(filename: str, extension: str | None) -> str | None:
    if extension == ".py":
        return "Python"

    if extension in {".ts", ".tsx"}:
        return "TypeScript"

    if extension in {".js", ".jsx"}:
        return "JavaScript"

    if extension == ".md":
        return "Markdown"

    if extension == ".json":
        return "JSON"

    return None

# Clone the repository to the target directory. If the target directory already exists, it will be removed before cloning.
def clone_repository(repo_url: str, target_directory: str) -> None:

    if target_directory.exists():
        shutil.rmtree(target_directory)


    target_directory.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    subprocess.run(
        [
            "git",
            "clone",
            "--depth",
            "1",
            repo_url,
            str(target_directory),
        ],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        timeout=120,
    )

# Determine if a directory should be skipped based on its name.
def should_skip_directory(directory_name: str) -> bool:
    return directory_name in IGNORED_DIRECTORIES


# Determine if a file should be skipped based on its extension and size.
def should_skip_file(path: Path) -> bool:
    if path.suffix.lower() in IGNORED_EXTENSIONS:
        return True

    try:
        if path.stat().st_size > MAX_FILE_SIZE_BYTES:
            return True
    except OSError:
        return True

    return False


# Create files from repository clones the repository, 
# walks through its files, and creates AnalysisFile objects for each file that is not skipped based on the defined criteria.
def create_files_from_repository(
    job_id: str,
    repo_url: str,
) -> list[AnalysisFile]:
    now = datetime.now(timezone.utc)
    files: list[AnalysisFile] = []

    repository_directory = get_repository_directory(job_id)

    clone_repository(
        repo_url=repo_url,
        target_directory=repository_directory,
    )

    root_path = repository_directory

    for current_root, directory_names, filenames in os.walk(root_path):
        directory_names[:] = [
            directory_name
            for directory_name in directory_names
            if not should_skip_directory(directory_name)
        ]

        for filename in filenames:
            absolute_path = Path(current_root) / filename

            if should_skip_file(absolute_path):
                continue

            relative_path = absolute_path.relative_to(root_path)
            normalized_path = relative_path.as_posix()

            extension = absolute_path.suffix.lower() or None

            try:
                size_bytes = absolute_path.stat().st_size
            except OSError:
                continue

            files.append(
                AnalysisFile(
                    job_id=job_id,
                    path=normalized_path,
                    filename=filename,
                    extension=extension,
                    language=detect_language(filename, extension),
                    size_bytes=size_bytes,
                    is_selectable=True,
                    created_at=now,
                )
            )

    return files


# Process_job is responsible for processing a single job. 
#It updates the job status, clones the repository, indexes the files, and handles any errors that may occur during the process.
def process_job(job_id: str) -> None:
    database = create_database_session()

    try:
        job = database.scalar(
            select(AnalysisJob).where(
                AnalysisJob.id == job_id
            )
        )

        if job is None:
            return

        print(f"[worker] Processing job {job.id} for {job.repo_url}")

        job.status = "indexing"
        job.started_at = datetime.now(timezone.utc)
        database.commit()

        database.execute(
            delete(AnalysisFile).where(
                AnalysisFile.job_id == job.id
            )
        )

        job.status = "cloning"
        job.started_at = datetime.now(timezone.utc)
        database.commit()

        repository_files = create_files_from_repository(
            job_id=job.id,
            repo_url=job.repo_url,
        )

        job.status = "indexing"
        database.commit()

        database.execute(
            delete(AnalysisFile).where(
                AnalysisFile.job_id == job.id
            )
        )

        database.add_all(repository_files)

        job.status = "ready_for_selection"
        database.commit()

        print(
            f"[worker] Job {job.id} is ready_for_selection "
            f"with {len(repository_files)} files"
        )

    except Exception as error:
        database.rollback()

        job = database.scalar(
            select(AnalysisJob).where(
                AnalysisJob.id == job_id
            )
        )

        if job is not None:
            job.status = "failed"
            job.error_message = str(error)
            job.completed_at = datetime.now(timezone.utc)
            database.commit()

        print(f"[worker] Job {job_id} failed: {error}")

    finally:
        database.close()

# Run_worker is the main loop of the worker process. 
#It continuously polls the database for queued jobs, processes them, and handles any errors that may occur during the process.
def run_worker() -> None:
    print("[worker] Worker started")

    while True:
        database = create_database_session()

        try:
            job = database.scalar(
                select(AnalysisJob)
                .where(AnalysisJob.status == "queued")
                .order_by(AnalysisJob.created_at.asc())
            )

            if job is None:
                time.sleep(POLL_INTERVAL_SECONDS)
                continue

            job_id = job.id

        finally:
            database.close()

        process_job(job_id)


if __name__ == "__main__":
    run_worker()