'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { DashboardInsight } from '@/lib/actions/dashboard';

export function InsightsRow({ insights }: { insights: DashboardInsight[] }) {
  const [hidden, setHidden] = useState<string[]>([]);
  const visible = insights.filter((insight) => !hidden.includes(insight.text));

  if (!visible.length) return null;

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {visible.map((insight) => (
        <article key={insight.text} className={`rounded-2xl border p-4 text-sm ${insight.level === 'warn' ? 'border-amber-800 bg-amber-950/30' : 'border-zinc-800 bg-zinc-900/70'}`}>
          <div className="flex items-start justify-between gap-2">
            <p><span className="mr-1">{insight.emoji}</span>{insight.text}</p>
            <button onClick={() => setHidden((prev) => [...prev, insight.text])} className="rounded-md p-1 text-zinc-400 hover:bg-zinc-800"><X size={14} /></button>
          </div>
        </article>
      ))}
    </div>
  );
}
