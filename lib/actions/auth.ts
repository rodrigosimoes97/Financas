'use server'

import { createClient } from '@/lib/supabase/server'

export type AuthState = {
  error?: string
  redirectTo?: string
}

export async function signIn(prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: error.message }
  return { redirectTo: '/dashboard' }
}

export async function signUp(prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({ email, password })

  if (error) return { error: error.message }
  return { redirectTo: '/login' }
}

export async function signOut(): Promise<{ redirectTo: string }> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return { redirectTo: '/login' }
}