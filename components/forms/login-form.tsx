'use client'

import { useEffect } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { signIn, type AuthState } from '@/lib/actions/auth'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-white/10 px-4 py-2 text-white hover:bg-white/15 disabled:opacity-60"
    >
      {pending ? 'Entrando...' : 'Entrar'}
    </button>
  )
}

export function LoginForm() {
  const router = useRouter()
  const [state, action] = useFormState<AuthState, FormData>(signIn, {})

  useEffect(() => {
    if (state?.redirectTo) router.push(state.redirectTo)
  }, [state?.redirectTo, router])

  return (
    <form action={action} className="space-y-3">
      <input
        name="email"
        type="email"
        placeholder="Email"
        required
        className="w-full rounded-md bg-black/30 px-3 py-2 text-white outline-none ring-1 ring-white/10"
      />
      <input
        name="password"
        type="password"
        placeholder="Senha"
        required
        className="w-full rounded-md bg-black/30 px-3 py-2 text-white outline-none ring-1 ring-white/10"
      />

      {state?.error ? (
        <p className="text-sm text-red-400">{state.error}</p>
      ) : null}

      <SubmitButton />
    </form>
  )
}