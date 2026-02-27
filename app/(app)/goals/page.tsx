import { createGoal, deleteGoal, updateGoal } from '@/lib/actions/goals';
import { createClient } from '@/lib/supabase/server';

export default async function GoalsPage() {
  const supabase = await createClient();
  const [{ data: rows }, { data: categories }] = await Promise.all([
    supabase.from('goals').select('*, category:categories(name)').order('month', { ascending: false }),
    supabase.from('categories').select('*').eq('type', 'expense').order('name')
  ]);

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold">Goals</h2>
      <form action={createGoal} className="card grid gap-2 p-4 md:grid-cols-4">
        <select name="category_id" className="rounded border border-border bg-transparent p-2">{(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <input name="monthly_limit" type="number" step="0.01" required className="rounded border border-border bg-transparent p-2" />
        <input name="month" type="date" required className="rounded border border-border bg-transparent p-2" />
        <button className="rounded bg-white px-3 py-2 text-black">Add</button>
      </form>

      <div className="space-y-3">
        {(rows ?? []).map((goal) => (
          <form key={goal.id} action={updateGoal.bind(null, goal.id)} className="card grid gap-2 p-4 md:grid-cols-5">
            <select name="category_id" defaultValue={goal.category_id} className="rounded border border-border bg-transparent p-2">{(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <input name="monthly_limit" type="number" step="0.01" defaultValue={Number(goal.monthly_limit)} className="rounded border border-border bg-transparent p-2" />
            <input name="month" type="date" defaultValue={goal.month} className="rounded border border-border bg-transparent p-2" />
            <button className="rounded border border-border px-3 py-2">Save</button>
            <button formAction={deleteGoal.bind(null, goal.id)} className="rounded bg-red-500/80 px-3 py-2 text-white">Delete</button>
          </form>
        ))}
      </div>
    </section>
  );
}
