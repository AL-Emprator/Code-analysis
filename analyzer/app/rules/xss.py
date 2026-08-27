import re

from app.findings import Finding, create_finding


XSS_PATTERNS = [
    {
        "rule_id": "php_echo_user_input",
        "pattern": re.compile(
            r"""(?i)\becho\s+.*\$_(GET|POST|REQUEST|COOKIE)"""
        ),
        "title": "Mögliches XSS-Risiko durch echo mit Benutzereingabe.",
        "severity": "high",
        "explanation": (
            "Benutzereingaben werden direkt mit echo ausgegeben. Wenn diese Eingaben HTML "
            "oder JavaScript enthalten, kann schädlicher Code im Browser ausgeführt werden."
        ),
        "recommendation": (
            "Verwende htmlspecialchars() oder eine andere Escaping-Methode, bevor Benutzereingaben ausgegeben werden."
        ),
    },
    {
        "rule_id": "php_print_user_input",
        "pattern": re.compile(
            r"""(?i)\bprint\s+.*\$_(GET|POST|REQUEST|COOKIE)"""
        ),
        "title": "Mögliches XSS-Risiko durch print mit Benutzereingabe.",
        "severity": "high",
        "explanation": (
            "Benutzereingaben werden direkt mit print ausgegeben. Dadurch kann HTML oder JavaScript "
            "ungefiltert an den Browser gesendet werden."
        ),
        "recommendation": (
            "Escapiere Ausgaben mit htmlspecialchars() und validiere die Eingaben vorher."
        ),
    },
    {
        "rule_id": "js_inner_html_assignment",
        "pattern": re.compile(
            r"""(?i)\.innerHTML\s*="""
        ),
        "title": "Mögliches XSS-Risiko durch innerHTML.",
        "severity": "high",
        "explanation": (
            "innerHTML fügt Inhalte als HTML in die Seite ein. Wenn der Inhalt aus Benutzereingaben kommt, "
            "kann JavaScript eingeschleust werden."
        ),
        "recommendation": (
            "Verwende textContent für Textausgaben oder bereinige HTML mit einer sicheren Sanitizing-Bibliothek."
        ),
    },
    {
        "rule_id": "js_document_write",
        "pattern": re.compile(
            r"""(?i)\bdocument\.write\s*\("""
        ),
        "title": "Mögliches XSS-Risiko durch document.write().",
        "severity": "medium",
        "explanation": (
            "document.write() schreibt direkt HTML in die Seite. Bei dynamischen Eingaben kann daraus ein XSS-Risiko entstehen."
        ),
        "recommendation": (
            "Vermeide document.write(). Nutze sichere DOM-Methoden wie textContent oder createElement()."
        ),
    },
]


def scan_xss(content: str) -> list[Finding]:
    findings: list[Finding] = []

    for line_number, line in enumerate(content.splitlines(), start=1):
        for rule in XSS_PATTERNS:
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