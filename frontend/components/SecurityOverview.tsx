
import type { SecurityStats } from "../lib/securityStats";

type Props = {
  stats: SecurityStats;
};

export default function SecurityOverview({ stats }: Props) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">
          Sicherheitsübersicht
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Ergebnisse aus eigenen Regeln und Semgrep
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Findings gesamt" value={stats.total} />
        <StatCard label="Eigene Regeln" value={stats.custom} />
        <StatCard label="Semgrep" value={stats.semgrep} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {stats.critical > 0 && (
          <SeverityBadge label="Critical" count={stats.critical}
            color="border-rose-500/30 bg-rose-500/10 text-rose-300" />
        )}

        {stats.high > 0 && (
          <SeverityBadge label="High" count={stats.high}
            color="border-orange-500/30 bg-orange-500/10 text-orange-300" />
        )}

        {stats.medium > 0 && (
          <SeverityBadge label="Medium" count={stats.medium}
            color="border-amber-500/30 bg-amber-500/10 text-amber-300" />
        )}

        {stats.low > 0 && (
          <SeverityBadge label="Low" count={stats.low}
            color="border-blue-500/30 bg-blue-500/10 text-blue-300" />
        )}

        {stats.info > 0 && (
          <SeverityBadge label="Info" count={stats.info}
            color="border-slate-500/30 bg-slate-500/10 text-slate-300" />
        )}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Schweregrade beziehen sich derzeit nur auf Semgrep.
        Doppelte Meldungen können mehrfach gezählt werden.
      </p>
    </section>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function SeverityBadge({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${color}`}>
      {count} {label}
    </span>
  );
}
