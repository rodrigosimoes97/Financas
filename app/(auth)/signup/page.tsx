import Link from 'next/link'
import { SignupForm } from '@/components/forms/signup-form'

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">Criar conta</h1>

        <SignupForm />

        <p className="text-sm text-white/70">
          Já tem conta? <Link className="underline" href="/login">Entrar</Link>
        </p>
      </div>
    </div>
  )
}