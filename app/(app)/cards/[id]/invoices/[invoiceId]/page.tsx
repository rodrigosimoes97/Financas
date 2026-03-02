import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatCurrencyBRL, formatDateBR, formatMonthBR } from '@/lib/utils';
import { InvoiceActions } from '@/components/cards/invoice-actions';

export default async function InvoiceDetailPage({ params }: { params: { id: string; invoiceId: string } }) {
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id,credit_card_id,reference_month,closing_date,due_date,total_amount,status')
    .eq('id', params.invoiceId)
    .eq('credit_card_id', params.id)
    .maybeSingle();

  if (!invoice) notFound();

  const { data: rows } = await supabase
    .from('transactions')
    .select('id,date,amount,description,category_id,created_at,installment_group_id,installment_number,total_installments, category:categories(name)')
    .eq('invoice_id', params.invoiceId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="text-2xl font-semibold">Fatura de {formatMonthBR(invoice.reference_month)}</h2>
        <p className="mt-2 text-sm text-zinc-400">Total: {formatCurrencyBRL(Number(invoice.total_amount))} • Status: {invoice.status}</p>
        <p className="text-xs text-zinc-500">Fechamento: {formatDateBR(invoice.closing_date)} • Vencimento: {formatDateBR(invoice.due_date)}</p>
        {invoice.status !== 'paid' ? <div className="mt-3"><InvoiceActions invoiceId={invoice.id} /></div> : null}
      </header>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="mb-3 text-lg font-semibold">Lançamentos</h3>
        {(rows ?? []).length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhum lançamento nesta fatura.</p>
        ) : (
          <div className="space-y-2">
            {(rows ?? []).map((row) => (
              <div key={row.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {row.description || 'Transação'}
                      {row.installment_group_id && row.installment_number && row.total_installments ? (
                        <span className="ml-2 rounded-md border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-xs text-zinc-300">
                          {row.installment_number}/{row.total_installments}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-zinc-500">{(row.category as { name?: string } | null)?.name ?? 'Categoria'} • {formatDateBR(row.date)}</p>
                  </div>
                  <span className="font-semibold">{formatCurrencyBRL(Number(row.amount))}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
