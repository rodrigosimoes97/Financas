'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { invalidateDashboardCache } from '@/lib/actions/dashboard';

type ActionResult = { ok: boolean; message?: string; error?: string; data?: unknown };

export async function createCreditPurchaseAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('create_credit_purchase', {
    p_account_id: String(formData.get('account_id')),
    p_category_id: String(formData.get('category_id')),
    p_credit_card_id: String(formData.get('credit_card_id')),
    p_purchase_date: String(formData.get('date')),
    p_description: String(formData.get('description') || ''),
    p_total_amount: Number(formData.get('amount')),
    p_total_installments:
      String(formData.get('is_installment')) === 'true' ? Number(formData.get('total_installments') || 1) : 1
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

  const { data, error } = await supabase.rpc('simulate_credit_purchase', {
    p_credit_card_id: String(formData.get('credit_card_id')),
    p_purchase_date: String(formData.get('date')),
    p_total_amount: Number(formData.get('amount')),
    p_total_installments:
      String(formData.get('is_installment')) === 'true' ? Number(formData.get('total_installments') || 1) : 1,
    p_months_ahead: 12
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}
