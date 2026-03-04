'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type ActionResult = { ok: boolean; message?: string; error?: string };

export async function createTransaction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: 'Usuário não autenticado.' };

  const paymentMethod = String(formData.get('payment_method'));
  if (paymentMethod === 'credit') {
    const { error } = await supabase.rpc('create_credit_purchase', {
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
  revalidatePath('/cards');
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
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: 'Usuário não autenticado.' };

  const { error } = await supabase.rpc('delete_transaction_cascade', {
    p_transaction_id: id,
    p_user_id: user.id
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath('/dashboard');
  revalidatePath('/transactions');
  revalidatePath('/cards');
  return { ok: true, message: 'Exclusão realizada com sucesso.' };
}

export async function createTransactionState(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return createTransaction(formData);
}
