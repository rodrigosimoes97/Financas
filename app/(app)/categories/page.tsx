import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/app-shell/page-header';
import { ptBR } from '@/lib/i18n/pt-BR';
import { CategoriesManager } from '@/components/forms/categories-manager';

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase.from('categories').select('*').order('name');

  return (
    <section className="space-y-5">
      <PageHeader title={ptBR.pages.categoriesTitle} subtitle="Organize receitas e despesas com categorias claras." />
      <CategoriesManager rows={rows ?? []} />
    </section>
  );
}
