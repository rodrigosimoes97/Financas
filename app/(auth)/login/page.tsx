import Link from 'next/link'
import { LoginForm } from '@/components/forms/login-form'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">Login</h1>
        <LoginForm />
        <p className="text-sm text-white/70">
          Não tem conta? <Link className="underline" href="/signup">Criar agora</Link>
        </p>
      </div>
    </div>
  )
}