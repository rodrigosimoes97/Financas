'use client';

import { useRouter } from 'next/navigation';
import { Goal } from '@/types/models';
import { GoalCard } from '@/components/goals/goal-card';
import { GoalProgressBar } from '@/components/goals/goal-progress-bar';
import { GoalStatusBadge, GoalVisualStatus } from '@/components/goals/goal-status-badge';
import { formatCurrencyBRL, formatMonthBR } from '@/lib/utils';
import { deleteGoal } from '@/lib/actions/goals';
import { useToast } from '@/components/ui/toast';

export function SpendLimitCard({ goal, onEdit }: { goal: Goal; onEdit: (goal: Goal) => void }) {
  const router = useRouter();
  const toast = useToast();
  const pct = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
  const remaining = goal.target_amount - goal.current_amount;
  const status: GoalVisualStatus = pct > 100 ? 'over_limit' : pct >= 85 ? 'near_limit' : 'within';

  return (
    <GoalCard tone="limit">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{goal.category?.name ?? 'Categoria'}</p>
          <p className="text-sm text-zinc-400">{formatCurrencyBRL(goal.current_amount)} de {formatCurrencyBRL(goal.target_amount)} • {goal.month ? formatMonthBR(goal.month) : ''}</p>
        </div>
        <GoalStatusBadge status={status} />
      </div>
      <div className="mt-3">
        <GoalProgressBar percentage={pct} status={status} />
        <p className="mt-1 text-xs text-zinc-400">{pct.toFixed(1)}% • {remaining >= 0 ? `Restante: ${formatCurrencyBRL(remaining)}` : `Excedente: ${formatCurrencyBRL(Math.abs(remaining))}`}</p>
      </div>
      <div className="mt-3 flex gap-2 text-xs">
        <button type="button" onClick={() => onEdit(goal)} className="rounded-lg border border-zinc-700 px-2 py-1 hover:bg-zinc-800">Editar</button>
        <button
          type="button"
          onClick={async () => {
            const result = await deleteGoal(goal.id);
            if (result.ok) {
              toast.success(result.message ?? 'Limite excluído');
              router.refresh();
            } else toast.error(result.error ?? 'Erro ao excluir limite');
          }}
          className="rounded-lg border border-rose-800/70 px-2 py-1 text-rose-300 hover:bg-rose-950/40"
        >
          Excluir
        </button>
      </div>
    </GoalCard>
  );
}
