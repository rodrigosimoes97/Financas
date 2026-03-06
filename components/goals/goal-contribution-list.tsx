'use client';

import { useRouter } from 'next/navigation';
import { formatCurrencyBRL, formatDateBR } from '@/lib/utils';
import { removeGoalContribution } from '@/lib/actions/goals';
import { useToast } from '@/components/ui/toast';
import { GoalContribution } from '@/types/models';

export function GoalContributionList({ goalId, contributions }: { goalId: string; contributions: GoalContribution[] }) {
  const router = useRouter();
  const toast = useToast();

  if (contributions.length === 0) {
    return <p className="mt-2 text-xs text-zinc-500">Sem aportes ainda.</p>;
  }

  return (
    <div className="mt-3 space-y-2">
      {contributions.map((contribution) => (
        <div key={contribution.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm">
          <div>
            <p className="font-medium">{formatCurrencyBRL(Number(contribution.amount))}</p>
            <p className="text-xs text-zinc-400">{formatDateBR(contribution.contribution_date)} {contribution.notes ? `• ${contribution.notes}` : ''}</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              const result = await removeGoalContribution(contribution.id, goalId);
              if (result.ok) {
                toast.success(result.message ?? 'Aporte removido');
                router.refresh();
              } else toast.error(result.error ?? 'Erro ao remover aporte');
            }}
            className="text-xs text-rose-300 hover:text-rose-200"
          >
            Excluir
          </button>
        </div>
      ))}
    </div>
  );
}
