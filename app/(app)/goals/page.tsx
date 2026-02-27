import { createGoal, deleteGoal, updateGoal } from '@/lib/actions/goals';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/app-shell/page-header';
import { formatCurrencyBRL, formatMonthBR } from '@/lib/utils';
import { ptBR } from '@/lib/i18n/pt-BR';

export default async function GoalsPage() {
  const supabase = await createClient();
  const [{ data: rows }, { data: categories }] = await Promise.all([
    supabase.from('goals').select('*, category:categories(name)').order('month', { ascending: false }),
    supabase.from('categories').select('*').eq('type', 'expense').order('name')
  ]);

  return (
    <section className="space-y-5">
      <PageHeader title={ptBR.pages.goalsTitle} subtitle="Defina limites por categoria e acompanhe seu planejamento." />
      <form action={createGoal} className="grid gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 md:grid-cols-4">
        <select name="category_id" className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5">{(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <input name="monthly_limit" type="number" step="0.01" required placeholder={ptBR.labels.monthlyLimit} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" />
        <input name="month" type="date" required className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" />
        <button className="rounded-xl bg-emerald-400 px-3 py-2.5 font-medium text-emerald-950 hover:bg-emerald-300">{ptBR.actions.add}</button>
      </form>

      {(rows ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 px-4 py-12 text-center text-zinc-400">{ptBR.states.noGoals}</div>
      ) : (
        <div className="space-y-2">
          {(rows ?? []).map((goal) => (
            <form key={goal.id} action={updateGoal.bind(null, goal.id)} className="grid gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-zinc-700 md:grid-cols-5">
              <select name="category_id" defaultValue={goal.category_id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5">{(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              <input name="monthly_limit" type="number" step="0.01" defaultValue={Number(goal.monthly_limit)} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" />
              <input name="month" type="date" defaultValue={goal.month} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" />
              <button className="rounded-xl border border-zinc-700 px-3 py-2.5 text-sm hover:bg-zinc-800">{ptBR.actions.save}</button>
              <button formAction={deleteGoal.bind(null, goal.id)} className="rounded-xl bg-rose-500/80 px-3 py-2.5 text-sm font-medium text-white hover:bg-rose-500">{ptBR.actions.delete}</button>
              <div className="md:col-span-5 text-xs text-zinc-500">
                {(goal.category as { name?: string })?.name ?? ptBR.labels.category} • {formatCurrencyBRL(Number(goal.monthly_limit))} • {formatMonthBR(goal.month)}
              </div>
            </form>
          ))}
        </div>
      )}
    </section>
  );
}
