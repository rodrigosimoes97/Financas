import { Info } from 'lucide-react';
import { formatCurrencyBRL } from '@/lib/utils';

export function FreeMoneyCard({ value }: { value: number }) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">Dinheiro livre até o fim do mês</h3>
        <span title="Estimativa = saldo projetado do mês - compromissos futuros (recorrências e faturas a vencer no mês).">
          <Info size={14} className="text-zinc-400" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold">{formatCurrencyBRL(value)}</p>
      <p className="text-xs text-zinc-500">Estimativa baseada nas transações e compromissos já cadastrados.</p>
    </article>
  );
}
