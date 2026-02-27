import { createTransaction, deleteTransaction, updateTransaction } from '@/lib/actions/transactions';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/app-shell/page-header';
import { QuickAddTransaction } from '@/components/forms/quick-add-transaction';
import { formatCurrencyBRL, formatDateBR, formatMonthBR, typeToLabel } from '@/lib/utils';
import { ptBR } from '@/lib/i18n/pt-BR';

export default async function TransactionsPage() {
  const supabase = await createClient();
  const [{ data: rows }, { data: categories }, { data: accounts }] = await Promise.all([
    supabase.from('transactions').select('*').order('date', { ascending: false }),
    supabase.from('categories').select('*').order('name'),
    supabase.from('accounts').select('*').order('name')
  ]);

  return (
    <section className="space-y-5">
      <PageHeader
        title={ptBR.pages.transactionsTitle}
        subtitle="Gerencie suas movimentações financeiras com clareza."
        actions={<QuickAddTransaction accounts={accounts ?? []} categories={categories ?? []} />}
      />

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <p className="mb-3 text-sm text-zinc-400">{ptBR.hints.filters}</p>
        <div className="grid gap-2 md:grid-cols-4">
          <select className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-sm">
            <option>{formatMonthBR(new Date())}</option>
          </select>
          <select className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-sm">
            <option>{ptBR.labels.allCategories}</option>
            {(categories ?? []).map((c) => <option key={c.id}>{c.name}</option>)}
          </select>
          <select className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-sm">
            <option>{ptBR.labels.allTypes}</option>
            <option>{ptBR.typeLabel.income}</option>
            <option>{ptBR.typeLabel.expense}</option>
          </select>
          <button className="rounded-xl border border-zinc-700 px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800">{ptBR.actions.clear}</button>
        </div>
      </div>

      <form action={createTransaction} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <h3 className="mb-3 text-sm font-medium text-zinc-300">{ptBR.actions.newTransaction}</h3>
        <div className="grid gap-2 md:grid-cols-7">
          <input name="description" placeholder={ptBR.labels.description} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" />
          <input name="amount" type="number" step="0.01" required placeholder={ptBR.labels.amount} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" />
          <input name="date" type="date" required className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" />
          <select name="type" className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5"><option value="income">Receita</option><option value="expense">Despesa</option></select>
          <select name="account_id" className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5">{(accounts ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          <select name="category_id" className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5">{(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <button className="rounded-xl bg-emerald-400 px-3 py-2.5 font-medium text-emerald-950 hover:bg-emerald-300">{ptBR.actions.add}</button>
        </div>
      </form>

      {(rows ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 px-4 py-12 text-center text-zinc-400">{ptBR.states.noTransactions}</div>
      ) : (
        <div className="space-y-2">
          {(rows ?? []).map((tx) => (
            <form key={tx.id} action={updateTransaction.bind(null, tx.id)} className="grid gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-zinc-700 hover:bg-zinc-900 md:grid-cols-8">
              <input name="description" defaultValue={tx.description ?? ''} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" />
              <input name="amount" type="number" step="0.01" defaultValue={Number(tx.amount)} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" />
              <input name="date" type="date" defaultValue={tx.date} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" />
              <select name="type" defaultValue={tx.type} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5"><option value="income">Receita</option><option value="expense">Despesa</option></select>
              <select name="account_id" defaultValue={tx.account_id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5">{(accounts ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
              <select name="category_id" defaultValue={tx.category_id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5">{(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              <button className="rounded-xl border border-zinc-700 px-3 py-2.5 text-sm hover:bg-zinc-800">{ptBR.actions.save}</button>
              <button formAction={deleteTransaction.bind(null, tx.id)} className="rounded-xl bg-rose-500/80 px-3 py-2.5 text-sm font-medium text-white hover:bg-rose-500">{ptBR.actions.delete}</button>
              <div className="md:col-span-8 text-xs text-zinc-500">
                {typeToLabel(tx.type)} • {formatCurrencyBRL(Number(tx.amount))} • {formatDateBR(tx.date)}
              </div>
            </form>
          ))}
        </div>
      )}
    </section>
  );
}
