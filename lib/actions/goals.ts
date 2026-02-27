'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createGoal(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  await supabase.from('goals').insert({
    user_id: auth.user.id,
    category_id: String(formData.get('category_id')),
    monthly_limit: Number(formData.get('monthly_limit')),
    month: String(formData.get('month'))
  });
  revalidatePath('/goals');
  revalidatePath('/dashboard');
}

export async function updateGoal(id: string, formData: FormData) {
  const supabase = await createClient();
  await supabase
    .from('goals')
    .update({
      category_id: String(formData.get('category_id')),
      monthly_limit: Number(formData.get('monthly_limit')),
      month: String(formData.get('month'))
    })
    .eq('id', id);
  revalidatePath('/goals');
  revalidatePath('/dashboard');
}

export async function deleteGoal(id: string) {
  const supabase = await createClient();
  await supabase.from('goals').delete().eq('id', id);
  revalidatePath('/goals');
  revalidatePath('/dashboard');
}
