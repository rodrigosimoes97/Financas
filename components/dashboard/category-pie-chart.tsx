'use client';

import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { formatCurrencyBRL } from '@/lib/utils';
import { ptBR } from '@/lib/i18n/pt-BR';

interface DataPoint {
  name: string;
  value: number;
}

const COLORS = ['#22c55e', '#3b82f6', '#f97316', '#eab308', '#a855f7', '#ec4899'];

export function CategoryPieChart({ data }: { data: DataPoint[] }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-lg shadow-black/10">
      <h3 className="text-lg font-semibold">{ptBR.dashboard.byCategory}</h3>
      <p className="mb-3 text-sm text-zinc-400">{ptBR.dashboard.byCategoryHint}</p>
      {data.length === 0 ? (
        <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-zinc-700 text-sm text-zinc-500">
          {ptBR.states.noChartData}
        </div>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={95} label>
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrencyBRL(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
