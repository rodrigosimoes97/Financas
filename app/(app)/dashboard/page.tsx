import { CategoryPieChart } from '@/components/dashboard/category-pie-chart';
import { MetricCard } from '@/components/dashboard/metric-card';
import { QuickAddTransaction } from '@/components/forms/quick-add-transaction';
import { PageHeader } from '@/components/app-shell/page-header';
import { calculateMonthlyTotals, formatCurrencyBRL, formatMonthBR } from '@/lib/utils';
import { createClient } from '@/lib/supabase/server';
import { ptBR } from '@/lib/i18n/pt-BR';

export default async function DashboardPage() {
  const supabase = await createClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthDate = monthStart.toISOString().slice(0, 10);

  const [{ data: transactions }, { data: categories }, { data: accounts }, { data: goals }] = await Promise.all([
    supabase
      .from('transactions')
      .select('id,user_id,account_id,category_id,amount,type,description,date,created_at, category:categories(name,type)')
      .gte('date', monthDate)
      .order('date', { ascending: false }),
    supabase.from('categories').select('*').order('name'),
    supabase.from('accounts').select('*').order('name'),
    supabase.from('goals').select('id,monthly_limit,month, category:categories(name)').eq('month', monthDate)
  ]);

  const totals = calculateMonthlyTotals(transactions ?? []);
  const pieMap = (transactions ?? [])
    .filter((transaction) => transaction.type === 'expense')
    .reduce<Record<string, number>>((acc, transaction) => {
      const name = transaction.category?.name ?? 'Outros';
      acc[name] = (acc[name] ?? 0) + Number(transaction.amount);
      return acc;
    }, {});

  const pieData = Object.entries(pieMap).map(([name, value]) => ({ name, value }));

  return (
    <section className="space-y-6">
      <PageHeader
        title={ptBR.dashboard.title}
        subtitle={`${ptBR.dashboard.subtitle} • ${formatMonthBR(monthDate)}`}
        actions={<QuickAddTransaction accounts={accounts ?? []} categories={categories ?? []} />}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title={ptBR.dashboard.totalIncome} subtitle="Entradas confirmadas no mês" value={totals.income} />
        <MetricCard title={ptBR.dashboard.totalExpenses} subtitle="Saídas registradas no mês" value={totals.expenses} />
        <MetricCard title={ptBR.dashboard.currentBalance} subtitle="Resultado parcial mensal" value={totals.balance} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <CategoryPieChart data={pieData} />
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-lg shadow-black/10">
          <h3 className="text-lg font-semibold">{ptBR.dashboard.goalsMonth}</h3>
          <p className="mb-4 text-sm text-zinc-400">{ptBR.dashboard.goalsHint}</p>
          {(goals ?? []).length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-700 px-3 py-8 text-center text-sm text-zinc-500">
              {ptBR.states.noGoals}
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              {(goals ?? []).map((goal) => (
                <div key={goal.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2">
                  <span>{goal.category?.name ?? ptBR.labels.category}</span>
                  <span className="font-medium">{formatCurrencyBRL(Number(goal.monthly_limit))}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
