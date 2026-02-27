import { toCurrency } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: number;
}

export function MetricCard({ title, value }: MetricCardProps) {
  return (
    <div className="card p-4">
      <p className="text-sm text-zinc-400">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{toCurrency(value)}</p>
    </div>
  );
}
