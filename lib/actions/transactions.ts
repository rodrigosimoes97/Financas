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

  const payload = {
    user_id: user.id,
    account_id: String(formData.get('account_id')),
    category_id: String(formData.get('category_id')),
    amount: Number(formData.get('amount')),
    type: String(formData.get('type')),
    description: String(formData.get('description') || ''),
    date: String(formData.get('date'))
  };

  const { error } = await supabase.from('transactions').insert(payload);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/dashboard');
  revalidatePath('/transactions');
  return { ok: true, message: 'Cadastro realizado com sucesso.' };
}

export async function updateTransaction(id: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('transactions')
    .update({
      account_id: String(formData.get('account_id')),
      category_id: String(formData.get('category_id')),
      amount: Number(formData.get('amount')),
      type: String(formData.get('type')),
      description: String(formData.get('description') || ''),
      date: String(formData.get('date'))
    })
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
