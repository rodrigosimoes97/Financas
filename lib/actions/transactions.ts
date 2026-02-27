'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createTransaction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return;

  const payload = {
    user_id: user.id,
    account_id: String(formData.get('account_id')),
    category_id: String(formData.get('category_id')),
    amount: Number(formData.get('amount')),
    type: String(formData.get('type')),
    description: String(formData.get('description') || ''),
    date: String(formData.get('date'))
  };

  await supabase.from('transactions').insert(payload);
  revalidatePath('/dashboard');
  revalidatePath('/transactions');
}

export async function updateTransaction(id: string, formData: FormData) {
  const supabase = await createClient();
  await supabase
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

  revalidatePath('/dashboard');
  revalidatePath('/transactions');
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient();
  await supabase.from('transactions').delete().eq('id', id);
  revalidatePath('/dashboard');
  revalidatePath('/transactions');
}
