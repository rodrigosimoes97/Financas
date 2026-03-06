import { ReactNode } from 'react';

export function GoalCard({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'savings' | 'limit' }) {
  return (
    <article
      className={[
        'rounded-2xl border p-4',
        tone === 'savings' ? 'border-emerald-800/40 bg-emerald-950/20' : '',
        tone === 'limit' ? 'border-sky-800/40 bg-sky-950/20' : '',
        tone === 'default' ? 'border-zinc-800 bg-zinc-900/50' : ''
      ].join(' ')}
    >
      {children}
    </article>
  );
}
