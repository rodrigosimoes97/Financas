import Link from 'next/link';
import { formatCurrencyBRL } from '@/lib/utils';

interface GoalRow {
  id: string;
  name?: string | null;
  target_amount?: number | null;
  current_amount?: number | null;
  monthly_limit?: number | null;
  type?: 'SAVE' | 'SPEND_LIMIT' | null;
  category_id?: string | null;
  category?: { name?: string | null } | Array<{ name?: string | null }> | null;
}

interface MonthGoalCardProps {
  goal: GoalRow | null;
  expenses: number;
  hasMultipleGoals?: boolean;
}

const safeNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function MonthGoalCard({ goal, expenses, hasMultipleGoals = false }: MonthGoalCardProps) {
  if (!goal) {
    return (
      <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
        <h3 className="text-lg font-semibold">Meta do mês</h3>
        <p className="mt-2 text-sm text-zinc-500">Nenhuma meta ativa para este mês.</p>
        <Link href="/goals" className="mt-3 inline-block rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800">Adicionar meta</Link>
      </article>
    );
  }

  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dayOfMonth = Math.max(today.getDate(), 1);

  const target = Math.max(safeNumber(goal.target_amount ?? goal.monthly_limit), 0);
  const current = Math.max(goal.type === 'SPEND_LIMIT' ? safeNumber(expenses) : safeNumber(goal.current_amount), 0);
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const remaining = Math.max(target - current, 0);
  const projection = dayOfMonth > 0 ? (current / dayOfMonth) * daysInMonth : current;

  const categoryRow = Array.isArray(goal.category) ? goal.category[0] : goal.category;
  const categoryName = categoryRow?.name?.trim() || 'categoria selecionada';
  const subtitle = goal.name?.trim()
    ? goal.name
    : goal.type === 'SAVE'
      ? 'Economia do mês'
      : goal.category_id
        ? `Gasto da categoria ${categoryName}`
        : 'Limite de gastos do mês';

  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
      <h3 className="text-lg font-semibold">Meta do mês</h3>
      <p className="text-sm text-zinc-400">{subtitle}</p>

      {target <= 0 ? (
        <div className="mt-3 rounded-xl border border-amber-700/40 bg-amber-500/10 p-3 text-sm text-amber-100">
          Meta inválida: defina um valor maior que zero para acompanhar o progresso.
        </div>
      ) : (
        <>
          <div className="mt-3 h-2 rounded-full bg-zinc-800"><div className="h-2 rounded-full bg-sky-400" style={{ width: `${pct}%` }} /></div>
          <p className="mt-2 text-sm">{formatCurrencyBRL(current)} de {formatCurrencyBRL(target)}</p>
          {goal.type === 'SPEND_LIMIT' ? (
            <div className="mt-1 text-xs text-zinc-400">
              <p>Restante: {formatCurrencyBRL(remaining)}</p>
              <p>Projeção até o fim do mês: {formatCurrencyBRL(projection)}</p>
            </div>
          ) : (
            <p className="mt-1 text-xs text-zinc-400">Economizado: {formatCurrencyBRL(current)}</p>
          )}
        </>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Link href="/goals" className="inline-block rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800">Adicionar/Editar meta</Link>
        {hasMultipleGoals ? (
          <Link href="/goals" className="inline-block rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800">Ver todas</Link>
        ) : null}
      </div>
    </article>
  );
}
