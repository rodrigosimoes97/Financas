import Link from 'next/link';
import { formatCurrencyBRL } from '@/lib/utils';

interface GoalRow {
  id: string;
  name?: string | null;
  target_amount?: number | null;
  current_amount?: number | null;
  monthly_limit?: number | null;
  type?: 'SAVE' | 'SPEND_LIMIT' | null;
}

export function MonthGoalCard({ goal, expenses }: { goal: GoalRow | null; expenses: number }) {
  if (!goal) {
    return (
      <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
        <h3 className="text-lg font-semibold">Meta do mês</h3>
        <p className="mt-2 text-sm text-zinc-500">Nenhuma meta ativa para este mês.</p>
        <Link href="/goals" className="mt-3 inline-block rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800">Adicionar meta</Link>
      </article>
    );
  }

  const target = Number(goal.target_amount ?? goal.monthly_limit ?? 0);
  const current = goal.type === 'SPEND_LIMIT' ? expenses : Number(goal.current_amount ?? 0);
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;

  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
      <h3 className="text-lg font-semibold">Meta do mês</h3>
      <p className="text-sm text-zinc-400">{goal.name ?? (goal.type === 'SAVE' ? 'Economia' : 'Limite de gastos')}</p>
      <div className="mt-3 h-2 rounded-full bg-zinc-800"><div className="h-2 rounded-full bg-sky-400" style={{ width: `${pct}%` }} /></div>
      <p className="mt-2 text-sm">{formatCurrencyBRL(current)} de {formatCurrencyBRL(target)}</p>
      <Link href="/goals" className="mt-3 inline-block rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800">Adicionar/Editar meta</Link>
    </article>
  );
}
