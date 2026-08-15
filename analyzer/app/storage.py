import os
from pathlib import Path

REPOSITORY_STORAGE_DIR = os.getenv(
    "REPOSITORY_STORAGE_DIR",
    "/data/repos",
)


def get_repository_directory(job_id: str) -> Path:
    return Path(REPOSITORY_STORAGE_DIR) / job_id


def read_repository_file(job_id: str, file_path: str) -> str:
    repository_directory = get_repository_directory(job_id).resolve()

    absolute_path = (repository_directory / file_path).resolve()

    if not str(absolute_path).startswith(str(repository_directory)):
        raise ValueError("UngÃ¼ltiger Dateipfad.")

    if not absolute_path.exists():
        raise FileNotFoundError(f"Datei wurde nicht gefunden: {file_path}")

    if not absolute_path.is_file():
        raise ValueError(f"Pfad ist keine Datei: {file_path}")

    return absolute_path.read_text(
        encoding="utf-8",
        errors="replace",
    )