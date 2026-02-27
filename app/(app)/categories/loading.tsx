import { ptBR } from '@/lib/i18n/pt-BR';

export default function LoadingCategories() {
  return <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-zinc-400">{ptBR.states.loading}</div>;
}
