'use client';

import { useEffect, useRef } from 'react';
import { useFormState } from 'react-dom';
import { createCategoryState, deleteCategory, updateCategory } from '@/lib/actions/categories';
import { ptBR } from '@/lib/i18n/pt-BR';
import { useToast } from '@/components/ui/toast';
import { SubmitButton } from '@/components/ui/submit-button';
import { EmptyState } from '@/components/ui/empty-state';
import { Category } from '@/types/models';

const initialState = { ok: false };

export function CategoriesManager({ rows }: { rows: Category[] }) {
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState(createCategoryState, initialState);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      toast.success(state.message ?? 'Cadastro realizado com sucesso.');
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, toast]);

  return (
    <>
      <form ref={formRef} action={formAction} className="grid gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 md:grid-cols-3">
        <input name="name" required placeholder={ptBR.labels.name} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" />
        <select name="type" className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5"><option value="expense">Despesa</option><option value="income">Receita</option></select>
        <SubmitButton className="rounded-xl bg-emerald-400 px-3 py-2.5 font-medium text-emerald-950 hover:bg-emerald-300">{ptBR.actions.add}</SubmitButton>
      </form>

      {rows.length === 0 ? (
        <EmptyState title={ptBR.states.noCategories} />
      ) : (
        <div className="space-y-2">
          {rows.map((category) => (
            <form
              key={category.id}
              action={async (formData) => {
                const result = await updateCategory(category.id, formData);
                if (result.ok) toast.success(result.message ?? 'Atualização realizada com sucesso.');
                else toast.error(result.error ?? 'Ocorreu um erro ao salvar.');
              }}
              className="grid gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-zinc-700 md:grid-cols-4"
            >
              <input name="name" defaultValue={category.name} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" />
              <select name="type" defaultValue={category.type} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5"><option value="expense">Despesa</option><option value="income">Receita</option></select>
              <SubmitButton className="rounded-xl border border-zinc-700 px-3 py-2.5 text-sm hover:bg-zinc-800">{ptBR.actions.save}</SubmitButton>
              <button
                formAction={async () => {
                  const result = await deleteCategory(category.id);
                  if (result.ok) toast.success(result.message ?? 'Exclusão realizada com sucesso.');
                  else toast.error(result.error ?? 'Ocorreu um erro ao excluir.');
                }}
                className="rounded-xl bg-rose-500/80 px-3 py-2.5 text-sm font-medium text-white hover:bg-rose-500"
              >
                {ptBR.actions.delete}
              </button>
            </form>
          ))}
        </div>
      )}
    </>
  );
}
