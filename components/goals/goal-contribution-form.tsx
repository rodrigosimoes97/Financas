'use client';

import { useRouter } from 'next/navigation';
import { addGoalContribution } from '@/lib/actions/goals';
import { SubmitButton } from '@/components/ui/submit-button';
import { useToast } from '@/components/ui/toast';

export function GoalContributionForm({ goalId }: { goalId: string }) {
  const router = useRouter();
  const toast = useToast();

  return (
    <form
      className="mt-3 grid gap-2 md:grid-cols-4"
      action={async (formData) => {
        const result = await addGoalContribution(formData);
        if (result.ok) {
          toast.success(result.message ?? 'Aporte adicionado');
          router.refresh();
        } else {
          toast.error(result.error ?? 'Erro ao adicionar aporte');
        }
      }}
    >
      <input type="hidden" name="goal_id" value={goalId} />
      <input name="amount" type="number" min="0.01" step="0.01" required placeholder="Valor do aporte" className="rounded-xl border border-zinc-700 bg-zinc-950 p-2.5 text-sm" />
      <input name="contribution_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="rounded-xl border border-zinc-700 bg-zinc-950 p-2.5 text-sm" />
      <input name="notes" placeholder="Observação (opcional)" className="rounded-xl border border-zinc-700 bg-zinc-950 p-2.5 text-sm" />
      <SubmitButton pendingText="Salvando..." className="rounded-xl bg-emerald-400 px-3 py-2 text-sm font-medium text-emerald-950">Adicionar aporte</SubmitButton>
    </form>
  );
}
