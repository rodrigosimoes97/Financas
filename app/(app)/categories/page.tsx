import { createCategory, deleteCategory, updateCategory } from '@/lib/actions/categories';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/app-shell/page-header';
import { ptBR } from '@/lib/i18n/pt-BR';

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase.from('categories').select('*').order('name');

  return (
    <section className="space-y-5">
      <PageHeader title={ptBR.pages.categoriesTitle} subtitle="Organize receitas e despesas com categorias claras." />
      <form action={createCategory} className="grid gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 md:grid-cols-3">
        <input name="name" required placeholder={ptBR.labels.name} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" />
        <select name="type" className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5"><option value="expense">Despesa</option><option value="income">Receita</option></select>
        <button className="rounded-xl bg-emerald-400 px-3 py-2.5 font-medium text-emerald-950 hover:bg-emerald-300">{ptBR.actions.add}</button>
      </form>

      {(rows ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 px-4 py-12 text-center text-zinc-400">{ptBR.states.noCategories}</div>
      ) : (
        <div className="space-y-2">
          {(rows ?? []).map((category) => (
            <form key={category.id} action={updateCategory.bind(null, category.id)} className="grid gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-zinc-700 md:grid-cols-4">
              <input name="name" defaultValue={category.name} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" />
              <select name="type" defaultValue={category.type} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5"><option value="expense">Despesa</option><option value="income">Receita</option></select>
              <button className="rounded-xl border border-zinc-700 px-3 py-2.5 text-sm hover:bg-zinc-800">{ptBR.actions.save}</button>
              <button formAction={deleteCategory.bind(null, category.id)} className="rounded-xl bg-rose-500/80 px-3 py-2.5 text-sm font-medium text-white hover:bg-rose-500">{ptBR.actions.delete}</button>
            </form>
          ))}
        </div>
      )}
    </section>
  );
}
