'use client';

import { useRef } from 'react';
import { createGoal, deleteGoal, updateGoal } from '@/lib/actions/goals';
import { ptBR } from '@/lib/i18n/pt-BR';
import { formatCurrencyBRL, formatMonthBR } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { SubmitButton } from '@/components/ui/submit-button';
import { Category, Goal } from '@/types/models';

const currentMonth = new Date().toISOString().slice(0, 7);
const normalizeMonth = (monthValue: string) => `${monthValue}-01`;

export function GoalsManager({ rows, categories }: { rows: Goal[]; categories: Category[] }) {
  const { showToast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <form
        ref={formRef}
        action={async (formData) => {
          const monthInput = String(formData.get('month') || currentMonth);
          formData.set('month', normalizeMonth(monthInput));
          const result = await createGoal(formData);
          if (result.ok) {
            formRef.current?.reset();
            const monthField = formRef.current?.elements.namedItem('month') as HTMLInputElement | null;
            if (monthField) monthField.value = currentMonth;
            showToast(result.message ?? 'Cadastro realizado com sucesso.', 'success');
          } else showToast(result.error ?? 'Ocorreu um erro ao salvar.', 'error');
        }}
        className="grid gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 md:grid-cols-4"
      >
        <label className="grid gap-1 text-sm">{ptBR.labels.category}<select name="category_id" className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5">{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="grid gap-1 text-sm">{ptBR.labels.monthlyLimit}<input name="monthly_limit" type="number" step="0.01" required className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" /></label>
        <label className="grid gap-1 text-sm">{ptBR.labels.goalMonth}<input name="month" type="month" defaultValue={currentMonth} required className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" /></label>
        <SubmitButton className="rounded-xl bg-emerald-400 px-3 py-2.5 font-medium text-emerald-950 hover:bg-emerald-300">{ptBR.actions.add}</SubmitButton>
      </form>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 px-4 py-12 text-center text-zinc-400">{ptBR.states.noGoals}</div>
      ) : (
        <div className="space-y-2">
          {rows.map((goal) => (
            <form
              key={goal.id}
              action={async (formData) => {
                const monthInput = String(formData.get('month') || goal.month.slice(0, 7));
                formData.set('month', normalizeMonth(monthInput));
                const result = await updateGoal(goal.id, formData);
                if (result.ok) showToast(result.message ?? 'Atualização realizada com sucesso.', 'success');
                else showToast(result.error ?? 'Ocorreu um erro ao salvar.', 'error');
              }}
              className="grid gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-zinc-700 md:grid-cols-5"
            >
              <select name="category_id" defaultValue={goal.category_id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5">{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              <input name="monthly_limit" type="number" step="0.01" defaultValue={Number(goal.monthly_limit)} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" />
              <input name="month" type="month" defaultValue={goal.month.slice(0, 7)} aria-label={ptBR.labels.goalMonth} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" />
              <SubmitButton className="rounded-xl border border-zinc-700 px-3 py-2.5 text-sm hover:bg-zinc-800">{ptBR.actions.save}</SubmitButton>
              <button
                formAction={async () => {
                  const result = await deleteGoal(goal.id);
                  if (result.ok) showToast(result.message ?? 'Exclusão realizada com sucesso.', 'success');
                  else showToast(result.error ?? 'Ocorreu um erro ao excluir.', 'error');
                }}
                className="rounded-xl bg-rose-500/80 px-3 py-2.5 text-sm font-medium text-white hover:bg-rose-500"
              >
                {ptBR.actions.delete}
              </button>
              <div className="md:col-span-5 text-xs text-zinc-500">
                {goal.category?.name ?? ptBR.labels.category} • {formatCurrencyBRL(Number(goal.monthly_limit))} • {formatMonthBR(goal.month)}
              </div>
            </form>
          ))}
        </div>
      )}
    </>
  );
}
