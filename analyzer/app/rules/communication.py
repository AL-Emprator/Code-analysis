import re

from app.findings import Finding, create_finding


HTTP_URL_PATTERN = re.compile(
    r"""http://[^\s"'<>]+"""
)


def scan_insecure_communication(content: str) -> list[Finding]:
    findings: list[Finding] = []

    for line_number, line in enumerate(content.splitlines(), start=1):
        matches = HTTP_URL_PATTERN.findall(line)

        for match in matches:
            if match.startswith("http://localhost") or match.startswith("http://127.0.0.1"):
                continue
            findings.append(
                create_finding(
                    rule_id="insecure_http_url",
                    title="Unsichere HTTP-Verbindung gefunden.",
                    severity="medium",
                    line_number=line_number,
                    code_snippet=line,
                    explanation=(
                        "HTTP überträgt Daten unverschlüsselt. Dadurch können sensible "
                        "Informationen mitgelesen oder manipuliert werden."
                    ),
                    recommendation=(
                        f"Verwende HTTPS statt HTTP für diese URL: {match}"
                    ),
                )
            )

    return findings