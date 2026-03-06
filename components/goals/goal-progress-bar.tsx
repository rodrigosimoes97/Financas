import { cn } from '@/lib/utils';

interface GoalProgressBarProps {
  percentage: number;
  status: 'within' | 'near_limit' | 'completed' | 'over_limit';
}

export function GoalProgressBar({ percentage, status }: GoalProgressBarProps) {
  const width = Math.min(Math.max(percentage, 0), 100);

  return (
    <div className="h-2 w-full rounded-full bg-zinc-800">
      <div
        className={cn(
          'h-2 rounded-full transition-all',
          status === 'completed' && 'bg-emerald-400',
          status === 'near_limit' && 'bg-amber-400',
          status === 'over_limit' && 'bg-rose-400',
          status === 'within' && 'bg-sky-400'
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
