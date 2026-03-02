import Link from 'next/link';
import { signUp } from '@/lib/actions/auth';
import { ptBR } from '@/lib/i18n/pt-BR';

export default function SignupPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">{ptBR.auth.signup}</h1>
      <form action={signUp} className="mt-5 grid gap-3">
        <input name="email" type="email" required placeholder={ptBR.auth.email} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" />
        <input name="password" type="password" required placeholder={ptBR.auth.password} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" />
        <button className="rounded-xl bg-emerald-400 px-4 py-2.5 font-medium text-emerald-950 hover:bg-emerald-300">{ptBR.auth.signup}</button>
      </form>
      <p className="mt-4 text-sm text-zinc-400">{ptBR.auth.hasAccount} <Link href="/login" className="text-zinc-100 underline">{ptBR.auth.signIn}</Link></p>
    </>
  );
}
