'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createCreditPurchase } from '@/lib/services/credit';

type ActionResult = { ok: boolean; message?: string; error?: string };

export async function createTransaction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: 'Usuário não autenticado.' };

  const paymentMethod = String(formData.get('payment_method'));
  if (paymentMethod === 'credit') {
    try {
      await createCreditPurchase({
        user_id: user.id,
        account_id: String(formData.get('account_id')),
        category_id: String(formData.get('category_id')),
        description: String(formData.get('description') || ''),
        amount_total: Number(formData.get('amount')),
        purchase_date: String(formData.get('date')),
        credit_card_id: String(formData.get('credit_card_id')),
        is_installment: String(formData.get('is_installment')) === 'true',
        total_installments: Number(formData.get('total_installments') || 1)
      });
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Erro ao registrar compra no crédito.' };
    }
  } else {
    const payload = {
      user_id: user.id,
      account_id: String(formData.get('account_id')),
      category_id: String(formData.get('category_id')),
      amount: Number(formData.get('amount')),
      type: String(formData.get('type')),
      payment_method: paymentMethod,
      description: String(formData.get('description') || ''),
      date: String(formData.get('date'))
    };

    const { error } = await supabase.from('transactions').insert(payload);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath('/dashboard');
  revalidatePath('/transactions');
  return { ok: true, message: 'Cadastro realizado com sucesso.' };
}

export async function updateTransaction(id: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const payload = {
    account_id: String(formData.get('account_id')),
    category_id: String(formData.get('category_id')),
    amount: Number(formData.get('amount')),
    type: String(formData.get('type')),
    description: String(formData.get('description') || ''),
    date: String(formData.get('date'))
  };

  const paymentMethod = formData.get('payment_method');
  const { error } = await supabase
    .from('transactions')
    .update(paymentMethod ? { ...payload, payment_method: String(paymentMethod) } : payload)
    .eq('id', id);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/dashboard');
  revalidatePath('/transactions');
  return { ok: true, message: 'Atualização realizada com sucesso.' };
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/dashboard');
  revalidatePath('/transactions');
  return { ok: true, message: 'Exclusão realizada com sucesso.' };
}

export async function createTransactionState(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return createTransaction(formData);
}
