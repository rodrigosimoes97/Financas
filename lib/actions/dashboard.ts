'use server';

import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface DashboardInsight {
  emoji: string;
  level: 'info' | 'warn';
  text: string;
}

export interface DashboardSummary {
  income_total: number;
  expense_total: number;
  balance_total: number;
  cards: Array<{
    card_id: string;
    card_name: string;
    current_invoice_total: number;
    next_invoice_total: number;
    closing_date: string;
    due_date: string;
    limit_used: number;
    limit_available: number | null;
  }>;
  category_spend: Array<{ category_id: string; name: string; total: number }>;
  upcoming_payments: Array<{ label: string; due_date: string; amount: number; source_type: string }>;
  free_money_estimate: number;
  recent_transactions: Array<{
    id: string;
    date: string;
    title: string;
    amount: number;
    category: string;
    payment_method: string;
    card_name?: string;
    installment_index?: number;
    installment_total?: number;
  }>;
}

export async function getDashboardData(month: string) {
  noStore();
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: 'Usuário não autenticado.' };
  }

  await supabase.rpc('generate_pending_recurring_transactions', { p_user_id: user.id });

  const [summaryResult, insightsResult, goalsResult] = await Promise.all([
    supabase.rpc('get_dashboard_summary', { p_user_id: user.id, p_month: `${month}-01` }),
    supabase.rpc('get_dashboard_insights', { p_user_id: user.id, p_month: `${month}-01` }),
    supabase
      .from('goals')
      .select('id,name,target_amount,current_amount,monthly_limit,month,type,deadline')
      .eq('month', `${month}-01`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  if (summaryResult.error) return { ok: false as const, error: summaryResult.error.message };
  if (insightsResult.error) return { ok: false as const, error: insightsResult.error.message };

  return {
    ok: true as const,
    summary: (summaryResult.data ?? {}) as DashboardSummary,
    insights: (insightsResult.data ?? []) as DashboardInsight[],
    goal: goalsResult.data
  };
}
