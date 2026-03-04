import { formatCurrencyBRL } from '@/lib/utils';

export function CategorySpendCard({ items }: { items: Array<{ category_id: string; name: string; total: number }> }) {
  const total = items.reduce((sum, item) => sum + Number(item.total), 0);
  const topItems = items.slice(0, 5);

  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
      <h3 className="text-lg font-semibold">Gastos por categoria</h3>
      <div className="mt-4 space-y-3">
        {topItems.length === 0 && <p className="text-sm text-zinc-500">Sem despesas no mês.</p>}
        {topItems.map((item) => {
          const pct = total ? Math.round((Number(item.total) / total) * 100) : 0;
          return (
            <div key={item.category_id} className="space-y-1">
              <div className="flex justify-between text-sm"><span>{item.name ?? 'Outros'}</span><span>{formatCurrencyBRL(Number(item.total))}</span></div>
              <div className="h-2 rounded-full bg-zinc-800"><div className="h-2 rounded-full bg-emerald-400" style={{ width: `${pct}%` }} /></div>
            </div>
          );
        })}
      </div>
      {items.length > 5 && <p className="mt-4 text-xs text-zinc-500">Ver todas categorias na tela de transações.</p>}
    </article>
  );
}
