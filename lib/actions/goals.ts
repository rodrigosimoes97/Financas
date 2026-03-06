'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { invalidateDashboardCache } from '@/lib/actions/dashboard';

type ActionResult = { ok: boolean; message?: string; error?: string };

const MONTH_REGEX = /^\d{4}-\d{2}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const normalizeMonth = (value: FormDataEntryValue | null) => {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (MONTH_REGEX.test(raw)) return `${raw}-01`;
  if (DATE_REGEX.test(raw)) return raw;
  return null;
};

const normalizeDate = (value: FormDataEntryValue | null) => {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  return DATE_REGEX.test(raw) ? raw : null;
};

const parseAmount = (value: FormDataEntryValue | null) => {
  const parsed = Number(String(value ?? '').replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

async function currentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

const refreshPaths = async () => {
  revalidatePath('/');
  revalidatePath('/goals');
  revalidatePath('/dashboard');
  await invalidateDashboardCache();
};

export async function createGoal(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: 'Usuário não autenticado.' };

  const type = String(formData.get('type') ?? '').toUpperCase();
  const targetAmount = parseAmount(formData.get('target_amount'));
  const deadline = normalizeDate(formData.get('deadline'));
  const month = normalizeMonth(formData.get('month'));
  const name = String(formData.get('name') ?? '').trim() || null;
  const categoryId = String(formData.get('category_id') ?? '').trim() || null;
  const notes = String(formData.get('notes') ?? '').trim() || null;

  if (!['SAVINGS_GOAL', 'SPEND_LIMIT'].includes(type)) return { ok: false, error: 'Tipo de meta inválido.' };
  if (targetAmount <= 0) return { ok: false, error: 'Defina um valor maior que zero.' };

  if (type === 'SAVINGS_GOAL' && !name) return { ok: false, error: 'Informe o nome da meta.' };
  if (type === 'SPEND_LIMIT' && (!categoryId || !month)) {
    return { ok: false, error: 'Categoria e mês são obrigatórios para limite por categoria.' };
  }

  const payload = {
    user_id: user.id,
    type,
    name,
    category_id: type === 'SPEND_LIMIT' ? categoryId : null,
    target_amount: targetAmount,
    current_amount: 0,
    month: type === 'SPEND_LIMIT' ? month : null,
    deadline,
    notes,
    status: 'ACTIVE',
    // Mantemos compatibilidade com bases legadas onde monthly_limit ainda é NOT NULL.
    monthly_limit: targetAmount
  };

  const { error } = await supabase.from('goals').insert(payload);
  if (error) return { ok: false, error: error.message };

  if (type === 'SPEND_LIMIT' && month) {
    await supabase.rpc('recalculate_spend_limits_for_month', { p_user_id: user.id, p_month: month });
  }

  await refreshPaths();
  return { ok: true, message: 'Meta criada com sucesso.' };
}

export async function updateGoal(goalId: string, formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: 'Usuário não autenticado.' };

  const type = String(formData.get('type') ?? '').toUpperCase();
  const targetAmount = parseAmount(formData.get('target_amount'));
  const deadline = normalizeDate(formData.get('deadline'));
  const month = normalizeMonth(formData.get('month'));
  const name = String(formData.get('name') ?? '').trim() || null;
  const categoryId = String(formData.get('category_id') ?? '').trim() || null;
  const notes = String(formData.get('notes') ?? '').trim() || null;

  const { error } = await supabase
    .from('goals')
    .update({
      type,
      name,
      category_id: type === 'SPEND_LIMIT' ? categoryId : null,
      target_amount: targetAmount,
      month: type === 'SPEND_LIMIT' ? month : null,
      deadline,
      notes,
      // Mantemos compatibilidade com bases legadas onde monthly_limit ainda é NOT NULL.
      monthly_limit: targetAmount
    })
    .eq('id', goalId)
    .eq('user_id', user.id);

  if (error) return { ok: false, error: error.message };

  if (type === 'SPEND_LIMIT' && month) {
    await supabase.rpc('recalculate_spend_limits_for_month', { p_user_id: user.id, p_month: month });
  }

  await refreshPaths();
  return { ok: true, message: 'Meta atualizada com sucesso.' };
}

export async function archiveGoal(goalId: string): Promise<ActionResult> {
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: 'Usuário não autenticado.' };

  const { error } = await supabase.from('goals').update({ status: 'ARCHIVED' }).eq('id', goalId).eq('user_id', user.id);
  if (error) return { ok: false, error: error.message };

  await refreshPaths();
  return { ok: true, message: 'Meta arquivada com sucesso.' };
}

export async function deleteGoal(goalId: string): Promise<ActionResult> {
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: 'Usuário não autenticado.' };

  const { error } = await supabase.from('goals').delete().eq('id', goalId).eq('user_id', user.id);
  if (error) return { ok: false, error: error.message };

  await refreshPaths();
  return { ok: true, message: 'Meta excluída com sucesso.' };
}

export async function addGoalContribution(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: 'Usuário não autenticado.' };

  const goalId = String(formData.get('goal_id') ?? '').trim();
  const amount = parseAmount(formData.get('amount'));
  const contributionDate = normalizeDate(formData.get('contribution_date')) ?? new Date().toISOString().slice(0, 10);
  const sourceAccountId = String(formData.get('source_account_id') ?? '').trim() || null;
  const notes = String(formData.get('notes') ?? '').trim() || null;

  if (!goalId || amount <= 0) return { ok: false, error: 'Dados do aporte inválidos.' };

  const { error } = await supabase.from('goal_contributions').insert({
    goal_id: goalId,
    user_id: user.id,
    amount,
    contribution_date: contributionDate,
    source_account_id: sourceAccountId,
    notes
  });

  if (error) return { ok: false, error: error.message };

  await supabase.rpc('recalculate_savings_goal_current_amount', { p_goal_id: goalId });
  await refreshPaths();
  return { ok: true, message: 'Aporte adicionado.' };
}

export async function removeGoalContribution(contributionId: string, goalId: string): Promise<ActionResult> {
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: 'Usuário não autenticado.' };

  const { error } = await supabase.from('goal_contributions').delete().eq('id', contributionId).eq('user_id', user.id);
  if (error) return { ok: false, error: error.message };

  await supabase.rpc('recalculate_savings_goal_current_amount', { p_goal_id: goalId });
  await refreshPaths();
  return { ok: true, message: 'Aporte removido.' };
}

export async function recalculateSpendLimits(month: string): Promise<ActionResult> {
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: 'Usuário não autenticado.' };

  const normalizedMonth = normalizeMonth(month);
  if (!normalizedMonth) return { ok: false, error: 'Mês inválido.' };

  const { error } = await supabase.rpc('recalculate_spend_limits_for_month', { p_user_id: user.id, p_month: normalizedMonth });
  if (error) return { ok: false, error: error.message };

  await refreshPaths();
  return { ok: true, message: 'Limites recalculados.' };
}


export async function createGoalState(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return createGoal(formData);
}
