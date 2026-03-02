'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type ActionResult = { ok: boolean; message?: string; error?: string };

export async function createCreditCard(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Usuário não autenticado.' };

  const { error } = await supabase.from('credit_cards').insert({
    user_id: auth.user.id,
    name: String(formData.get('name')),
    closing_day: Number(formData.get('closing_day')),
    due_day: Number(formData.get('due_day')),
    limit_amount: formData.get('limit_amount') ? Number(formData.get('limit_amount')) : null
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath('/cards');
  return { ok: true, message: 'Cartão cadastrado com sucesso.' };
}

export async function deleteCreditCard(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from('credit_cards').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/cards');
  return { ok: true, message: 'Cartão excluído com sucesso.' };
}

export async function createCreditCardState(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return createCreditCard(formData);
}

export async function markInvoiceAsPaid(invoiceId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from('invoices').update({ status: 'paid' }).eq('id', invoiceId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/cards');
  return { ok: true, message: 'Fatura marcada como paga.' };
}

export async function listInvoicesByCard(cardId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('invoices')
    .select('id,reference_month,closing_date,due_date,total_amount,status')
    .eq('credit_card_id', cardId)
    .order('reference_month', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}
