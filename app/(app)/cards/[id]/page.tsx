import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatCurrencyBRL, formatDateBR, formatMonthBR, getMonthStartISO } from '@/lib/utils';
import { InvoiceActions } from '@/components/cards/invoice-actions';

export default async function CardDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const month = getMonthStartISO(new Date());

  const { data: card } = await supabase.from('credit_cards').select('*').eq('id', params.id).single();
  if (!card) notFound();

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*')
    .eq('credit_card_id', params.id)
    .eq('reference_month', month)
    .maybeSingle();

  const { data: invoiceTransactions } = await supabase
    .from('transactions')
    .select('id,description,amount,date,installment_group_id,installment_number,total_installments')
    .eq('invoice_id', invoice?.id ?? '00000000-0000-0000-0000-000000000000')
    .order('date', { ascending: false })
    .limit(10);

  const { data: groups } = await supabase
    .from('installment_groups')
    .select('*')
    .eq('credit_card_id', params.id)
    .order('created_at', { ascending: false });

  const groupedProgress = await Promise.all((groups ?? []).map(async (group) => {
    const { data: txs } = await supabase
      .from('transactions')
      .select('installment_number,total_installments,date,amount')
      .eq('installment_group_id', group.id)
      .order('installment_number', { ascending: true });

    const paidCount = (txs ?? []).filter((t) => new Date(t.date) < new Date()).length;
    const nextInstallment = (txs ?? []).find((t) => new Date(t.date) >= new Date()) ?? txs?.[txs.length - 1];

    return { group, paidCount, nextInstallment, txs: txs ?? [] };
  }));

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="text-2xl font-semibold">{card.name}</h2>
        <p className="mt-1 text-sm text-zinc-400">Limite: {card.limit_amount ? formatCurrencyBRL(Number(card.limit_amount)) : '—'} • Fechamento dia {card.closing_day} • Vencimento dia {card.due_day}</p>
      </header>

      <section id="lancamentos" className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="text-lg font-semibold">Fatura atual ({formatMonthBR(month)})</h3>
        <p className="mt-2">Total: <b>{formatCurrencyBRL(Number(invoice?.total_amount ?? 0))}</b> • Status: {invoice?.status ?? 'open'}</p>
        <div className="mt-3 flex gap-2">
          <a href="#lancamentos" className="rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800">Ver lançamentos</a>
          {invoice?.id ? <InvoiceActions invoiceId={invoice.id} /> : null}
        </div>
      </section>

      <section id="lancamentos" className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="mb-3 text-lg font-semibold">Lançamentos da fatura atual</h3>
        <div className="space-y-2">
          {(invoiceTransactions ?? []).map((tx) => (
            <div key={tx.id} className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
              <div className="flex justify-between"><span>{tx.description || 'Transação'}</span><b>{formatCurrencyBRL(Number(tx.amount))}</b></div>
              <div className="text-xs text-zinc-500">{formatDateBR(tx.date)} {tx.installment_number ? `• ${tx.installment_number}/${tx.total_installments}` : ''}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="lancamentos" className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="mb-3 text-lg font-semibold">Parcelas ativas</h3>
        <div className="space-y-3">
          {groupedProgress.map(({ group, paidCount, nextInstallment, txs }) => (
            <div key={group.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              <div className="flex justify-between">
                <span>{group.description || 'Compra parcelada'}</span>
                <span>{formatCurrencyBRL(Number(group.total_amount))}</span>
              </div>
              <p className="text-sm text-zinc-400">{paidCount}/{group.total_installments} parcelas • Próxima: {nextInstallment ? `${formatMonthBR(nextInstallment.date)} (${formatCurrencyBRL(Number(nextInstallment.amount))})` : '—'}</p>
              <div className="mt-2 grid gap-1 text-xs text-zinc-500">
                {txs.map((t) => <span key={`${group.id}-${t.installment_number}`}>{t.installment_number}/{t.total_installments} • {formatMonthBR(t.date)} • {formatCurrencyBRL(Number(t.amount))}</span>)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
