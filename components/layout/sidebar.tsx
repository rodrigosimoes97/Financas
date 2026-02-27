import Link from 'next/link';
import { Landmark, Target, Tag, Wallet } from 'lucide-react';
import { signOut } from '@/lib/actions/auth';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Landmark },
  { href: '/transactions', label: 'Transactions', icon: Wallet },
  { href: '/categories', label: 'Categories', icon: Tag },
  { href: '/goals', label: 'Goals', icon: Target }
];

export function Sidebar() {
  return (
    <aside className="w-full border-r border-border bg-card p-4 md:w-64">
      <h1 className="mb-6 text-xl font-semibold">Finanças</h1>
      <nav className="space-y-2">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted">
            <Icon size={16} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <form action={signOut} className="mt-6">
        <button className="w-full rounded-lg border border-border px-3 py-2 text-left hover:bg-muted">Sign out</button>
      </form>
    </aside>
  );
}
