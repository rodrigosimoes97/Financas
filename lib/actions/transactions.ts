'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { invalidateDashboardCache } from '@/lib/actions/dashboard';
import { parseTransactionForm } from '@/lib/validation/schemas';

type ActionResult = { ok: boolean; message?: string; error?: string };

async function recalculateSpendLimitsForUser(userId: string) {
  const supabase = await createClient();
  await supabase.rpc('recalculate_spend_limits_for_month', { p_user_id: userId, p_month: null });
}

export async function createTransaction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Usuário não autenticado.' };

  const parsed = parseTransactionForm(formData);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const input = parsed.data;

  if (input.payment_method === 'credit') {
    const { error } = await supabase.rpc('create_credit_purchase', {
      p_account_id: input.account_id,
      p_category_id: input.category_id,
      p_credit_card_id: input.credit_card_id,
      p_purchase_date: input.date,
      p_description: input.description,
      p_total_amount: input.amount,
      p_total_installments: input.total_installments
    });
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      account_id: input.account_id,
      category_id: input.category_id,
      amount: input.amount,
      type: input.type,
      payment_method: input.payment_method,
      description: input.description,
      date: input.date
    });
    if (error) return { ok: false, error: error.message };
  }

  await recalculateSpendLimitsForUser(user.id);
  await invalidateDashboardCache();
  revalidatePath('/dashboard');
  revalidatePath('/transactions');
  revalidatePath('/cards');
  return { ok: true, message: 'Cadastro realizado com sucesso.' };
}

export async function updateTransaction(id: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Usuário não autenticado.' };

  const parsed = parseTransactionForm(formData);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const input = parsed.data;

  const { error } = await supabase
    .from('transactions')
    .update({
      account_id: input.account_id,
      category_id: input.category_id,
      amount: input.amount,
      type: input.type,
      payment_method: input.payment_method,
      description: input.description,
      date: input.date,
      credit_card_id: input.payment_method === 'credit' ? input.credit_card_id : null
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { ok: false, error: error.message };

  await recalculateSpendLimitsForUser(user.id);
  await invalidateDashboardCache();
  revalidatePath('/dashboard');
  revalidatePath('/transactions');
  return { ok: true, message: 'Atualização realizada com sucesso.' };
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Usuário não autenticado.' };

  const { error } = await supabase.rpc('delete_transaction_cascade', { p_transaction_id: id, p_user_id: user.id });
  if (error) return { ok: false, error: error.message };

  await recalculateSpendLimitsForUser(user.id);
  await invalidateDashboardCache();
  revalidatePath('/dashboard');
  revalidatePath('/transactions');
  revalidatePath('/cards');
  return { ok: true, message: 'Exclusão realizada com sucesso.' };
}

export async function createTransactionState(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return createTransaction(formData);
}
