'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { invalidateDashboardCache } from '@/lib/actions/dashboard';
import { parseTransactionForm } from '@/lib/validation/schemas';

type ActionResult = { ok: boolean; message?: string; error?: string; data?: unknown };

export async function createCreditPurchaseAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Usuário não autenticado.' };

  const parsed = parseTransactionForm(formData);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const input = parsed.data;

  const { data, error } = await supabase.rpc('create_credit_purchase', {
    p_account_id: input.account_id,
    p_category_id: input.category_id,
    p_credit_card_id: input.credit_card_id,
    p_purchase_date: input.date,
    p_description: input.description,
    p_total_amount: input.amount,
    p_total_installments: input.total_installments
  });

  if (error) return { ok: false, error: error.message };

  await invalidateDashboardCache();
  revalidatePath('/dashboard');
  revalidatePath('/transactions');
  revalidatePath('/cards');
  return { ok: true, message: 'Compra no crédito registrada com sucesso.', data };
}

export async function simulateCreditPurchaseAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const parsed = parseTransactionForm(formData);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const input = parsed.data;

  const { data, error } = await supabase.rpc('simulate_credit_purchase', {
    p_credit_card_id: input.credit_card_id,
    p_purchase_date: input.date,
    p_total_amount: input.amount,
    p_total_installments: input.total_installments,
    p_months_ahead: 12
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}
