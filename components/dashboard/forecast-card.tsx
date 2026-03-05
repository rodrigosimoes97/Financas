import { formatCurrencyBRL } from '@/lib/utils';

interface ForecastCardProps {
  forecast: {
    spent_so_far: number;
    projected_spent: number;
    projected_remaining_budget: number | null;
    confidence: 'low' | 'medium' | 'high';
  };
}

export function ForecastCard({ forecast }: ForecastCardProps) {
  const risk = (forecast.projected_remaining_budget ?? 0) < 0;

  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Previsão do fim do mês</h3>
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${risk ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
          {risk ? 'Risco alto' : 'Risco controlado'}
        </span>
      </div>
      <p className="mt-4 text-sm text-zinc-400">Gasto até agora</p>
      <p className="text-3xl font-bold">{formatCurrencyBRL(Number(forecast.spent_so_far ?? 0))}</p>
      <p className="mt-3 text-sm text-zinc-400">Projeção do mês</p>
      <p className="text-xl font-semibold">{formatCurrencyBRL(Number(forecast.projected_spent ?? 0))}</p>
      <p className="mt-3 text-xs text-zinc-500">Confiança da previsão: {forecast.confidence}</p>
    </article>
  );
}
