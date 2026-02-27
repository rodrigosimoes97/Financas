'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type ActionResult = { ok: boolean; message?: string; error?: string };

export async function createGoal(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Usuário não autenticado.' };

  const { error } = await supabase.from('goals').insert({
    user_id: auth.user.id,
    category_id: String(formData.get('category_id')),
    monthly_limit: Number(formData.get('monthly_limit')),
    month: String(formData.get('month'))
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath('/goals');
  revalidatePath('/dashboard');
  return { ok: true, message: 'Cadastro realizado com sucesso.' };
}

export async function updateGoal(id: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('goals')
    .update({
      category_id: String(formData.get('category_id')),
      monthly_limit: Number(formData.get('monthly_limit')),
      month: String(formData.get('month'))
    })
    .eq('id', id);

  if (error) return { ok: false, error: error.message };
  revalidatePath('/goals');
  revalidatePath('/dashboard');
  return { ok: true, message: 'Atualização realizada com sucesso.' };
}

export async function deleteGoal(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from('goals').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/goals');
  revalidatePath('/dashboard');
  return { ok: true, message: 'Exclusão realizada com sucesso.' };
}
