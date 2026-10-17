from typing import Any
from pathlib import Path
import re



def normalize_severity(severity: str) -> str:
    """Convert Semgrep severities into dashboard severity levels."""
    mapping = {
        "ERROR": "HIGH",
        "WARNING": "MEDIUM",
        "INFO": "LOW",
        "CRITICAL": "CRITICAL",
        "HIGH": "HIGH",
        "MEDIUM": "MEDIUM",
        "LOW": "LOW",
    }
    return mapping.get(str(severity).upper(), "INFO")


def normalize_references(values: Any) -> list[str]:
    """Normalize CWE and OWASP metadata into string lists."""
    if not values:
        return []
    if isinstance(values, str):
        return [values]
    if isinstance(values, list):
        return [str(value) for value in values]
    return []


def get_finding_title(rule_id: str, message: str) -> str:
    """Create short user-friendly titles for known vulnerability types."""
    rule = rule_id.lower()
    description = message.lower()

    if "v-html" in rule or "v-html" in description:
        return "Potential Cross-Site Scripting (XSS)"
    if "sql-injection" in rule or "sql injection" in description:
        return "Potential SQL Injection"
    if "command-injection" in rule or "command injection" in description:
        return "Potential Command Injection"
    if "use-after-free" in rule:
        return "Potential Use After Free"
    if "hardcoded" in rule or "hardcoded" in description:
        return "Hardcoded Secret"
    if "eval" in rule:
        return "Unsafe Code Execution"
    if "deserialization" in rule or "pickle" in rule:
        return "Potential Unsafe Deserialization"

    # Use Semgrep's message if no known title exists.
    clean_message = " ".join(message.split())
    if len(clean_message) <= 90:
        return clean_message or "Security Finding"

    return clean_message[:87].rstrip() + "..."


def get_recommendation(rule_id: str, fix: str | None) -> str:
    """Use a Semgrep fix when available or known remediation guidance."""
    if fix:
        return fix

    rule = rule_id.lower()

    if "v-html" in rule:
        return (
            "Avoid v-html for untrusted content. Use Vue text "
            "interpolation such as {{ userInput }} instead."
        )
    if "sql-injection" in rule:
        return "Use parameterized SQL queries instead of string concatenation."
    if "command-injection" in rule:
        return "Avoid passing untrusted input to shell commands."
    if "use-after-free" in rule:
        return "Do not access memory after free(). Review object ownership and lifetime."
    if "hardcoded" in rule:
        return "Remove embedded secrets and use secure secret management."
    if "eval" in rule:
        return "Avoid evaluating untrusted code. Use a safer structured alternative."

    return "Review the affected code and follow the security guidance for this rule."



def get_source_code_snippet(
    repository_path: str,
    file_path: str,
    start_line: int | None,
    end_line: int | None,
    context_lines: int = 2,
) -> str:
    """
    Read the actual source code from the cloned repository.

    Returns the matched lines plus surrounding context.
    Prevents reading files outside the repository.
    """

    if not file_path or not start_line or start_line < 1:
        return ""

    repository_root = Path(repository_path).resolve()
    source_path = Path(file_path)

    if not source_path.is_absolute():
        source_path = repository_root / source_path

    source_path = source_path.resolve()

    # Prevent path traversal and access outside the repository.
    if not source_path.is_relative_to(repository_root):
        return ""

    if not source_path.is_file():
        return ""

    try:
        source_lines = source_path.read_text(
            encoding="utf-8",
            errors="replace",
        ).splitlines()

        if start_line > len(source_lines):
            return ""

        last_matched_line = max(start_line, end_line or start_line)

        first_line = max(1, start_line - context_lines)
        last_line = min(
            len(source_lines),
            last_matched_line + context_lines,
        )

        snippet = []

        for line_number in range(first_line, last_line + 1):
            marker = ">" if start_line <= line_number <= last_matched_line else " "

            snippet.append(
                f"{marker} {line_number:4} | {source_lines[line_number - 1]}"
            )

        return "\n".join(snippet)

    except (OSError, UnicodeError):
        return ""


#gibt jetzt strukturierte Daten zurück.
def normalize_semgrep_results(
    semgrep_output: dict[str, Any],
    repository_path: str | None = None,

) -> list[dict[str, Any]]:
    """Convert Semgrep JSON into structured security findings."""

    normalized_findings: list[dict[str, Any]] = []

    for index, result in enumerate(semgrep_output.get("results", []), start=1):
        extra = result.get("extra") or {}
        metadata = extra.get("metadata") or {}
        start = result.get("start") or {}
        end = result.get("end") or {}

        rule_id = str(result.get("check_id") or "unknown-rule")
        message = str(extra.get("message") or "Security issue detected.")

        normalized_findings.append({
            "id": f"semgrep-{index}",
            "tool": "semgrep",
            "rule_id": rule_id,
            "title": get_finding_title(rule_id, message),
            "severity": normalize_severity(extra.get("severity", "INFO")),
            "original_severity": extra.get("severity", "INFO"),
            "message": message,
            "file_path": result.get("path"),
            "start_line": start.get("line"),
            "end_line": end.get("line"),
            "code": (
                get_source_code_snippet(
                    repository_path=repository_path,
                    file_path=result.get("path") or "",
                    start_line=start.get("line"),
                    end_line=end.get("line"),
                )
                if repository_path
                else ""
            ),
            "recommendation": get_recommendation(
                rule_id, extra.get("fix")
            ),
            "category": metadata.get("category"),
            "cwe": normalize_references(metadata.get("cwe")),
            "owasp": normalize_references(metadata.get("owasp")),
            "confidence": metadata.get("confidence"),
            "sources": [rule_id],
        })

    return normalized_findings



def format_semgrep_findings_as_text(
    findings: list[dict[str, Any]],
) -> str:
    """
    Backward-compatible text output.
    Existing analysis_results.issues can continue using this.
    """
    if not findings:
        return "Keine Semgrep Findings gefunden."

    lines: list[str] = []

    for index, finding in enumerate(findings, start=1):
        lines.extend([
            f"{index}. [{finding['severity']}] {finding['title']}",
            f"Beschreibung: {finding['message']}",
            f"Datei: {finding['file_path']}",
            f"Zeile: {finding['start_line']}",
            f"Regel: {finding['rule_id']}",
            f"Empfehlung: {finding['recommendation']}",
            "",
        ])

        if finding.get("cwe"):
            lines.append(f"CWE: {', '.join(finding['cwe'])}")
        if finding.get("owasp"):
            lines.append(f"OWASP: {', '.join(finding['owasp'])}")

        lines.append("")

    return "\n".join(lines)

    if not findings:
        return "Keine Semgrep Findings gefunden."

    lines: list[str] = []

    for index, finding in enumerate(findings, start=1):
        lines.extend(
            [
                f"{index}. [{finding.get('severity')}] {finding.get('message')}",
                f"   Tool: {finding.get('tool')}",
                f"   Rule: {finding.get('rule_id')}",
                f"   Datei: {finding.get('file_path')}",
                f"   Zeile: {finding.get('start_line')}",
            ]
        )

        if finding.get("cwe"):
            lines.append(f"   CWE: {finding.get('cwe')}")

        if finding.get("owasp"):
            lines.append(f"   OWASP: {finding.get('owasp')}")

        lines.append("")

    return "\n".join(lines)