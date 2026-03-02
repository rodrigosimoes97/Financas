'use client'

import { useEffect } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { signUp, type AuthState } from '@/lib/actions/auth'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-white/10 px-4 py-2 text-white hover:bg-white/15 disabled:opacity-60"
    >
      {pending ? 'Criando...' : 'Criar conta'}
    </button>
  )
}

export function SignupForm() {
  const router = useRouter()
  const [state, action] = useFormState<AuthState, FormData>(signUp, {})

  useEffect(() => {
    if (state?.redirectTo) router.push(state.redirectTo)
  }, [state?.redirectTo, router])

  return (
    <form action={action} className="space-y-3">
      <input
        name="email"
        type="email"
        required
        placeholder="Email"
        className="w-full rounded-md bg-black/30 px-3 py-2 text-white outline-none ring-1 ring-white/10"
      />
      <input
        name="password"
        type="password"
        required
        placeholder="Senha"
        className="w-full rounded-md bg-black/30 px-3 py-2 text-white outline-none ring-1 ring-white/10"
      />

      {state?.error ? <p className="text-sm text-red-400">{state.error}</p> : null}

      <SubmitButton />
    </form>
  )
}