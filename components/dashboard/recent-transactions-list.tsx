import Link from 'next/link';
import { formatCurrencyBRL, formatDateBR } from '@/lib/utils';

interface RecentTransaction {
  id: string;
  date: string;
  title: string;
  amount: number;
  category: string;
  payment_method: string;
  card_name?: string;
  installment_index?: number;
  installment_total?: number;
}

export function RecentTransactionsList({ items }: { items: RecentTransaction[] }) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
      <h3 className="text-lg font-semibold">Últimas transações</h3>
      <div className="mt-3 space-y-2">
        {items.length === 0 && <p className="text-sm text-zinc-500">Sem transações no mês selecionado.</p>}
        {items.map((item) => (
          <Link key={item.id} href={`/transactions`} className="block rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 text-sm hover:border-zinc-600">
            <div className="flex items-center justify-between gap-3">
              <span>
                {item.title}
                {item.installment_index && item.installment_total ? ` (${item.installment_index}/${item.installment_total})` : ''}
              </span>
              <span className="font-medium">{formatCurrencyBRL(Number(item.amount))}</span>
            </div>
            <p className="text-xs text-zinc-500">{formatDateBR(item.date)} • {item.category ?? 'Sem categoria'} • {item.card_name ?? item.payment_method}</p>
          </Link>
        ))}
      </div>
    </article>
  );
}
