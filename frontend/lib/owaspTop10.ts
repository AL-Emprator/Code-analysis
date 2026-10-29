
export type OwaspTopic = {
  id: string;
  slug: string;
  title: string;
  english: string;
  description: string;
  example: string;
  protection: string[];
  coverage: string;
  ruleExamples: string[];
  owaspUrl: string;
};

export const owaspTopics: OwaspTopic[] = [
  {
    id: "A01:2025",
    slug: "broken-access-control",
    title: "Mangelhafte Zugriffskontrolle",
    english: "Broken Access Control",
    description:
      "Eine Anwendung überprüft nicht richtig, ob ein Benutzer bestimmte Daten oder Funktionen verwenden darf.",
    example:
      "Ein Benutzer ändert die ID einer URL und kann dadurch die privaten Daten eines anderen Benutzers sehen.",
    protection: [
      "Berechtigungen bei jeder Anfrage im Backend prüfen.",
      "Zugriff standardmäßig verweigern.",
      "Benutzern nur die notwendigen Rechte geben.",
    ],
    coverage:
      "Für diese Kategorie haben wir noch keine vollständige automatische Erkennung nachgewiesen.",
    ruleExamples: [],
    owaspUrl:
      "https://top10.owasp.org/2025/A01_2025-Broken_Access_Control/",
  },
  {
    id: "A02:2025",
    slug: "security-misconfiguration",
    title: "Sicherheitsrelevante Fehlkonfiguration",
    english: "Security Misconfiguration",
    description:
      "Unsichere Server-, Framework- oder Anwendungseinstellungen können Angreifern den Zugriff erleichtern.",
    example:
      "Eine produktive Anwendung verwendet weiterhin den Debug-Modus oder ungeschützte Standardzugänge.",
    protection: [
      "Unsichere Standardeinstellungen entfernen.",
      "Debug-Modus im Produktivbetrieb deaktivieren.",
      "Konfigurationen regelmäßig überprüfen.",
    ],
    coverage:
      "Unsere bisherigen Regeln ersetzen keine umfassende Konfigurationsprüfung.",
    ruleExamples: [],
    owaspUrl:
      "https://top10.owasp.org/2025/A02_2025-Security_Misconfiguration/",
  },
  {
    id: "A03:2025",
    slug: "software-supply-chain",
    title: "Schwachstellen in der Software-Lieferkette",
    english: "Software Supply Chain Failures",
    description:
      "Schwachstellen oder Manipulationen in Bibliotheken, Paketen und Build-Prozessen können Anwendungen gefährden.",
    example:
      "Ein Projekt installiert eine manipulierte Bibliothek aus einer unsicheren Paketquelle.",
    protection: [
      "Abhängigkeiten regelmäßig auf Schwachstellen prüfen.",
      "Vertrauenswürdige Paketquellen verwenden.",
      "Build-Prozesse und Updates absichern.",
    ],
    coverage:
      "Unser aktueller Semgrep-Scan ist kein vollständiger Dependency- oder Supply-Chain-Scanner.",
    ruleExamples: [],
    owaspUrl:
      "https://top10.owasp.org/2025/A03_2025-Software_Supply_Chain_Failures/",
  },
  {
    id: "A04:2025",
    slug: "cryptographic-failures",
    title: "Fehlerhafter Einsatz von Kryptografie",
    english: "Cryptographic Failures",
    description:
      "Sensible Daten werden nicht ausreichend geschützt, zum Beispiel bei der Speicherung oder Übertragung.",
    example:
      "Eine Webseite überträgt vertrauliche Informationen unverschlüsselt über HTTP.",
    protection: [
      "HTTPS und aktuelle TLS-Konfigurationen verwenden.",
      "Sensible Daten nur bei Bedarf speichern.",
      "Bewährte Kryptografie-Bibliotheken nutzen.",
    ],
    coverage:
      "Eigene Security-Regeln prüfen bestimmte unsichere Kommunikationsmuster. Das ist keine vollständige Kryptografieprüfung.",
    ruleExamples: [
      "Custom Rules: unsichere HTTP-Kommunikation",
    ],
    owaspUrl:
      "https://top10.owasp.org/2025/A04_2025-Cryptographic_Failures/",
  },
  {
    id: "A05:2025",
    slug: "injection",
    title: "Injection",
    english: "Injection",
    description:
      "Ein Angreifer kann Eingaben so manipulieren, dass sie als SQL-Abfrage, Systembefehl oder ausführbarer Code interpretiert werden.",
    example:
      "Eine SQL-Abfrage wird mit Benutzereingaben zusammengesetzt. Dadurch kann ein Angreifer die Abfrage verändern.",
    protection: [
      "Prepared Statements und parametrisierte SQL-Abfragen verwenden.",
      "Benutzereingaben nicht direkt in Shell-Befehle übernehmen.",
      "Unsichere dynamische Codeausführung vermeiden.",
    ],
    coverage:
      "Unsere Custom Rules erkennen bestimmte SQL- und Command-Injection-Muster. Zusätzliche Semgrep-Regeln können weitere Risiken erkennen.",
    ruleExamples: [
      "Custom: sql_string_concatenation",
      "Custom: sql_user_input_direct",
      "Custom: python_sql_f_string",
      "Custom: python_os_system",
      "Custom: python_subprocess_shell_true",
      "Custom: php_command_execution",
    ],
    owaspUrl:
      "https://top10.owasp.org/2025/A05_2025-Injection/",
  },
  {
    id: "A06:2025",
    slug: "insecure-design",
    title: "Unsicheres Design",
    english: "Insecure Design",
    description:
      "Sicherheitsprobleme entstehen bereits beim Entwurf einer Anwendung, weil wichtige Schutzmaßnahmen nicht eingeplant wurden.",
    example:
      "Eine Anwendung erlaubt unbegrenzte Versuche für einen kritischen Vorgang, ohne Schutz vor Missbrauch.",
    protection: [
      "Sicherheitsanforderungen frühzeitig definieren.",
      "Bedrohungsmodelle erstellen.",
      "Kritische Abläufe und Missbrauchsmöglichkeiten testen.",
    ],
    coverage:
      "Designfehler können durch einfache Quellcode-Muster nicht vollständig erkannt werden.",
    ruleExamples: [],
    owaspUrl:
      "https://top10.owasp.org/2025/A06_2025-Insecure_Design/",
  },
  {
    id: "A07:2025",
    slug: "authentication-failures",
    title: "Fehlerhafte Authentifizierung",
    english: "Authentication Failures",
    description:
      "Fehler bei der Anmeldung, Verwaltung von Sitzungen oder beim Umgang mit Zugangsdaten können unberechtigten Zugriff ermöglichen.",
    example:
      "Ein vertraulicher API-Schlüssel wird direkt im Quellcode gespeichert und anschließend öffentlich gemacht.",
    protection: [
      "Passwörter und API-Tokens nicht im Quellcode speichern.",
      "Sitzungen sicher verwalten.",
      "Mehrfaktor-Authentifizierung einsetzen, wo sinnvoll.",
      "Kompromittierte Zugangsdaten sofort widerrufen.",
    ],
    coverage:
      "Unsere Custom Rules erkennen einige hartcodierte Zugangsdaten. Sie prüfen nicht alle Authentifizierungsmechanismen.",
    ruleExamples: [
      "Custom: hardcoded_password",
      "Custom: hardcoded_api_key",
      "Custom: hardcoded_token",
      "Custom: github_token",
    ],
    owaspUrl:
      "https://top10.owasp.org/2025/A07_2025-Authentication_Failures/",
  },
  {
    id: "A08:2025",
    slug: "integrity-failures",
    title: "Fehler bei der Software- oder Datenintegrität",
    english: "Software or Data Integrity Failures",
    description:
      "Anwendungen verarbeiten Software oder Daten, deren Herkunft und Unverändertheit nicht ausreichend überprüft wurden.",
    example:
      "Ein System verarbeitet manipulierte Daten aus einer nicht vertrauenswürdigen Quelle.",
    protection: [
      "Integrität und Herkunft von Software überprüfen.",
      "Unsichere Deserialisierung vermeiden.",
      "Vertrauenswürdige Update-Prozesse einsetzen.",
    ],
    coverage:
      "Keine vollständige Erkennung dieser Kategorie durch die bislang geprüften Regeln.",
    ruleExamples: [],
    owaspUrl:
      "https://top10.owasp.org/2025/A08_2025-Software_or_Data_Integrity_Failures/",
  },
  {
    id: "A09:2025",
    slug: "logging-alerting",
    title: "Unzureichendes Sicherheitslogging und Alarmierung",
    english: "Security Logging and Alerting Failures",
    description:
      "Sicherheitsrelevante Ereignisse werden nicht ausreichend protokolliert oder verdächtige Aktivitäten bleiben ohne Alarm.",
    example:
      "Ein Angreifer probiert wiederholt Passwörter aus, ohne dass die Anwendung einen Sicherheitsalarm erzeugt.",
    protection: [
      "Wichtige Sicherheitsereignisse protokollieren.",
      "Verdächtige Aktivitäten überwachen.",
      "Alarmierung und Reaktion regelmäßig testen.",
    ],
    coverage:
      "Unser aktueller Code-Scanner bietet keine vollständige Prüfung des Logging- und Alerting-Konzepts.",
    ruleExamples: [],
    owaspUrl:
      "https://top10.owasp.org/2025/A09_2025-Security_Logging_and_Alerting_Failures/",
  },
  {
    id: "A10:2025",
    slug: "exceptional-conditions",
    title: "Fehlerhafte Behandlung von Ausnahmezuständen",
    english: "Mishandling of Exceptional Conditions",
    description:
      "Ungewöhnliche Situationen, Fehler oder Ausnahmen werden unsicher behandelt und können Schutzmechanismen beeinträchtigen.",
    example:
      "Nach einem Fehler überspringt eine Anwendung eine Berechtigungsprüfung und erlaubt trotzdem den Zugriff.",
    protection: [
      "Bei Sicherheitsfehlern den Zugriff standardmäßig verweigern.",
      "Fehler und Ausnahmen gezielt behandeln.",
      "Ungewöhnliche Zustände systematisch testen.",
    ],
    coverage:
      "Keine vollständige Erkennung dieser Kategorie durch die bislang geprüften Regeln.",
    ruleExamples: [],
    owaspUrl:
      "https://top10.owasp.org/2025/A10_2025-Mishandling_of_Exceptional_Conditions/",
  },
];

export function getOwaspTopic(slug: string) {
  return owaspTopics.find((topic) => topic.slug === slug);
}
