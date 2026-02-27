import { createTransaction, deleteTransaction, updateTransaction } from '@/lib/actions/transactions';
import { createClient } from '@/lib/supabase/server';

export default async function TransactionsPage() {
  const supabase = await createClient();
  const [{ data: rows }, { data: categories }, { data: accounts }] = await Promise.all([
    supabase.from('transactions').select('*').order('date', { ascending: false }),
    supabase.from('categories').select('*').order('name'),
    supabase.from('accounts').select('*').order('name')
  ]);

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold">Transactions</h2>
      <form action={createTransaction} className="card grid gap-2 p-4 md:grid-cols-7">
        <input name="description" placeholder="Description" className="rounded border border-border bg-transparent p-2" />
        <input name="amount" type="number" step="0.01" required className="rounded border border-border bg-transparent p-2" />
        <input name="date" type="date" required className="rounded border border-border bg-transparent p-2" />
        <select name="type" className="rounded border border-border bg-transparent p-2"><option value="income">Income</option><option value="expense">Expense</option></select>
        <select name="account_id" className="rounded border border-border bg-transparent p-2">{(accounts ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
        <select name="category_id" className="rounded border border-border bg-transparent p-2">{(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <button className="rounded bg-white px-3 py-2 text-black">Add</button>
      </form>

      <div className="space-y-3">
        {(rows ?? []).map((tx) => (
          <form key={tx.id} action={updateTransaction.bind(null, tx.id)} className="card grid gap-2 p-4 md:grid-cols-8">
            <input name="description" defaultValue={tx.description ?? ''} className="rounded border border-border bg-transparent p-2" />
            <input name="amount" type="number" step="0.01" defaultValue={Number(tx.amount)} className="rounded border border-border bg-transparent p-2" />
            <input name="date" type="date" defaultValue={tx.date} className="rounded border border-border bg-transparent p-2" />
            <select name="type" defaultValue={tx.type} className="rounded border border-border bg-transparent p-2"><option value="income">Income</option><option value="expense">Expense</option></select>
            <select name="account_id" defaultValue={tx.account_id} className="rounded border border-border bg-transparent p-2">{(accounts ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
            <select name="category_id" defaultValue={tx.category_id} className="rounded border border-border bg-transparent p-2">{(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <button className="rounded border border-border px-3 py-2">Save</button>
            <button formAction={deleteTransaction.bind(null, tx.id)} className="rounded bg-red-500/80 px-3 py-2 text-white">Delete</button>
          </form>
        ))}
      </div>
    </section>
  );
}
