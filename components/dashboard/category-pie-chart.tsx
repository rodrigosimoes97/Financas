'use client';

import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from 'recharts';

interface DataPoint {
  name: string;
  value: number;
}

const COLORS = ['#22c55e', '#3b82f6', '#f97316', '#eab308', '#a855f7', '#ec4899'];

export function CategoryPieChart({ data }: { data: DataPoint[] }) {
  return (
    <div className="card h-80 p-4">
      <h3 className="mb-4 text-lg font-medium">Expenses by category</h3>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={90} label>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
