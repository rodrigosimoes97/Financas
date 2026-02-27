'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createTransaction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado.')

  const accountId = String(formData.get('account_id') ?? '')
  const categoryId = String(formData.get('category_id') ?? '')
  const type = String(formData.get('type') ?? '')
  const date = String(formData.get('date') ?? '')
  const description = String(formData.get('description') ?? '')

  // pt-BR: "10,50" -> 10.50
  const amountRaw = String(formData.get('amount') ?? '')
    .trim()
    .replace(/\./g, '')     // remove separador de milhar se vier "1.234,56"
    .replace(',', '.')      // vírgula -> ponto

  const amount = Number(amountRaw)

  if (!accountId || accountId === 'null') throw new Error('Selecione uma conta.')
  if (!categoryId || categoryId === 'null') throw new Error('Selecione uma categoria.')
  if (type !== 'income' && type !== 'expense') throw new Error('Selecione Receita ou Despesa.')
  if (!date || date === 'null') throw new Error('Selecione uma data.')
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Informe um valor válido (ex.: 10,50).')

  const payload = {
    user_id: user.id,
    account_id: accountId,
    category_id: categoryId,
    amount,
    type,
    description,
    date,
  }

  const { error } = await supabase.from('transactions').insert(payload)

  if (error) {
    // isso vai aparecer no overlay de erro do Next e também no terminal
    throw new Error(`Erro ao salvar transação: ${error.message}`)
  }

  revalidatePath('/dashboard')
  revalidatePath('/transactions')
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
