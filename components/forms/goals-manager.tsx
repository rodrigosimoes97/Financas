'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormState } from 'react-dom';
import { useRouter } from 'next/navigation';
import { createGoalState, deleteGoal, updateGoal } from '@/lib/actions/goals';
import { ptBR } from '@/lib/i18n/pt-BR';
import { formatCurrencyBRL, formatMonthBR } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { SubmitButton } from '@/components/ui/submit-button';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Category, Goal } from '@/types/models';

const currentMonth = new Date().toISOString().slice(0, 7);
const initialState: { ok: boolean; message?: string; error?: string } = { ok: false };

export function GoalsManager({ rows, categories }: { rows: Goal[]; categories: Category[] }) {
  const toast = useToast();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, createAction] = useFormState(async (_prev: { ok: boolean; message?: string; error?: string }, formData: FormData) => {
    return createGoalState(_prev, formData);
  }, initialState);
  const [previewMonth, setPreviewMonth] = useState(currentMonth);
  const [previewLimit, setPreviewLimit] = useState('');
  const [previewCategoryId, setPreviewCategoryId] = useState(categories[0]?.id ?? '');

  const previewCategoryName = categories.find((c) => c.id === previewCategoryId)?.name ?? 'categoria selecionada';
  const previewLimitNumber = Number(previewLimit);
  const preview = Number.isFinite(previewLimitNumber) && previewLimitNumber > 0
    ? `No mês ${formatMonthBR(`${previewMonth}-01`)}, limite ${formatCurrencyBRL(previewLimitNumber)} para ${previewCategoryName}.`
    : null;

  useEffect(() => {
    if (state.ok) {
      const monthField = formRef.current?.elements.namedItem('month') as HTMLInputElement | null;
      const selectedMonth = monthField?.value || currentMonth;
      const categoryField = formRef.current?.elements.namedItem('category_id') as HTMLSelectElement | null;
      const selectedCategory = categoryField?.value;

      formRef.current?.reset();
      if (monthField) monthField.value = selectedMonth;
      if (categoryField && selectedCategory) categoryField.value = selectedCategory;
      const monthlyLimitField = formRef.current?.elements.namedItem('monthly_limit') as HTMLInputElement | null;
      if (monthlyLimitField) monthlyLimitField.value = '';

      setPreviewMonth(selectedMonth);
      setPreviewCategoryId(selectedCategory ?? categories[0]?.id ?? '');
      setPreviewLimit('');

      toast.success(state.message ?? 'Cadastro realizado com sucesso.');
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, toast, router, categories]);

  return (
    <>
      <form ref={formRef} action={createAction} className="grid gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 md:grid-cols-4">
        <input name="type" type="hidden" value="SPEND_LIMIT" />
        <label className="grid gap-1 text-sm">{ptBR.labels.category}<select aria-label="Categoria da meta" name="category_id" defaultValue={previewCategoryId} onChange={(event) => setPreviewCategoryId(event.target.value)} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5">{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="grid gap-1 text-sm">{ptBR.labels.monthlyLimit}<input aria-label="Limite mensal" name="monthly_limit" type="number" min="0.01" step="0.01" required value={previewLimit} onChange={(event) => setPreviewLimit(event.target.value)} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" /></label>
        <label className="grid gap-1 text-sm">{ptBR.labels.goalMonth}<input aria-label="Mês da meta" name="month" type="month" value={previewMonth} onChange={(event) => setPreviewMonth(event.target.value)} required className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" /></label>
        <SubmitButton pendingText="Salvando meta..." className="rounded-xl bg-emerald-400 px-3 py-2.5 font-medium text-emerald-950 hover:bg-emerald-300">{ptBR.actions.add}</SubmitButton>
        {preview ? <p className="md:col-span-4 text-xs text-zinc-400">{preview}</p> : null}
      </form>

      {rows.length === 0 ? (
        <EmptyState title={ptBR.states.noGoals} />
      ) : (
        <div className="space-y-2">
          {rows.map((goal) => (
            <form
              key={goal.id}
              action={async (formData) => {
                const result = await updateGoal(goal.id, formData);
                if (result.ok) {
                  toast.success(result.message ?? 'Atualização realizada com sucesso.');
                  router.refresh();
                } else toast.error(result.error ?? 'Ocorreu um erro ao salvar.');
              }}
              className="grid gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-zinc-700 md:grid-cols-5"
            >
              <input name="type" type="hidden" value={goal.type ?? 'SPEND_LIMIT'} />
              <select aria-label="Categoria da meta" name="category_id" defaultValue={goal.category_id ?? ''} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5">{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              <input aria-label="Limite mensal" name="monthly_limit" type="number" min="0.01" step="0.01" defaultValue={Number(goal.monthly_limit ?? goal.target_amount)} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" />
              <input aria-label={ptBR.labels.goalMonth} name="month" type="month" defaultValue={(goal.month ?? new Date().toISOString().slice(0, 10)).slice(0, 7)} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" />
              <SubmitButton pendingText="Atualizando meta..." className="rounded-xl bg-emerald-500 px-3 py-2.5 text-sm font-medium text-white hover:bg-emerald-400">{ptBR.actions.save}</SubmitButton>
              <ConfirmDialog
                triggerLabel={ptBR.actions.delete}
                triggerClassName="rounded-xl bg-rose-500/80 px-3 py-2.5 text-sm font-medium text-white hover:bg-rose-500"
                onConfirm={async () => {
                  const result = await deleteGoal(goal.id);
                  if (result.ok) {
                    toast.success(result.message ?? 'Exclusão realizada com sucesso.');
                    router.refresh();
                  } else toast.error(result.error ?? 'Ocorreu um erro ao excluir.');
                }}
              />
              <div className="md:col-span-5 text-xs text-zinc-500">
                {goal.category?.name ?? ptBR.labels.category} • {formatCurrencyBRL(Number(goal.monthly_limit ?? goal.target_amount))} • {goal.month ? formatMonthBR(goal.month) : 'Sem mês'}
              </div>
            </form>
          ))}
        </div>
      )}
    </>
  );
}
