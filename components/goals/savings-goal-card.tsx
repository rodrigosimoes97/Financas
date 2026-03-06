'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { archiveGoal, deleteGoal } from '@/lib/actions/goals';
import { Goal, GoalContribution } from '@/types/models';
import { formatCurrencyBRL, formatDateBR } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { GoalCard } from '@/components/goals/goal-card';
import { GoalProgressBar } from '@/components/goals/goal-progress-bar';
import { GoalStatusBadge, GoalVisualStatus } from '@/components/goals/goal-status-badge';
import { GoalContributionForm } from '@/components/goals/goal-contribution-form';
import { GoalContributionList } from '@/components/goals/goal-contribution-list';

export function SavingsGoalCard({ goal, contributions, onEdit }: { goal: Goal; contributions: GoalContribution[]; onEdit: (goal: Goal) => void }) {
  const router = useRouter();
  const toast = useToast();
  const [openContributions, setOpenContributions] = useState(false);

  const pct = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
  const remaining = Math.max(goal.target_amount - goal.current_amount, 0);
  const status: GoalVisualStatus = pct >= 100 || goal.status === 'COMPLETED' ? 'completed' : pct >= 80 ? 'near_limit' : 'within';

  return (
    <GoalCard tone="savings">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{goal.name}</p>
          <p className="text-sm text-zinc-400">{formatCurrencyBRL(goal.current_amount)} de {formatCurrencyBRL(goal.target_amount)}</p>
        </div>
        <GoalStatusBadge status={status} />
      </div>

      <div className="mt-3">
        <GoalProgressBar percentage={pct} status={status} />
        <p className="mt-1 text-xs text-zinc-400">{pct.toFixed(1)}% • Falta {formatCurrencyBRL(remaining)} {goal.deadline ? `• Prazo: ${formatDateBR(goal.deadline)}` : ''}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <button type="button" className="rounded-lg border border-zinc-700 px-2 py-1 hover:bg-zinc-800" onClick={() => onEdit(goal)}>Editar</button>
        <button
          type="button"
          className="rounded-lg border border-zinc-700 px-2 py-1 hover:bg-zinc-800"
          onClick={async () => {
            const result = await archiveGoal(goal.id);
            if (result.ok) {
              toast.success(result.message ?? 'Meta arquivada');
              router.refresh();
            } else toast.error(result.error ?? 'Erro ao arquivar');
          }}
        >
          Arquivar
        </button>
        <button
          type="button"
          className="rounded-lg border border-rose-800/70 px-2 py-1 text-rose-300 hover:bg-rose-950/40"
          onClick={async () => {
            const result = await deleteGoal(goal.id);
            if (result.ok) {
              toast.success(result.message ?? 'Meta excluída');
              router.refresh();
            } else toast.error(result.error ?? 'Erro ao excluir');
          }}
        >
          Excluir
        </button>
        <button type="button" className="rounded-lg border border-zinc-700 px-2 py-1 hover:bg-zinc-800" onClick={() => setOpenContributions((prev) => !prev)}>
          {openContributions ? 'Ocultar aportes' : 'Ver aportes'}
        </button>
      </div>

      {openContributions ? (
        <>
          <GoalContributionForm goalId={goal.id} />
          <GoalContributionList goalId={goal.id} contributions={contributions} />
        </>
      ) : null}
    </GoalCard>
  );
}
