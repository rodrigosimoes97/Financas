import Link from 'next/link';
import { signUp } from '@/lib/actions/auth';

export default function SignupPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Create account</h1>
      <form action={signUp} className="mt-4 grid gap-3">
        <input name="email" type="email" required placeholder="Email" className="rounded border border-border bg-transparent p-2" />
        <input name="password" type="password" required placeholder="Password" className="rounded border border-border bg-transparent p-2" />
        <button className="rounded bg-white px-4 py-2 font-medium text-black">Create account</button>
      </form>
      <p className="mt-4 text-sm text-zinc-400">Already registered? <Link href="/login" className="underline">Sign in</Link></p>
    </>
  );
}
