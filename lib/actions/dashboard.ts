'use server';

import { unstable_cache, revalidateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const MONTH_REGEX = /^\d{4}-\d{2}$/;

export interface DashboardInsight {
  id: string;
  severity: 'info' | 'warn' | 'critical';
  title: string;
  message: string;
  metric_value: number | null;
  delta_value: number | null;
  cta_label?: string | null;
  cta_route?: string | null;
}

export interface DashboardSummaryPayload {
  forecast: {
    spent_so_far: number;
    days_elapsed: number;
    days_in_month: number;
    daily_avg: number;
    projected_spent: number;
    projected_remaining_budget: number | null;
    projected_savings: number;
    confidence: 'low' | 'medium' | 'high';
  };
  spending_breakdown: {
    total_expenses: number;
    total_income: number;
    net: number;
    categories: Array<{ category_id: string | null; category_name: string; total: number; percentage: number }>;
    essentials_total: number;
    non_essentials_total: number;
    payment_mix: Array<{ payment_type: string; total: number; percentage: number }>;
    credit_cards_total: number;
    accounts_total: number;
  };
  insights: Array<{
    id: string;
    severity: 'info' | 'warn' | 'critical';
    title: string;
    message: string;
    metric_value: number | null;
    delta_value: number | null;
    cta_label?: string | null;
    cta_route?: string | null;
  }>;
  investment_goals: Array<{
    goal_id: string;
    name: string;
    target_amount: number;
    current_amount: number;
    contributed_this_month: number;
    remaining_amount: number;
    months_to_target: number | null;
    required_monthly_contribution: number | null;
    status: 'on_track' | 'behind' | 'ahead';
  }>;
  expenses_by_category: Array<{ category_id: string; name: string; total: number }>;
  invoices_summary: Array<{ card_id: string; card_name: string; current_invoice_total: number; next_invoice_total: number }>;
}

const normalizeMonthInput = (month: string) => (MONTH_REGEX.test(month) ? `${month}-01` : null);

const sumTotals = (values: Array<number>) => values.reduce((acc, value) => acc + (Number.isFinite(value) ? value : 0), 0);

const validateDashboardConsistency = (summary: DashboardSummaryPayload) => {
  const tolerance = 0.5;
  const breakdown = summary.spending_breakdown;

  const accountsTotal = Number(breakdown?.accounts_total ?? 0);
  const creditCardsTotal = Number(breakdown?.credit_cards_total ?? 0);
  const totalExpenses = Number(breakdown?.total_expenses ?? 0);

  const expectedTotal = accountsTotal + creditCardsTotal;
  if (Math.abs(expectedTotal - totalExpenses) > tolerance) {
    console.warn('[dashboard.consistency] accounts_total + credit_cards_total diverge de total_expenses', {
      accountsTotal,
      creditCardsTotal,
      totalExpenses,
      expectedTotal,
      possibleCause: 'Dados legados sem invoice_id/reference_month ou transações antigas sem normalização.'
    });
  }

  const categoriesSum = sumTotals((breakdown?.categories ?? []).map((item) => Number(item?.total ?? 0)));
  if (Math.abs(categoriesSum - totalExpenses) > tolerance) {
    console.warn('[dashboard.consistency] soma de categorias diverge de total_expenses', {
      categoriesSum,
      totalExpenses,
      possibleCause: 'Categorias ausentes/NULL ou dados antigos com categoria removida.'
    });
  }

  const paymentMixSum = sumTotals((breakdown?.payment_mix ?? []).map((item) => Number(item?.total ?? 0)));
  if (Math.abs(paymentMixSum - totalExpenses) > tolerance) {
    console.warn('[dashboard.consistency] soma do payment_mix diverge de total_expenses', {
      paymentMixSum,
      totalExpenses,
      possibleCause: 'payment_method inconsistente em dados legados.'
    });
  }
};


const getDashboardSummaryCached = unstable_cache(
  async (userId: string, monthStart: string, nextMonthStart: string, today: string) => {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc('get_dashboard_summary', {
      p_user_id: userId,
      p_month_start: monthStart,
      p_next_month_start: nextMonthStart,
      p_today: today
    });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? {}) as DashboardSummaryPayload;
  },
  ['dashboard-summary-v2'],
  { revalidate: 45, tags: ['dashboard-summary'] }
);

export async function getDashboardData(month: string) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return { ok: false as const, error: 'Usuário não autenticado.' };

  const monthStart = normalizeMonthInput(month);
  if (!monthStart) return { ok: false as const, error: 'Mês inválido.' };

  const monthDate = new Date(`${monthStart}T00:00:00.000Z`);
  const nextMonthStart = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  await supabase.rpc('generate_pending_recurring_transactions', { p_user_id: user.id });

  if (process.env.NODE_ENV !== 'production') {
    const [userCtx, serviceCtx] = await Promise.all([
      supabase.rpc('debug_request_context'),
      createAdminClient().rpc('debug_request_context')
    ]);
    console.info('[dashboard.debug_request_context:user]', userCtx.data ?? userCtx.error?.message ?? null);
    console.info('[dashboard.debug_request_context:service]', serviceCtx.data ?? serviceCtx.error?.message ?? null);
  }

  try {
    const summary = await getDashboardSummaryCached(user.id, monthStart, nextMonthStart, today);

    if (process.env.NODE_ENV !== 'production') {
      console.info('[dashboard.summary.raw]', summary);
      validateDashboardConsistency(summary);
    }

    return { ok: true as const, summary };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Erro ao carregar dashboard.' };
  }
}

export async function invalidateDashboardCache() {
  revalidateTag('dashboard-summary');
}
