
import type { SecurityFinding } from "./api";

export type SecurityStats = {
  total: number;
  custom: number;
  semgrep: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
};

export function getSecurityStats(
  findings: SecurityFinding[],
  customCount: number
): SecurityStats {
  const semgrep = findings.length;

  const stats: SecurityStats = {
    total: customCount + semgrep,
    custom: customCount,
    semgrep,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  for (const finding of findings) {
    switch (finding.severity?.toUpperCase()) {
      case "CRITICAL":
        stats.critical++;
        break;
      case "HIGH":
        stats.high++;
        break;
      case "MEDIUM":
        stats.medium++;
        break;
      case "LOW":
        stats.low++;
        break;
      default:
        stats.info++;
    }
  }

  return stats;
}

// Extract the custom scanner count from the current summary format.
export function getCustomFindingCount(summary: string): number {
    const match = summary.match(
    /(?:Gefundene Sicherheitsprobleme|Findings \(eigene Regeln\)):\s*(\d+)/i
    );

  return match ? Number(match[1]) : 0;
}
