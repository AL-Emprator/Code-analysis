import json
import subprocess
from pathlib import Path
from typing import Any


def run_semgrep_scan(repository_path: str) -> dict[str, Any]:
    repo_path = Path(repository_path)

    if not repo_path.exists() or not repo_path.is_dir():
        raise RuntimeError(f"Repository path does not exist: {repository_path}")

    command = [
        "uv",
        "run",
        "semgrep",
        "scan",
        "--config",
        "/analyzer/semgrep-rules/community/c/lang/security",
        "--config",
        "/analyzer/semgrep-rules/community/python/lang/security",
        "--json",
        "--metrics=off",
        str(repo_path),
    ]

    completed_process = subprocess.run(
        command,
        cwd="/analyzer",
        capture_output=True,
        text=True,
        timeout=180,
    )

    # Semgrep kann Exit-Code 1 zurückgeben, wenn Findings gefunden wurden.
    # Deshalb nicht sofort bei returncode != 0 abbrechen.
    if not completed_process.stdout:
        raise RuntimeError(
            f"Semgrep produced no JSON output. stderr: {completed_process.stderr}"
        )

    try:
        return json.loads(completed_process.stdout)
    except json.JSONDecodeError as error:
        raise RuntimeError(
            f"Could not parse Semgrep JSON output. stderr: {completed_process.stderr}"
        ) from error