import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/app-shell/page-header';
import { ptBR } from '@/lib/i18n/pt-BR';
import { GoalsManager } from '@/components/forms/goals-manager';
import { Goal } from '@/types/models';

export default async function GoalsPage() {
  const supabase = await createClient();
  const [{ data: rows }, { data: categories }] = await Promise.all([
    supabase.from('goals').select('*, category:categories(name)').order('month', { ascending: false }),
    supabase.from('categories').select('*').eq('type', 'expense').order('name')
  ]);

  return (
    <section className="space-y-5">
      <PageHeader title={ptBR.pages.goalsTitle} subtitle="Defina limites por categoria e acompanhe seu planejamento." />
      <GoalsManager rows={(rows ?? []) as Goal[]} categories={categories ?? []} />
    </section>
  );
}
