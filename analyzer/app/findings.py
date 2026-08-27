from typing import Literal, TypedDict


Severity = Literal["low", "medium", "high", "critical"]


class Finding(TypedDict):
    rule_id: str
    title: str
    severity: Severity
    line_number: int
    code_snippet: str
    explanation: str
    recommendation: str


def create_finding(
    rule_id: str,
    title: str,
    severity: Severity,
    line_number: int,
    code_snippet: str,
    explanation: str,
    recommendation: str,
) -> Finding:
    return {
        "rule_id": rule_id,
        "title": title,
        "severity": severity,
        "line_number": line_number,
        "code_snippet": code_snippet.strip(),
        "explanation": explanation,
        "recommendation": recommendation,
    }


def format_findings_as_text(findings: list[Finding]) -> str:
    if not findings:
        return "Keine Sicherheitsprobleme gefunden."

    blocks: list[str] = []

    for finding in findings:
        blocks.append(
            "\n".join(
                [
                    f"[{finding['severity'].upper()}] {finding['title']}",
                    f"Regel: {finding['rule_id']}",
                    f"Zeile: {finding['line_number']}",
                    f"Code: {finding['code_snippet']}",
                    f"Erklärung: {finding['explanation']}",
                    f"Vorschlag: {finding['recommendation']}",
                ]
            )
        )

    return "\n\n---\n\n".join(blocks)