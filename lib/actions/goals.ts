'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { invalidateDashboardCache } from '@/lib/actions/dashboard';

type ActionResult = { ok: boolean; message?: string; error?: string };

const MONTH_REGEX = /^\d{4}-\d{2}$/;
const MONTH_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const normalizeMonth = (value: FormDataEntryValue | null) => {
  const monthRaw = String(value ?? '').trim();
  if (!monthRaw) return null;
  if (MONTH_REGEX.test(monthRaw)) return `${monthRaw}-01`;
  if (MONTH_DATE_REGEX.test(monthRaw)) return monthRaw;
  return null;
};

const parseNumericInput = (value: FormDataEntryValue | null, fallback = 0) => {
  const parsed = Number(String(value ?? '').replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseGoalPayload = (formData: FormData) => {
  const typeRaw = String(formData.get('type') ?? 'SPEND_LIMIT').toUpperCase();
  const type: 'SAVE' | 'SPEND_LIMIT' | 'INVESTMENT' = typeRaw === 'SAVE' ? 'SAVE' : typeRaw === 'INVESTMENT' ? 'INVESTMENT' : 'SPEND_LIMIT';
  const monthlyLimit = Math.max(parseNumericInput(formData.get('monthly_limit')), 0);
  const targetInput = Math.max(parseNumericInput(formData.get('target_amount'), monthlyLimit), 0);
  const currentAmount = Math.max(parseNumericInput(formData.get('current_amount')), 0);
  const month = normalizeMonth(formData.get('month'));
  const categoryIdRaw = String(formData.get('category_id') ?? '').trim();

  return {
    category_id: categoryIdRaw || null,
    monthly_limit: monthlyLimit,
    target_amount: type === 'SPEND_LIMIT' ? monthlyLimit : targetInput,
    current_amount: type === 'SPEND_LIMIT' ? 0 : currentAmount,
    month,
    type,
    name: String(formData.get('name') ?? '').trim() || null
  };
};

export async function createGoal(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Usuário não autenticado.' };

  const payload = parseGoalPayload(formData);

  if (!payload.month) return { ok: false, error: 'Mês inválido.' };
  if (payload.type === 'SPEND_LIMIT' && payload.monthly_limit <= 0) return { ok: false, error: 'O limite mensal deve ser maior que zero.' };

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[goals.createGoal] payload', payload);
  }

  const { error } = await supabase.from('goals').upsert(
    {
      user_id: auth.user.id,
      category_id: payload.category_id,
      monthly_limit: payload.monthly_limit,
      target_amount: payload.target_amount,
      current_amount: payload.current_amount,
      month: payload.month,
      type: payload.type,
      name: payload.name
    },
    { onConflict: 'user_id,month,type,category_id' }
  );

  if (error) return { ok: false, error: error.message };
  revalidatePath('/');
  revalidatePath('/goals');
  await invalidateDashboardCache();
  revalidatePath('/dashboard');
  return { ok: true, message: 'Cadastro realizado com sucesso.' };
}

export async function updateGoal(id: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const payload = parseGoalPayload(formData);

  if (!payload.month) return { ok: false, error: 'Mês inválido.' };
  if (payload.type === 'SPEND_LIMIT' && payload.monthly_limit <= 0) return { ok: false, error: 'O limite mensal deve ser maior que zero.' };

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[goals.updateGoal] payload', { id, ...payload });
  }

  const { error } = await supabase
    .from('goals')
    .update({
      category_id: payload.category_id,
      monthly_limit: payload.monthly_limit,
      target_amount: payload.target_amount,
      current_amount: payload.current_amount,
      month: payload.month,
      type: payload.type,
      name: payload.name
    })
    .eq('id', id);

  if (error) return { ok: false, error: error.message };
  revalidatePath('/');
  revalidatePath('/goals');
  await invalidateDashboardCache();
  revalidatePath('/dashboard');
  return { ok: true, message: 'Atualização realizada com sucesso.' };
}

export async function deleteGoal(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from('goals').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/');
  revalidatePath('/goals');
  await invalidateDashboardCache();
  revalidatePath('/dashboard');
  return { ok: true, message: 'Exclusão realizada com sucesso.' };
}

export async function createGoalState(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return createGoal(formData);
}
