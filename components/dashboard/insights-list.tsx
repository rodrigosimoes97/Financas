import Link from 'next/link';

interface InsightsListProps {
  insights: Array<{
    id: string;
    severity: 'info' | 'warn' | 'critical';
    title: string;
    message: string;
    cta_label?: string | null;
    cta_route?: string | null;
  }>;
}

const severityStyles = {
  info: 'bg-sky-500/20 text-sky-300',
  warn: 'bg-amber-500/20 text-amber-300',
  critical: 'bg-red-500/20 text-red-300'
};

export function InsightsList({ insights }: InsightsListProps) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Insights</h3>
        <Link href="/transactions" className="text-xs text-zinc-400 hover:text-zinc-200">ver todos</Link>
      </div>
      <div className="space-y-3">
        {insights.length === 0 ? <p className="text-sm text-zinc-400">Sem insights no momento.</p> : insights.map((insight) => (
          <div key={insight.id} className="rounded-xl border border-zinc-800 p-3">
            <div className="flex items-center justify-between">
              <p className="font-medium">{insight.title}</p>
              <span className={`rounded-full px-2 py-1 text-xs ${severityStyles[insight.severity]}`}>{insight.severity}</span>
            </div>
            <p className="mt-1 text-sm text-zinc-400">{insight.message}</p>
            {insight.cta_label && insight.cta_route ? <Link href={insight.cta_route} className="mt-2 inline-block text-xs text-emerald-300">{insight.cta_label}</Link> : null}
          </div>
        ))}
      </div>
    </article>
  );
}
