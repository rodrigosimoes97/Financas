import { formatCurrencyBRL, formatDateBR } from '@/lib/utils';

export function UpcomingPaymentsCard({ items }: { items: Array<{ label: string; due_date: string; amount: number; source_type: string }> }) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
      <h3 className="text-lg font-semibold">Próximos pagamentos</h3>
      <div className="mt-3 space-y-2">
        {items.length === 0 && <p className="text-sm text-zinc-500">Sem compromissos futuros.</p>}
        {items.slice(0, 5).map((item, idx) => (
          <div key={`${item.label}-${idx}`} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 text-sm">
            <div className="flex items-center justify-between"><span>{item.label}</span><span className="font-medium">{formatCurrencyBRL(Number(item.amount))}</span></div>
            <p className="text-xs text-zinc-500">{formatDateBR(item.due_date)} • {item.source_type === 'INVOICE' ? 'Fatura' : 'Recorrente'}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
