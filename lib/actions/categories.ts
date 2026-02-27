'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type ActionResult = { ok: boolean; message?: string; error?: string };

export async function createCategory(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Usuário não autenticado.' };

  const { error } = await supabase.from('categories').insert({
    user_id: auth.user.id,
    name: String(formData.get('name')),
    type: String(formData.get('type'))
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath('/categories');
  return { ok: true, message: 'Cadastro realizado com sucesso.' };
}

export async function updateCategory(id: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('categories')
    .update({ name: String(formData.get('name')), type: String(formData.get('type')) })
    .eq('id', id);

  if (error) return { ok: false, error: error.message };
  revalidatePath('/categories');
  return { ok: true, message: 'Atualização realizada com sucesso.' };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/categories');
  return { ok: true, message: 'Exclusão realizada com sucesso.' };
}
