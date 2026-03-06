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
    limit_amount: formData.get('limit_amount') ? Number(formData.get('limit_amount')) : null,
    archived_at: null,
    is_archived: false
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath('/cards');
  return { ok: true, message: 'Cartão cadastrado com sucesso.' };
}

export async function deleteCreditCard(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('credit_cards')
    .update({ archived_at: new Date().toISOString(), is_archived: true })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/cards');
  revalidatePath('/dashboard');
  revalidatePath('/transactions');
  return { ok: true, message: 'Cartão arquivado com sucesso.' };
}

export async function reactivateCreditCard(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from('credit_cards').update({ archived_at: null, is_archived: false }).eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/cards');
  revalidatePath('/dashboard');
  revalidatePath('/transactions');
  return { ok: true, message: 'Cartão reativado com sucesso.' };
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
    .from('invoices_with_totals')
    .select('id,reference_month,closing_date,due_date,total_amount,status,transactions_count')
    .eq('credit_card_id', cardId)
    .gt('total_amount_calc', 0)
    .order('reference_month', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function deleteInvoiceTransaction(transactionId: string, invoiceId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .select('id,invoice_id,is_installment,parent_transaction_id')
    .eq('id', transactionId)
    .eq('invoice_id', invoiceId)
    .maybeSingle();

  if (txError) return { ok: false, error: txError.message };
  if (!tx) return { ok: false, error: 'Lançamento não encontrado nesta fatura.' };
  if (!tx.is_installment || !tx.parent_transaction_id) {
    return { ok: false, error: 'Apenas parcelas podem ser removidas nesta tela.' };
  }

  const { error } = await supabase.from('transactions').delete().eq('id', transactionId);
  if (error) return { ok: false, error: error.message };

  const { count: remaining, error: remainingError } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('invoice_id', invoiceId)
    .eq('payment_method', 'credit')
    .eq('type', 'expense');

  if (remainingError) return { ok: false, error: remainingError.message };

  if ((remaining ?? 0) === 0) {
    await supabase.from('invoices').delete().eq('id', invoiceId);
  } else {
    const { data: totalRows, error: totalError } = await supabase
      .from('transactions')
      .select('amount')
      .eq('invoice_id', invoiceId)
      .eq('payment_method', 'credit')
      .eq('type', 'expense');

    if (totalError) return { ok: false, error: totalError.message };
    const total = (totalRows ?? []).reduce((sum, row) => sum + Number(row.amount), 0);
    const { error: updateError } = await supabase.from('invoices').update({ total_amount: total }).eq('id', invoiceId);
    if (updateError) return { ok: false, error: updateError.message };
  }

  revalidatePath('/cards');
  return { ok: true, message: 'Lançamento removido da fatura.' };
}
