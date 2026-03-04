import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatCurrencyBRL, formatDateBR, formatMonthBR } from '@/lib/utils';
import { InvoiceActions } from '@/components/cards/invoice-actions';
import { InvoiceTransactionItem } from '@/components/cards/invoice-transaction-item';
import { getInvoiceStatusLabel } from '../../page';

export default async function InvoiceDetailPage({ params }: { params: { id: string; invoiceId: string } }) {
  const supabase = await createClient();

  const [{ data: card }, { data: invoice }] = await Promise.all([
    supabase.from('credit_cards').select('id,name,limit_amount').eq('id', params.id).maybeSingle(),
    supabase
      .from('invoices_with_totals')
      .select('id,credit_card_id,reference_month,closing_date,due_date,total_amount,status,transactions_count')
      .eq('id', params.invoiceId)
      .eq('credit_card_id', params.id)
      .maybeSingle()
  ]);

  if (!card || !invoice) notFound();

  const { data: rows } = await supabase
    .from('transactions')
    .select('id,date,amount,description,created_at,installment_number,installment_index,total_installments,installments_total,parent_transaction_id,is_installment,category:categories(name)')
    .eq('invoice_id', params.invoiceId)
    .eq('payment_method', 'credit')
    .eq('type', 'expense')
    .eq('is_installment', true)
    .not('parent_transaction_id', 'is', null)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  return (
    <section className="space-y-5">
      <header className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{card.name}</p>
        <h2 className="mt-1 text-2xl font-semibold">Fatura {formatMonthBR(invoice.reference_month)}</h2>
        <p className="mt-3 text-3xl font-bold text-zinc-100">{formatCurrencyBRL(Number(invoice.total_amount))}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm text-zinc-300">
          <span className="rounded-full border border-zinc-700 px-3 py-1">Status: {getInvoiceStatusLabel(invoice.status)}</span>
          <span className="rounded-full border border-zinc-700 px-3 py-1">Vencimento: {formatDateBR(invoice.due_date)}</span>
          <span className="rounded-full border border-zinc-700 px-3 py-1">Limite: {card.limit_amount ? formatCurrencyBRL(Number(card.limit_amount)) : '—'}</span>
        </div>
        <p className="mt-2 text-xs text-zinc-500">Abertura do ciclo: {formatDateBR(invoice.reference_month)} • Fechamento: {formatDateBR(invoice.closing_date)}</p>
        {invoice.status !== 'paid' ? <div className="mt-4"><InvoiceActions invoiceId={invoice.id} label="Marcar fatura como paga" /></div> : null}
      </header>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Lançamentos da fatura</h3>
          <p className="text-xs text-zinc-400">{invoice.transactions_count} itens</p>
        </div>
        {(rows ?? []).length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/60 p-4 text-sm text-zinc-500">Nenhum lançamento nesta fatura.</p>
        ) : (
          <div className="space-y-2">
            {(rows ?? []).map((row) => {
              const totalInstallments = row.total_installments ?? row.installments_total;
              const installmentNumber = row.installment_number ?? row.installment_index;
              const cleanDescription = (row.description || 'Transação').replace(/\s*[•\-]?\s*\(\d+\/\d+\)\s*$/, '');
              const title = installmentNumber && totalInstallments
                ? `${cleanDescription} • (${installmentNumber}/${totalInstallments})`
                : cleanDescription;

              return (
                <InvoiceTransactionItem
                  key={row.id}
                  id={row.id}
                  invoiceId={invoice.id}
                  title={title}
                  subtitle={`${(row.category as { name?: string } | null)?.name ?? 'Categoria'} • ${formatDateBR(row.date)}`}
                  amountLabel={formatCurrencyBRL(Number(row.amount))}
                />
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}
