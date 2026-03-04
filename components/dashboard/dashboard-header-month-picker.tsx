'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface Props {
  selectedMonth: string;
  viewMode: 'month' | 'cash';
}

export function DashboardHeaderMonthPicker({ selectedMonth, viewMode }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setQuery = (month: string, mode: 'month' | 'cash') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', month);
    params.set('view', mode);
    router.push(`${pathname}?${params.toString()}`);
  };

  const moveMonth = (step: number) => {
    const date = new Date(`${selectedMonth}-01T12:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + step);
    setQuery(date.toISOString().slice(0, 7), viewMode);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={() => moveMonth(-1)} className="rounded-xl border border-zinc-700 p-2 hover:bg-zinc-800" aria-label="Mês anterior">
        <ChevronLeft size={16} />
      </button>
      <input
        type="month"
        value={selectedMonth}
        onChange={(event) => setQuery(event.target.value, viewMode)}
        className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
      />
      <button onClick={() => moveMonth(1)} className="rounded-xl border border-zinc-700 p-2 hover:bg-zinc-800" aria-label="Próximo mês">
        <ChevronRight size={16} />
      </button>
      <div className="ml-1 flex rounded-xl border border-zinc-700 p-1 text-sm">
        <button onClick={() => setQuery(selectedMonth, 'month')} className={`rounded-lg px-3 py-1 ${viewMode === 'month' ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-300'}`}>
          Visão do mês
        </button>
        <button onClick={() => setQuery(selectedMonth, 'cash')} className={`rounded-lg px-3 py-1 ${viewMode === 'cash' ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-300'}`}>
          Visão de caixa
        </button>
      </div>
    </div>
  );
}
