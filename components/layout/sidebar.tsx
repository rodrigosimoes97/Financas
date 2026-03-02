'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Landmark, Target, Tag, Wallet, LogOut } from 'lucide-react';
import { signOut } from '@/lib/actions/auth';
import { cn } from '@/lib/utils';
import { ptBR } from '@/lib/i18n/pt-BR';

const navItems = [
  { href: '/dashboard', label: ptBR.nav.dashboard, icon: Landmark },
  { href: '/transactions', label: ptBR.nav.transactions, icon: Wallet },
  { href: '/categories', label: ptBR.nav.categories, icon: Tag },
  { href: '/goals', label: ptBR.nav.goals, icon: Target }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full border-r border-zinc-800 bg-zinc-950/80 p-4 backdrop-blur md:w-72 md:p-6">
      <h1 className="mb-8 text-xl font-semibold tracking-tight">{ptBR.appName}</h1>
      <nav className="space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                isActive
                  ? 'bg-zinc-800 text-white shadow-inner shadow-black/20'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
              )}
            >
              <Icon size={16} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <form action={signOut} className="mt-8">
        <button className="flex w-full items-center gap-2 rounded-xl border border-zinc-800 px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-900">
          <LogOut size={16} />
          {ptBR.nav.logout}
        </button>
      </form>
    </aside>
  );
}
