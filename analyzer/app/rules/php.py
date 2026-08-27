import re

from app.findings import Finding, create_finding


PHP_RULES = [
    {
        "rule_id": "php_eval_usage",
        "pattern": re.compile(r"""(?i)\beval\s*\("""),
        "title": "Nutzung von eval() gefunden.",
        "severity": "critical",
        "explanation": (
            "eval() führt Code aus, der zur Laufzeit als Text übergeben wird. "
            "Wenn dieser Code durch Benutzereingaben beeinflusst wird, kann ein Angreifer eigenen Code ausführen."
        ),
        "recommendation": (
            "Vermeide eval(). Nutze sichere Alternativen wie feste Funktionen, Mapping-Tabellen oder klare Kontrollstrukturen."
        ),
    },
    {
        "rule_id": "php_insecure_include",
        "pattern": re.compile(
            r"""(?i)\b(include|require|include_once|require_once)\s*\(?\s*\$_(GET|POST|REQUEST|COOKIE)"""
        ),
        "title": "Unsicherer include/require-Aufruf gefunden.",
        "severity": "high",
        "explanation": (
            "include oder require mit direkter Benutzereingabe kann dazu führen, dass unerwartete Dateien geladen werden."
        ),
        "recommendation": (
            "Verwende keine direkten Benutzereingaben für include/require. Nutze feste Pfade oder eine Whitelist erlaubter Dateien."
        ),
    },
    {
        "rule_id": "php_direct_user_input",
        "pattern": re.compile(r"""\$_(GET|POST|REQUEST|COOKIE)\s*\["""),
        "title": "Direkte Verarbeitung von Benutzereingaben gefunden.",
        "severity": "medium",
        "explanation": (
            "Benutzereingaben werden direkt aus globalen PHP-Variablen gelesen. "
            "Ohne Validierung oder Bereinigung können daraus Sicherheitsprobleme entstehen."
        ),
        "recommendation": (
            "Validiere und bereinige Benutzereingaben, zum Beispiel mit filter_input(), Typprüfung oder Whitelists."
        ),
    },
    {
        "rule_id": "php_possible_sql_injection",
        "pattern": re.compile(
            r"""(?i)(SELECT|INSERT|UPDATE|DELETE)\s+.*(\$_GET|\$_POST|\$_REQUEST|\$_COOKIE|\.)"""
        ),
        "title": "Mögliches SQL-Injection-Risiko in PHP gefunden.",
        "severity": "high",
        "explanation": (
            "SQL-Abfragen, die mit Benutzereingaben oder String-Verkettung gebaut werden, können manipulierbar sein."
        ),
        "recommendation": (
            "Verwende Prepared Statements, zum Beispiel PDO mit bindParam() oder parameterisierte Queries."
        ),
    },
]


def scan_php_security(content: str) -> list[Finding]:
    findings: list[Finding] = []

    for line_number, line in enumerate(content.splitlines(), start=1):
        for rule in PHP_RULES:
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