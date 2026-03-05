import { CategoryPieChart } from '@/components/dashboard/category-pie-chart';
import { formatCurrencyBRL } from '@/lib/utils';

interface SpendingBreakdownProps {
  breakdown: {
    categories: Array<{ category_name: string; total: number }>;
    essentials_total: number;
    non_essentials_total: number;
    payment_mix: Array<{ payment_type: string; total: number; percentage: number }>;
    credit_cards_total: number;
    accounts_total: number;
  };
}

export function SpendingBreakdownCard({ breakdown }: SpendingBreakdownProps) {
  const sorted = [...(breakdown.categories ?? [])].sort((a, b) => b.total - a.total);
  const top = sorted.slice(0, 5);
  const othersTotal = sorted.slice(5).reduce((acc, item) => acc + Number(item.total ?? 0), 0);
  const donutData = othersTotal > 0 ? [...top, { category_name: 'Outros', total: othersTotal }] : top;

  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
      <h3 className="text-lg font-semibold">Para onde seu dinheiro está indo?</h3>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <CategoryPieChart data={donutData.map((item) => ({ name: item.category_name, value: Number(item.total) }))} />
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-800 p-3 text-sm">
            <p className="text-zinc-400">Essenciais vs não essenciais</p>
            <p>Essenciais: <b>{formatCurrencyBRL(Number(breakdown.essentials_total ?? 0))}</b></p>
            <p>Não essenciais: <b>{formatCurrencyBRL(Number(breakdown.non_essentials_total ?? 0))}</b></p>
          </div>
          <div className="rounded-xl border border-zinc-800 p-3 text-sm">
            <p className="mb-2 text-zinc-400">Mix de pagamento</p>
            {(breakdown.payment_mix ?? []).map((mix) => (
              <div key={mix.payment_type} className="flex items-center justify-between py-1">
                <span className="uppercase">{mix.payment_type}</span>
                <span>{formatCurrencyBRL(Number(mix.total))} ({Number(mix.percentage).toFixed(0)}%)</span>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-zinc-800 p-3 text-sm">
            <p>Cartões: <b>{formatCurrencyBRL(Number(breakdown.credit_cards_total ?? 0))}</b></p>
            <p>Conta/Pix/Débito: <b>{formatCurrencyBRL(Number(breakdown.accounts_total ?? 0))}</b></p>
          </div>
        </div>
      </div>
    </article>
  );
}
