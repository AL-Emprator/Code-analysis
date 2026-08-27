import re

from app.findings import Finding, create_finding


PYTHON_RULES = [
    {
        "rule_id": "python_os_system",
        "pattern": re.compile(r"""(?i)\bos\.system\s*\("""),
        "title": "os.system() gefunden.",
        "severity": "high",
        "explanation": (
            "os.system() führt Shell-Befehle aus. Wenn der Befehl Benutzereingaben enthält, "
            "kann daraus eine Command Injection entstehen."
        ),
        "recommendation": (
            "Verwende subprocess.run() mit einer Argumentliste und ohne shell=True."
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
            "shell=True startet den Befehl über eine Shell. Wenn der Befehl dynamische Eingaben enthält, "
            "kann ein Angreifer zusätzliche Befehle einschleusen."
        ),
        "recommendation": (
            "Setze shell=False und übergebe Befehle als Liste, z. B. ['ls', '-la']."
        ),
    },
    {
        "rule_id": "python_pickle_load",
        "pattern": re.compile(r"""(?i)\bpickle\.loads?\s*\("""),
        "title": "Unsichere Pickle-Nutzung gefunden.",
        "severity": "high",
        "explanation": (
            "pickle kann beim Laden manipulierter Daten beliebigen Python-Code ausführen."
        ),
        "recommendation": (
            "Verwende für untrusted Daten sichere Formate wie JSON statt pickle."
        ),
    },
    {
        "rule_id": "python_yaml_load",
        "pattern": re.compile(r"""(?i)\byaml\.load\s*\("""),
        "title": "Potentiell unsichere YAML-Nutzung gefunden.",
        "severity": "medium",
        "explanation": (
            "yaml.load() kann bei unsicherer Nutzung problematisch sein, wenn externe Daten geladen werden."
        ),
        "recommendation": (
            "Verwende yaml.safe_load() statt yaml.load()."
        ),
    },
    {
        "rule_id": "python_eval_usage",
        "pattern": re.compile(r"""(?i)\beval\s*\("""),
        "title": "eval() gefunden.",
        "severity": "critical",
        "explanation": (
            "eval() führt übergebenen Text als Python-Code aus. Wenn dieser Text beeinflusst werden kann, "
            "ist das ein hohes Sicherheitsrisiko."
        ),
        "recommendation": (
            "Vermeide eval(). Nutze sichere Alternativen wie Mapping-Dictionaries oder Parser."
        ),
    },
    {
        "rule_id": "python_exec_usage",
        "pattern": re.compile(r"""(?i)\bexec\s*\("""),
        "title": "exec() gefunden.",
        "severity": "critical",
        "explanation": (
            "exec() führt dynamischen Python-Code aus und kann bei Benutzereingaben zu Code Execution führen."
        ),
        "recommendation": (
            "Vermeide exec(). Verwende klare Funktionen oder sichere Kontrolllogik."
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
            "Nutze parametrisierte Queries, z. B. cursor.execute('SELECT ... WHERE id = ?', (user_id,))."
        ),
    },
    {
        "rule_id": "python_sql_string_concat",
        "pattern": re.compile(
            r"""(?i)(SELECT|INSERT|UPDATE|DELETE)\s+.*\+"""
        ),
        "title": "Mögliches SQL-Injection-Risiko durch String-Verkettung.",
        "severity": "high",
        "explanation": (
            "SQL-Abfragen, die per String-Verkettung gebaut werden, können durch Eingaben manipuliert werden."
        ),
        "recommendation": (
            "Verwende parametrisierte Queries statt String-Verkettung."
        ),
    },
]


def scan_python_security(content: str) -> list[Finding]:
    findings: list[Finding] = []

    for line_number, line in enumerate(content.splitlines(), start=1):
        for rule in PYTHON_RULES:
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