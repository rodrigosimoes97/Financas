'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export type AuthState = { error?: string; redirectTo?: string };

export async function signIn(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return;

  redirect('/dashboard');
}

export async function signUp(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return;

  redirect('/login');
}

export async function signInState(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return { redirectTo: '/dashboard' };
}

export async function signUpState(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };
  return { redirectTo: '/login' };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
