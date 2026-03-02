'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type ActionResult = { ok: boolean; message?: string; error?: string };

export async function createAccount(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Usuário não autenticado.' };

  const { error } = await supabase.from('accounts').insert({
    user_id: auth.user.id,
    name: String(formData.get('name'))
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/accounts');
  revalidatePath('/dashboard');
  revalidatePath('/transactions');
  return { ok: true, message: 'Cadastro realizado com sucesso.' };
}

export async function deleteAccount(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from('accounts').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/accounts');
  revalidatePath('/dashboard');
  revalidatePath('/transactions');
  return { ok: true, message: 'Exclusão realizada com sucesso.' };
}

export async function createAccountState(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return createAccount(formData);
}
