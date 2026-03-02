import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatCurrencyBRL, formatDateBR, formatMonthBR, getMonthStartISO } from '@/lib/utils';
import { listInvoicesByCard } from '@/lib/actions/credit-cards';
import { InvoiceActions } from '@/components/cards/invoice-actions';

export default async function CardDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const month = getMonthStartISO(new Date());

  const { data: card } = await supabase.from('credit_cards').select('*').eq('id', params.id).single();
  if (!card) notFound();

  const invoices = await listInvoicesByCard(params.id);

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="text-2xl font-semibold">{card.name}</h2>
        <p className="mt-1 text-sm text-zinc-400">Limite: {card.limit_amount ? formatCurrencyBRL(Number(card.limit_amount)) : '—'} • Fechamento dia {card.closing_day} • Vencimento dia {card.due_day}</p>
      </header>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="mb-3 text-lg font-semibold">Faturas</h3>
        {invoices.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhuma fatura encontrada.</p>
        ) : (
          <div className="space-y-2">
            {invoices.map((invoice) => {
              const isCurrent = invoice.reference_month === month;
              return (
                <div key={invoice.id} className={`rounded-xl border p-3 ${isCurrent ? 'border-emerald-700/70 bg-emerald-950/20' : 'border-zinc-800 bg-zinc-950/60'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <Link href={`/cards/${params.id}/invoices/${invoice.id}`} className="flex-1 hover:underline">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatMonthBR(invoice.reference_month)}</span>
                        {isCurrent ? <span className="rounded-full bg-emerald-900/60 px-2 py-0.5 text-xs text-emerald-300">Atual</span> : null}
                      </div>
                      <p className="mt-1 text-sm text-zinc-400">Total: {formatCurrencyBRL(Number(invoice.total_amount))} • Status: {invoice.status}</p>
                      <p className="text-xs text-zinc-500">Fechamento: {formatDateBR(invoice.closing_date)} • Vencimento: {formatDateBR(invoice.due_date)}</p>
                    </Link>
                    {invoice.status !== 'paid' ? <InvoiceActions invoiceId={invoice.id} /> : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}
