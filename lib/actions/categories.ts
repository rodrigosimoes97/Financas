'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createCategory(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  await supabase.from('categories').insert({
    user_id: auth.user.id,
    name: String(formData.get('name')),
    type: String(formData.get('type'))
  });
  revalidatePath('/categories');
}

export async function updateCategory(id: string, formData: FormData) {
  const supabase = await createClient();
  await supabase
    .from('categories')
    .update({ name: String(formData.get('name')), type: String(formData.get('type')) })
    .eq('id', id);
  revalidatePath('/categories');
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();
  await supabase.from('categories').delete().eq('id', id);
  revalidatePath('/categories');
}
