import { cn } from '@/lib/utils';

export type GoalVisualStatus = 'within' | 'near_limit' | 'completed' | 'over_limit';

const labels: Record<GoalVisualStatus, string> = {
  within: 'Dentro da meta',
  near_limit: 'Próximo do limite',
  completed: 'Concluída',
  over_limit: 'Estourada'
};

export function GoalStatusBadge({ status }: { status: GoalVisualStatus }) {
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-1 text-xs font-medium',
        status === 'within' && 'bg-sky-500/15 text-sky-300',
        status === 'near_limit' && 'bg-amber-500/15 text-amber-300',
        status === 'completed' && 'bg-emerald-500/15 text-emerald-300',
        status === 'over_limit' && 'bg-rose-500/15 text-rose-300'
      )}
    >
      {labels[status]}
    </span>
  );
}
