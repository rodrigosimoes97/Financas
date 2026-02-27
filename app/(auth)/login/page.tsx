import Link from 'next/link';
import { signIn } from '@/lib/actions/auth';

export default function LoginPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Login</h1>
      <form action={signIn} className="mt-4 grid gap-3">
        <input name="email" type="email" required placeholder="Email" className="rounded border border-border bg-transparent p-2" />
        <input name="password" type="password" required placeholder="Password" className="rounded border border-border bg-transparent p-2" />
        <button className="rounded bg-white px-4 py-2 font-medium text-black">Sign in</button>
      </form>
      <p className="mt-4 text-sm text-zinc-400">No account? <Link href="/signup" className="underline">Create one</Link></p>
    </>
  );
}
