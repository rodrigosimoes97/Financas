import Link from 'next/link';

interface GoalsOverviewCardProps {
  activeSavings: number;
  exceededLimits: number;
  topGoals: Array<{ id: string; name: string; progress: number }>;
}

export function GoalsOverviewCard({ activeSavings, exceededLimits, topGoals }: GoalsOverviewCardProps) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Metas e limites</h3>
        <Link href="/goals" className="text-xs text-zinc-400 hover:text-zinc-200">Ver metas</Link>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-sm">
          <p className="text-zinc-400">Metas de economia ativas</p>
          <p className="mt-1 text-xl font-semibold">{activeSavings}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-sm">
          <p className="text-zinc-400">Limites estourados no mês</p>
          <p className="mt-1 text-xl font-semibold text-rose-300">{exceededLimits}</p>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {topGoals.length === 0 ? <p className="text-xs text-zinc-500">Sem metas em destaque.</p> : topGoals.map((goal) => (
          <div key={goal.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
            <p className="text-sm font-medium">{goal.name}</p>
            <div className="mt-2 h-2 rounded-full bg-zinc-800"><div className="h-2 rounded-full bg-emerald-400" style={{ width: `${Math.min(goal.progress, 100)}%` }} /></div>
          </div>
        ))}
      </div>
    </article>
  );
}
