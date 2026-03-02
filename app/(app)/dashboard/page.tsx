import { CategoryPieChart } from '@/components/dashboard/category-pie-chart';
import { MetricCard } from '@/components/dashboard/metric-card';
import { QuickAddTransaction } from '@/components/forms/quick-add-transaction';
import { PageHeader } from '@/components/app-shell/page-header';
import { calculateMonthlyTotals, formatCurrencyBRL, formatDateBR, formatMonthBR, getMonthStartISO } from '@/lib/utils';
import { createClient } from '@/lib/supabase/server';
import { ptBR } from '@/lib/i18n/pt-BR';
import { Transaction } from '@/types/models';

interface DashboardTransactionRow extends Omit<Transaction, 'category' | 'account'> {
  category?: { name: string; type: 'income' | 'expense' } | { name: string; type: 'income' | 'expense' }[];
  account?: { name: string } | { name: string }[];
}

interface DashboardGoalRow {
  id: string;
  monthly_limit: number | string;
  month: string;
  category?: { name: string } | { name: string }[];
}

export default async function DashboardPage({ searchParams }: { searchParams?: { month?: string } }) {
  const supabase = await createClient();
  const selectedMonth = searchParams?.month ?? new Date().toISOString().slice(0, 7);
  const monthDate = `${selectedMonth}-01`;
  const nextMonth = new Date(`${monthDate}T00:00:00`);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const nextMonthDate = getMonthStartISO(nextMonth);

  const [{ data: transactions }, { data: categories }, { data: accounts }, { data: goals }] = await Promise.all([
    supabase
      .from('transactions')
      .select('id,user_id,account_id,category_id,amount,type,payment_method,description,date,created_at, category:categories(name,type), account:accounts(name)')
      .gte('date', monthDate)
      .lt('date', nextMonthDate)
      .order('date', { ascending: false }),
    supabase.from('categories').select('*').order('name'),
    supabase.from('accounts').select('*').order('name'),
    supabase.from('goals').select('id,monthly_limit,month, category:categories(name)').eq('month', monthDate)
  ]);

  const normalizedTransactions: Transaction[] = ((transactions ?? []) as DashboardTransactionRow[]).map((transaction) => ({
    ...transaction,
    category: Array.isArray(transaction.category) ? transaction.category[0] : transaction.category,
    account: Array.isArray(transaction.account) ? transaction.account[0] : transaction.account
  }));

  const normalizedGoals = ((goals ?? []) as DashboardGoalRow[]).map((goal) => ({
    ...goal,
    category: Array.isArray(goal.category) ? goal.category[0] : goal.category
  }));

  const totals = calculateMonthlyTotals(normalizedTransactions);
  const pieMap = normalizedTransactions
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
        actions={
          <div className="flex items-center gap-2">
            <form>
              <input type="month" name="month" defaultValue={selectedMonth} className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm" />
              <button className="ml-2 rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800">Aplicar</button>
            </form>
            <QuickAddTransaction accounts={accounts ?? []} categories={categories ?? []} />
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title={ptBR.dashboard.totalIncome} subtitle="Entradas confirmadas no mês" value={totals.income} />
        <MetricCard title={ptBR.dashboard.totalExpenses} subtitle="Saídas registradas no mês" value={totals.expenses} />
        <MetricCard title={ptBR.dashboard.currentBalance} subtitle="Resultado parcial mensal" value={totals.balance} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <CategoryPieChart data={pieData} />
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-lg shadow-black/10">
            <h3 className="text-lg font-semibold">{ptBR.dashboard.goalsMonth}</h3>
            <p className="mb-4 text-sm text-zinc-400">{ptBR.dashboard.goalsHint}</p>
            {normalizedGoals.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-700 px-3 py-8 text-center text-sm text-zinc-500">
                {ptBR.states.noGoalsMonth}
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                {normalizedGoals.map((goal) => (
                  <div key={goal.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2">
                    <span>{goal.category?.name ?? ptBR.labels.category}</span>
                    <span className="font-medium">{formatCurrencyBRL(Number(goal.monthly_limit))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-lg shadow-black/10">
            <h3 className="mb-3 text-lg font-semibold">{ptBR.dashboard.recentTransactions}</h3>
            {normalizedTransactions.length === 0 ? (
              <p className="text-sm text-zinc-500">{ptBR.states.noTransactions}</p>
            ) : (
              <div className="space-y-2 text-sm">
                {normalizedTransactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span>{transaction.description || transaction.category?.name || 'Transação'}</span>
                      <span className="font-medium">{formatCurrencyBRL(Number(transaction.amount))}</span>
                    </div>
                    <div className="text-xs text-zinc-500">{formatDateBR(transaction.date)} • {transaction.account?.name ?? ptBR.labels.account}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
