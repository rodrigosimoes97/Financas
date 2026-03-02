'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createCreditPurchase, simulateCreditPurchase } from '@/lib/services/credit';

type ActionResult = { ok: boolean; message?: string; error?: string; data?: unknown };

export async function createCreditPurchaseAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Usuário não autenticado.' };

  try {
    const result = await createCreditPurchase({
      user_id: auth.user.id,
      account_id: String(formData.get('account_id')),
      category_id: String(formData.get('category_id')),
      description: String(formData.get('description') || ''),
      amount_total: Number(formData.get('amount')),
      purchase_date: String(formData.get('date')),
      credit_card_id: String(formData.get('credit_card_id')),
      is_installment: String(formData.get('is_installment')) === 'true',
      total_installments: Number(formData.get('total_installments') || 1)
    });

    revalidatePath('/dashboard');
    revalidatePath('/transactions');
    revalidatePath('/cards');

    return { ok: true, message: 'Compra no crédito registrada com sucesso.', data: result };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Erro ao registrar compra no crédito.' };
  }
}

export async function simulateCreditPurchaseAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Usuário não autenticado.' };

  try {
    const data = await simulateCreditPurchase({
      user_id: auth.user.id,
      account_id: String(formData.get('account_id')),
      category_id: String(formData.get('category_id')),
      description: String(formData.get('description') || ''),
      amount_total: Number(formData.get('amount')),
      purchase_date: String(formData.get('date')),
      credit_card_id: String(formData.get('credit_card_id')),
      is_installment: String(formData.get('is_installment')) === 'true',
      total_installments: Number(formData.get('total_installments') || 1)
    });
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Erro na simulação.' };
  }
}
