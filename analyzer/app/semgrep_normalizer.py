from typing import Any


def normalize_semgrep_results(semgrep_output: dict[str, Any]) -> list[dict[str, Any]]:
    normalized_findings: list[dict[str, Any]] = []

    for result in semgrep_output.get("results", []):
        extra = result.get("extra", {})
        metadata = extra.get("metadata", {}) or {}
        start = result.get("start", {}) or {}
        end = result.get("end", {}) or {}

        finding = {
            "tool": "semgrep",
            "rule_id": result.get("check_id"),
            "severity": extra.get("severity", "INFO"),
            "message": extra.get("message", "No message"),
            "file_path": result.get("path"),
            "start_line": start.get("line"),
            "end_line": end.get("line"),
            "category": metadata.get("category"),
            "cwe": metadata.get("cwe"),
            "owasp": metadata.get("owasp"),
        }

        normalized_findings.append(finding)

    return normalized_findings


def format_semgrep_findings_as_text(findings: list[dict[str, Any]]) -> str:
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