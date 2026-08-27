import re

from app.findings import Finding, create_finding


SECRET_PATTERNS = [
    {
        "rule_id": "hardcoded_password",
        "pattern": re.compile(
            r"""(?i)\b(password|passwd|pwd)\b\s*[:=]\s*["'][^"']{4,}["']"""
        ),
        "title": "Mögliches hardcodiertes Passwort gefunden.",
        "severity": "high",
        "explanation": (
            "Ein Passwort steht direkt im Quellcode. Wenn der Code veröffentlicht "
            "oder geteilt wird, kann dieses Passwort offengelegt werden."
        ),
        "recommendation": (
            "Speichere Passwörter nicht direkt im Code. Verwende stattdessen "
            "Umgebungsvariablen oder eine .env-Datei."
        ),
    },
    {
        "rule_id": "hardcoded_api_key",
        "pattern": re.compile(
            r"""(?i)\b(api[_-]?key|apikey)\b\s*[:=]\s*["'][^"']{8,}["']"""
        ),
        "title": "Möglicher API-Key im Code gefunden.",
        "severity": "high",
        "explanation": (
            "Ein API-Key ist ein geheimer Zugangsschlüssel. Wenn er im Code steht, "
            "kann er versehentlich veröffentlicht werden."
        ),
        "recommendation": (
            "Speichere API-Keys in Umgebungsvariablen, zum Beispiel in einer .env-Datei."
        ),
    },
    {
        "rule_id": "hardcoded_token",
        "pattern": re.compile(
            r"""(?i)\b(token|access_token|auth_token|secret)\b\s*[:=]\s*["'][^"']{8,}["']"""
        ),
        "title": "Mögliches Token oder Secret im Code gefunden.",
        "severity": "high",
        "explanation": (
            "Tokens und Secrets können Zugriff auf Benutzerkonten, APIs oder externe "
            "Dienste ermöglichen."
        ),
        "recommendation": (
            "Speichere Tokens und Secrets außerhalb des Codes und rotiere kompromittierte Werte."
        ),
    },
    {
        "rule_id": "github_token",
        "pattern": re.compile(
            r"""ghp_[A-Za-z0-9_]{20,}"""
        ),
        "title": "Möglicher GitHub Token gefunden.",
        "severity": "critical",
        "explanation": (
            "Ein GitHub Token kann Zugriff auf Repositories oder GitHub-APIs ermöglichen."
        ),
        "recommendation": (
            "Entferne den Token aus dem Code, widerrufe ihn in GitHub und nutze Secrets/Environment Variables."
        ),
    },
]


def scan_secrets(content: str) -> list[Finding]:
    findings: list[Finding] = []

    for line_number, line in enumerate(content.splitlines(), start=1):
        for rule in SECRET_PATTERNS:
            if rule["pattern"].search(line):
                findings.append(
                    create_finding(
                        rule_id=rule["rule_id"],
                        title=rule["title"],
                        severity=rule["severity"],
                        line_number=line_number,
                        code_snippet=line,
                        explanation=rule["explanation"],
                        recommendation=rule["recommendation"],
                    )
                )

    return findings