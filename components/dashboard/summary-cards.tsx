import { formatCurrencyBRL } from '@/lib/utils';

export function SummaryCards({ income, expense, balance }: { income: number; expense: number; balance: number }) {
  const cards = [
    { title: 'Saldo do mês', value: balance, hint: 'Receitas - despesas do mês' },
    { title: 'Receitas', value: income, hint: 'Entradas no mês selecionado' },
    { title: 'Despesas', value: expense, hint: 'Saídas no mês selecionado' }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <article key={card.title} className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-lg shadow-black/10">
          <p className="text-sm text-zinc-400">{card.title}</p>
          <p className="mt-2 text-2xl font-semibold">{formatCurrencyBRL(card.value)}</p>
          <p className="mt-1 text-xs text-zinc-500">{card.hint}</p>
        </article>
      ))}
    </div>
  );
}
