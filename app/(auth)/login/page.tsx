import Link from 'next/link';
import { signIn } from '@/lib/actions/auth';
import { ptBR } from '@/lib/i18n/pt-BR';

export default function LoginPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">{ptBR.auth.login}</h1>
      <form action={signIn} className="mt-5 grid gap-3">
        <input name="email" type="email" required placeholder={ptBR.auth.email} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" />
        <input name="password" type="password" required placeholder={ptBR.auth.password} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" />
        <button className="rounded-xl bg-emerald-400 px-4 py-2.5 font-medium text-emerald-950 hover:bg-emerald-300">{ptBR.auth.login}</button>
      </form>
      <p className="mt-4 text-sm text-zinc-400">{ptBR.auth.noAccount} <Link href="/signup" className="text-zinc-100 underline">{ptBR.auth.createOne}</Link></p>
    </>
  );
}
