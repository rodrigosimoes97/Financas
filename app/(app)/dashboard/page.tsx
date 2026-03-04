import { PageHeader } from '@/components/app-shell/page-header';
import { DashboardHeaderMonthPicker } from '@/components/dashboard/dashboard-header-month-picker';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import { CreditCardInvoiceStrip } from '@/components/dashboard/credit-card-invoice-strip';
import { CategorySpendCard } from '@/components/dashboard/category-spend-card';
import { UpcomingPaymentsCard } from '@/components/dashboard/upcoming-payments-card';
import { FreeMoneyCard } from '@/components/dashboard/free-money-card';
import { RecentTransactionsList } from '@/components/dashboard/recent-transactions-list';
import { InsightsRow } from '@/components/dashboard/insights-row';
import { MonthGoalCard } from '@/components/dashboard/month-goal-card';
import { QuickAddTransaction } from '@/components/forms/quick-add-transaction';
import { EmptyState } from '@/components/ui/empty-state';
import { createClient } from '@/lib/supabase/server';
import { getDashboardData } from '@/lib/actions/dashboard';

interface DashboardPageProps {
  searchParams?: { month?: string; view?: 'month' | 'cash' };
}

const MONTH_REGEX = /^\d{4}-\d{2}$/;

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const selectedMonth = MONTH_REGEX.test(searchParams?.month ?? '')
    ? (searchParams?.month as string)
    : new Date().toISOString().slice(0, 7);
  const viewMode = searchParams?.view === 'cash' ? 'cash' : 'month';

  const supabase = await createClient();
  const [{ data: categories }, { data: accounts }, { data: creditCards }, dashboardData] = await Promise.all([
    supabase.from('categories').select('*').order('name'),
    supabase.from('accounts').select('*').is('archived_at', null).order('name'),
    supabase.from('credit_cards').select('*').is('archived_at', null).order('name'),
    getDashboardData(selectedMonth)
  ]);

  return (
    <section className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Resumo financeiro do mês com visão de faturas e projeções"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DashboardHeaderMonthPicker selectedMonth={selectedMonth} viewMode={viewMode} />
            <QuickAddTransaction accounts={accounts ?? []} categories={categories ?? []} creditCards={creditCards ?? []} />
          </div>
        }
      />

      {!dashboardData.ok ? (
        <EmptyState title="Falha ao carregar dashboard" description={dashboardData.error} />
      ) : (
        <>
          <InsightsRow insights={dashboardData.insights} />
          <SummaryCards
            income={Number(dashboardData.summary.income_total ?? 0)}
            expense={Number(dashboardData.summary.expense_total ?? 0)}
            balance={Number(dashboardData.summary.balance_total ?? 0)}
          />
          <CreditCardInvoiceStrip cards={dashboardData.summary.cards ?? []} />

          <div className="grid gap-4 xl:grid-cols-2">
            <CategorySpendCard items={dashboardData.summary.category_spend ?? []} />
            <div className="space-y-4">
              <UpcomingPaymentsCard items={dashboardData.summary.upcoming_payments ?? []} />
              <FreeMoneyCard value={Number(dashboardData.summary.free_money_estimate ?? 0)} />
              <MonthGoalCard goal={dashboardData.goal} expenses={Number(dashboardData.summary.expense_total ?? 0)} />
            </div>
          </div>

          <RecentTransactionsList items={dashboardData.summary.recent_transactions ?? []} />
        </>
      )}
    </section>
  );
}
