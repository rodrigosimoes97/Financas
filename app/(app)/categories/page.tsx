import { createCategory, deleteCategory, updateCategory } from '@/lib/actions/categories';
import { createClient } from '@/lib/supabase/server';

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase.from('categories').select('*').order('name');

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold">Categories</h2>
      <form action={createCategory} className="card grid gap-2 p-4 md:grid-cols-3">
        <input name="name" required placeholder="Category name" className="rounded border border-border bg-transparent p-2" />
        <select name="type" className="rounded border border-border bg-transparent p-2"><option value="expense">Expense</option><option value="income">Income</option></select>
        <button className="rounded bg-white px-3 py-2 text-black">Add</button>
      </form>

      <div className="space-y-3">
        {(rows ?? []).map((category) => (
          <form key={category.id} action={updateCategory.bind(null, category.id)} className="card grid gap-2 p-4 md:grid-cols-4">
            <input name="name" defaultValue={category.name} className="rounded border border-border bg-transparent p-2" />
            <select name="type" defaultValue={category.type} className="rounded border border-border bg-transparent p-2"><option value="expense">Expense</option><option value="income">Income</option></select>
            <button className="rounded border border-border px-3 py-2">Save</button>
            <button formAction={deleteCategory.bind(null, category.id)} className="rounded bg-red-500/80 px-3 py-2 text-white">Delete</button>
          </form>
        ))}
      </div>
    </section>
  );
}
