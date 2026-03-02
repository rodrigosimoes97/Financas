import { formatCurrencyBRL } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  subtitle: string;
  value: number;
}

export function MetricCard({ title, subtitle, value }: MetricCardProps) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-lg shadow-black/10">
      <p className="text-sm text-zinc-400">{title}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{formatCurrencyBRL(value)}</p>
      <p className="mt-2 text-xs text-zinc-500">{subtitle}</p>
    </article>
  );
}
