import re

from app.findings import Finding, create_finding


SQL_INJECTION_PATTERNS = [
    {
        "rule_id": "sql_string_concatenation",
        "pattern": re.compile(
            r"""(?i)(SELECT|INSERT|UPDATE|DELETE)\s+.*(\+|\.)"""
        ),
        "title": "Mögliches SQL-Injection-Risiko durch String-Verkettung.",
        "severity": "high",
        "explanation": (
            "SQL-Abfragen, die durch String-Verkettung zusammengesetzt werden, "
            "können durch Benutzereingaben manipuliert werden."
        ),
        "recommendation": (
            "Verwende Prepared Statements oder parametrisierte Queries statt String-Verkettung."
        ),
    },
    {
        "rule_id": "sql_user_input_direct",
        "pattern": re.compile(
            r"""(?i)(SELECT|INSERT|UPDATE|DELETE)\s+.*(\$_GET|\$_POST|\$_REQUEST|\$_COOKIE|input\s*\()"""
        ),
        "title": "Mögliche SQL Injection durch direkte Benutzereingabe.",
        "severity": "high",
        "explanation": (
            "Benutzereingaben werden scheinbar direkt in einer SQL-Abfrage verwendet. "
            "Ein Angreifer könnte dadurch die Datenbankabfrage manipulieren."
        ),
        "recommendation": (
            "Validiere Eingaben und verwende parametrisierte Queries."
        ),
    },
    {
        "rule_id": "python_sql_f_string",
        "pattern": re.compile(
            r"""(?i)f["'].*(SELECT|INSERT|UPDATE|DELETE)\s+.*\{.*\}.*["']"""
        ),
        "title": "Mögliches SQL-Injection-Risiko durch Python f-String.",
        "severity": "high",
        "explanation": (
            "SQL-Abfragen mit f-Strings können unsicher sein, wenn Variablen direkt in die Query eingesetzt werden."
        ),
        "recommendation": (
            "Nutze parametrisierte Queries, zum Beispiel cursor.execute(query, params)."
        ),
    },
]


COMMAND_INJECTION_PATTERNS = [
    {
        "rule_id": "python_os_system",
        "pattern": re.compile(r"""(?i)\bos\.system\s*\("""),
        "title": "Mögliches Command-Injection-Risiko durch os.system().",
        "severity": "high",
        "explanation": (
            "os.system() führt Shell-Befehle aus. Wenn der Befehl Benutzereingaben enthält, "
            "kann ein Angreifer eigene Befehle ausführen."
        ),
        "recommendation": (
            "Vermeide os.system(). Nutze subprocess mit Argumentliste und ohne shell=True."
        ),
    },
    {
        "rule_id": "python_subprocess_shell_true",
        "pattern": re.compile(
            r"""(?i)subprocess\.(run|call|Popen)\s*\(.*shell\s*=\s*True"""
        ),
        "title": "subprocess mit shell=True gefunden.",
        "severity": "high",
        "explanation": (
            "shell=True kann gefährlich sein, wenn Befehle aus dynamischen Eingaben zusammengesetzt werden."
        ),
        "recommendation": (
            "Setze shell=False und übergebe Argumente als Liste, zum Beispiel ['ls', '-la']."
        ),
    },
    {
        "rule_id": "php_command_execution",
        "pattern": re.compile(
            r"""(?i)\b(exec|shell_exec|system|passthru)\s*\("""
        ),
        "title": "Mögliche Command Injection in PHP gefunden.",
        "severity": "high",
        "explanation": (
            "PHP-Funktionen wie exec(), shell_exec(), system() oder passthru() führen Systembefehle aus."
        ),
        "recommendation": (
            "Vermeide direkte Systembefehle mit Benutzereingaben. Nutze sichere APIs oder Whitelists."
        ),
    },
]


def scan_sql_injection(content: str) -> list[Finding]:
    findings: list[Finding] = []

    for line_number, line in enumerate(content.splitlines(), start=1):
        for rule in SQL_INJECTION_PATTERNS:
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


def scan_command_injection(content: str) -> list[Finding]:
    findings: list[Finding] = []

    for line_number, line in enumerate(content.splitlines(), start=1):
        for rule in COMMAND_INJECTION_PATTERNS:
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