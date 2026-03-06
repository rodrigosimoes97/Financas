import { formatCurrencyBRL } from '@/lib/utils';

interface InvestmentGoalsCardProps {
  goals: Array<{
    goal_id: string;
    name: string;
    target_amount: number;
    current_amount: number;
    contributed_this_month: number;
    required_monthly_contribution: number | null;
    status: 'on_track' | 'behind' | 'ahead';
  }>;
}

export function InvestmentGoalsCard({ goals }: InvestmentGoalsCardProps) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
      <h3 className="text-lg font-semibold">Metas de investimento</h3>
      <div className="mt-4 space-y-3">
        {goals.length === 0 ? (
          <p className="text-sm text-zinc-400">Crie sua primeira meta para acompanhar aportes mensais.</p>
        ) : (
          goals.map((goal) => {
            const progress = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0;
            return (
              <div key={goal.goal_id} className="rounded-xl border border-zinc-800 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{goal.name}</p>
                  <span className="text-xs uppercase text-zinc-400">{goal.status}</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-zinc-800">
                  <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-2 text-sm text-zinc-400">{formatCurrencyBRL(Number(goal.current_amount))} de {formatCurrencyBRL(Number(goal.target_amount))}</p>
                <p className="text-xs text-zinc-500">Aporte no mês: {formatCurrencyBRL(Number(goal.contributed_this_month))} • Sugestão: {formatCurrencyBRL(Number(goal.required_monthly_contribution ?? 0))}</p>
              </div>
            );
          })
        )}
      </div>
    </article>
  );
}
