
from typing import Any
import re


SEVERITY_RANK = {
    "INFO": 0,
    "LOW": 1,
    "MEDIUM": 2,
    "HIGH": 3,
    "CRITICAL": 4,
}


def get_vulnerability_type(finding: dict[str, Any]) -> str:
    """Identify the security issue type using rule ID and title."""

    rule = str(finding.get("rule_id") or "").lower()
    title = str(finding.get("title") or "").lower()
    text = f"{rule} {title}"

    if "v-html" in text:
        return "vue-v-html-xss"

    if "use-after-free" in text:
        return "use-after-free"

    if "sql-injection" in text or "sql injection" in text:
        return "sql-injection"

    if "command-injection" in text or "command injection" in text:
        return "command-injection"

    if "hardcoded" in text or "hardcoded secret" in text:
        return "hardcoded-secret"

    if "pickle" in text or "deserialization" in text:
        return "unsafe-deserialization"

    if "eval" in text:
        return "unsafe-eval"

    if "exec" in text:
        return "unsafe-exec"

    if "xss" in text or "cross-site scripting" in text:
        return "xss"

    # Unknown rules only deduplicate with the same rule ID.
    return f"rule:{rule}"


def normalize_path(path: Any) -> str:
    normalized = str(path or "").replace("\\", "/")
    normalized = re.sub(r"^\./", "", normalized)

    # Remove internal Docker repository prefix.
    normalized = re.sub(
        r"^.*?/repos/[^/]+/",
        "",
        normalized,
    )

    return normalized


def get_finding_source(rule_id: str) -> str:
    rule = rule_id.lower()

    if ".custom." in rule or rule.startswith("custom."):
        return "Custom Rule"

    return "Semgrep Community"


def merge_unique(first: list, second: list) -> list:
    return list(dict.fromkeys([*first, *second]))


def deduplicate_semgrep_findings(
    findings: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Merge matching Semgrep findings without losing rule IDs."""

    grouped: dict[tuple, dict[str, Any]] = {}

    for finding in findings:
        rule_id = str(finding.get("rule_id") or "unknown-rule")

        key = (
            normalize_path(finding.get("file_path")),
            finding.get("start_line"),
            get_vulnerability_type(finding),
        )

        if key not in grouped:
            item = finding.copy()

            item["file_path"] = normalize_path(
                finding.get("file_path")
            )

            item["rule_ids"] = [rule_id]
            item["sources"] = [get_finding_source(rule_id)]
            item["duplicate_count"] = 1

            grouped[key] = item
            continue

        existing = grouped[key]

        existing["rule_ids"] = merge_unique(
            existing.get("rule_ids", []),
            [rule_id],
        )

        existing["sources"] = merge_unique(
            existing.get("sources", []),
            [get_finding_source(rule_id)],
        )

        existing["cwe"] = merge_unique(
            existing.get("cwe", []),
            finding.get("cwe", []),
        )

        existing["owasp"] = merge_unique(
            existing.get("owasp", []),
            finding.get("owasp", []),
        )

        existing["duplicate_count"] += 1

        # Preserve the higher severity when two rules disagree.
        current_severity = str(
            existing.get("severity") or "INFO"
        ).upper()

        new_severity = str(
            finding.get("severity") or "INFO"
        ).upper()

        if SEVERITY_RANK.get(new_severity, 0) > SEVERITY_RANK.get(
            current_severity, 0
        ):
            existing["severity"] = new_severity

        # Keep the best available source snippet.
        if not existing.get("code") and finding.get("code"):
            existing["code"] = finding["code"]

        # Prefer an actual Semgrep fix if present.
        if (
            not existing.get("recommendation")
            and finding.get("recommendation")
        ):
            existing["recommendation"] = finding["recommendation"]

    return list(grouped.values())
