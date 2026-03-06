import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/app-shell/page-header';
import { GoalsTabs } from '@/components/goals/goals-tabs';
import { Goal, GoalContribution } from '@/types/models';

interface GoalsPageProps {
  searchParams?: { month?: string };
}

const MONTH_REGEX = /^\d{4}-\d{2}$/;

export default async function GoalsPage({ searchParams }: GoalsPageProps) {
  const selectedMonth = MONTH_REGEX.test(searchParams?.month ?? '') ? String(searchParams?.month) : new Date().toISOString().slice(0, 7);

  const supabase = await createClient();

  const [{ data: goals }, { data: categories }, { data: contributions }] = await Promise.all([
    supabase.from('goals').select('*, category:categories(name)').order('created_at', { ascending: false }),
    supabase.from('categories').select('*').eq('type', 'expense').order('name'),
    supabase.from('goal_contributions').select('*').order('contribution_date', { ascending: false })
  ]);

  const contributionsByGoalId = ((contributions ?? []) as GoalContribution[]).reduce<Record<string, GoalContribution[]>>((acc, contribution) => {
    if (!acc[contribution.goal_id]) acc[contribution.goal_id] = [];
    acc[contribution.goal_id].push(contribution);
    return acc;
  }, {});

  return (
    <section className="space-y-5">
      <PageHeader
        title="Metas"
        subtitle="Acompanhe metas de economia e limites por categoria em uma única visão."
        actions={(
          <form action="/goals" className="flex items-center gap-2 text-sm">
            <label htmlFor="month" className="text-zinc-400">Mês:</label>
            <input id="month" name="month" type="month" defaultValue={selectedMonth} className="rounded-xl border border-zinc-700 bg-zinc-900 px-2 py-1.5" />
            <button className="rounded-xl border border-zinc-700 px-2.5 py-1.5 hover:bg-zinc-800" type="submit">Filtrar</button>
          </form>
        )}
      />
      <GoalsTabs
        goals={(goals ?? []) as Goal[]}
        categories={categories ?? []}
        contributionsByGoalId={contributionsByGoalId}
        selectedMonth={selectedMonth}
      />
    </section>
  );
}
