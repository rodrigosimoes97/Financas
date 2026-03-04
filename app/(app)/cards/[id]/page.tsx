import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatCurrencyBRL, formatDateBR, formatMonthBR } from '@/lib/utils';
import { listInvoicesByCard } from '@/lib/actions/credit-cards';
import { InvoiceActions } from '@/components/cards/invoice-actions';
import { ptBR } from '@/lib/i18n/pt-BR';

type InvoiceStatus = keyof typeof ptBR.invoice;

export function getInvoiceStatusLabel(status: string) {
  const key = status as InvoiceStatus;
  return ptBR.invoice[key] ?? status;
}

const statusClasses: Record<string, string> = {
  open: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  closed: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  paid: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
};

export default async function CardDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const { data: card } = await supabase.from('credit_cards').select('id,name,limit_amount,closing_day,due_day').eq('id', params.id).single();
  if (!card) notFound();

  const invoices = await listInvoicesByCard(params.id);

  return (
    <section className="space-y-5">
      <header className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 shadow-lg shadow-black/20">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Cartão</p>
        <h2 className="mt-2 text-2xl font-semibold text-zinc-100">{card.name}</h2>
        <div className="mt-4 grid gap-2 text-sm text-zinc-300 md:grid-cols-3">
          <p className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">Limite: <span className="font-medium text-zinc-100">{card.limit_amount ? formatCurrencyBRL(Number(card.limit_amount)) : '—'}</span></p>
          <p className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">Fechamento: <span className="font-medium text-zinc-100">dia {card.closing_day}</span></p>
          <p className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">Vencimento: <span className="font-medium text-zinc-100">dia {card.due_day}</span></p>
        </div>
      </header>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Faturas com lançamentos</h3>
          <p className="text-xs text-zinc-400">Ordenado da mais recente para a mais antiga</p>
        </div>

        {invoices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/60 p-6 text-center">
            <p className="text-sm text-zinc-400">Ainda não existem faturas com transações para este cartão.</p>
            <Link href="/transactions" className="mt-3 inline-flex rounded-xl bg-emerald-400 px-4 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-300">
              Adicionar despesa no crédito
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <article key={invoice.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                <div className="flex items-start justify-between gap-4">
                  <Link href={`/cards/${params.id}/invoices/${invoice.id}`} className="min-w-0 flex-1 hover:opacity-90">
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold text-zinc-100">{formatMonthBR(invoice.reference_month)}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${statusClasses[invoice.status] ?? 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30'}`}>
                        {getInvoiceStatusLabel(invoice.status)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-300">Total real: <span className="font-semibold text-zinc-100">{formatCurrencyBRL(Number(invoice.total_amount))}</span> • {invoice.transactions_count} lançamentos</p>
                    <p className="mt-1 text-xs text-zinc-500">Abertura do ciclo: {formatDateBR(invoice.reference_month)} • Fechamento: {formatDateBR(invoice.closing_date)} • Vencimento: {formatDateBR(invoice.due_date)}</p>
                  </Link>
                  {invoice.status !== 'paid' ? <InvoiceActions invoiceId={invoice.id} label="Marcar fatura como paga" /> : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
