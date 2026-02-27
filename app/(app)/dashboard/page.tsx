import { CategoryPieChart } from '@/components/dashboard/category-pie-chart';
import { MetricCard } from '@/components/dashboard/metric-card';
import { QuickAddTransaction } from '@/components/forms/quick-add-transaction';
import { calculateMonthlyTotals } from '@/lib/utils';
import { createClient } from '@/lib/supabase/server';

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
      const name = transaction.category?.name ?? 'Other';
      acc[name] = (acc[name] ?? 0) + Number(transaction.amount);
      return acc;
    }, {});

  const pieData = Object.entries(pieMap).map(([name, value]) => ({ name, value }));

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Monthly dashboard</h2>
        <QuickAddTransaction accounts={accounts ?? []} categories={categories ?? []} />
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Total income" value={totals.income} />
        <MetricCard title="Total expenses" value={totals.expenses} />
        <MetricCard title="Current balance" value={totals.balance} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryPieChart data={pieData} />
        <div className="card p-4">
          <h3 className="mb-4 text-lg font-medium">Goals this month</h3>
          <div className="space-y-2 text-sm">
            {(goals ?? []).map((goal) => (
              <div key={goal.id} className="flex justify-between">
                <span>{goal.category?.name ?? 'Category'}</span>
                <span>${Number(goal.monthly_limit).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
