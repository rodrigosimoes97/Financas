import { PageHeader } from '@/components/app-shell/page-header';
import { DashboardHeaderMonthPicker } from '@/components/dashboard/dashboard-header-month-picker';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import { ForecastCard } from '@/components/dashboard/forecast-card';
import { SpendingBreakdownCard } from '@/components/dashboard/spending-breakdown-card';
import { InsightsList } from '@/components/dashboard/insights-list';
import { InvestmentGoalsCard } from '@/components/dashboard/investment-goals-card';
import { EmptyState } from '@/components/ui/empty-state';
import { GoalsOverviewCard } from '@/components/dashboard/goals-overview-card';
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

  const dashboardData = await getDashboardData(selectedMonth);

  return (
    <section className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Resumo financeiro com forecast, insights e metas de investimento"
        actions={<DashboardHeaderMonthPicker selectedMonth={selectedMonth} viewMode={viewMode} />}
      />

      {!dashboardData.ok ? (
        <EmptyState title="Falha ao carregar dashboard" description={dashboardData.error} />
      ) : (
        <>
          <SummaryCards
            income={Number(dashboardData.summary.spending_breakdown.total_income ?? 0)}
            accountsTotal={Number(dashboardData.summary.spending_breakdown.accounts_total ?? 0)}
            creditCardsTotal={Number(dashboardData.summary.spending_breakdown.credit_cards_total ?? 0)}
            totalExpenses={Number(dashboardData.summary.spending_breakdown.total_expenses ?? 0)}
            balance={Number(dashboardData.summary.spending_breakdown.net ?? 0)}
          />

          <div className="grid gap-4 xl:grid-cols-2">
            <ForecastCard forecast={dashboardData.summary.forecast} />
            <InsightsList insights={dashboardData.summary.insights ?? []} />
          </div>

          <SpendingBreakdownCard breakdown={dashboardData.summary.spending_breakdown} />
          <div className="grid gap-4 xl:grid-cols-2">
            <GoalsOverviewCard
              activeSavings={dashboardData.summary.goals_snapshot?.active_savings_goals ?? 0}
              exceededLimits={dashboardData.summary.goals_snapshot?.exceeded_spend_limits ?? 0}
              topGoals={dashboardData.summary.goals_snapshot?.top_savings_goals ?? []}
            />
            <InvestmentGoalsCard goals={dashboardData.summary.investment_goals ?? []} />
          </div>
        </>
      )}
    </section>
  );
}
