import { formatCurrencyBRL } from '@/lib/utils';

export function SummaryCards({
  income,
  accountsTotal,
  creditCardsTotal,
  totalExpenses,
  balance
}: {
  income: number;
  accountsTotal: number;
  creditCardsTotal: number;
  totalExpenses: number;
  balance: number;
}) {
  const cards = [
    { title: 'Receitas', value: income, hint: 'Entradas no mês selecionado' },
    { title: 'Contas do mês', value: accountsTotal, hint: 'Pix, débito, dinheiro e afins por data' },
    { title: 'Faturas do mês', value: creditCardsTotal, hint: 'Cartão por competência da fatura' },
    { title: 'Despesas totais', value: totalExpenses, hint: 'Contas + faturas do mês' },
    { title: 'Saldo do mês', value: balance, hint: 'Receitas - despesas totais' }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
