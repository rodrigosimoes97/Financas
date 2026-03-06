'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Category, Goal } from '@/types/models';
import { createGoal, updateGoal } from '@/lib/actions/goals';
import { SubmitButton } from '@/components/ui/submit-button';
import { useToast } from '@/components/ui/toast';

interface GoalFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initialType: 'SAVINGS_GOAL' | 'SPEND_LIMIT';
  categories: Category[];
  goal?: Goal | null;
}

export function GoalFormModal({ open, onOpenChange, mode, initialType, categories, goal }: GoalFormModalProps) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = mode === 'edit' && Boolean(goal);
  const type = (goal?.type ?? initialType) as 'SAVINGS_GOAL' | 'SPEND_LIMIT';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[95vw] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <Dialog.Title className="text-lg font-semibold">{isEdit ? 'Editar meta' : 'Nova meta'}</Dialog.Title>
          <Dialog.Close className="absolute right-4 top-4 text-zinc-400"><X size={18} /></Dialog.Close>

          <form
            className="mt-4 grid gap-3"
            action={async (formData) => {
              const result = isEdit && goal ? await updateGoal(goal.id, formData) : await createGoal(formData);
              if (result.ok) {
                toast.success(result.message ?? 'Sucesso');
                onOpenChange(false);
                router.refresh();
              } else toast.error(result.error ?? 'Erro ao salvar');
            }}
          >
            <input type="hidden" name="type" value={type} />
            {type === 'SAVINGS_GOAL' ? (
              <>
                <input name="name" defaultValue={goal?.name ?? ''} required placeholder="Nome da meta" className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5" />
                <input name="target_amount" type="number" min="0.01" step="0.01" defaultValue={goal?.target_amount ?? ''} required placeholder="Valor alvo" className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5" />
                <input name="deadline" type="date" defaultValue={goal?.deadline ?? ''} className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5" />
              </>
            ) : (
              <>
                <select name="category_id" defaultValue={goal?.category_id ?? categories[0]?.id ?? ''} required className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5">
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
                <input name="target_amount" type="number" min="0.01" step="0.01" defaultValue={goal?.target_amount ?? ''} required placeholder="Limite do mês" className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5" />
                <input name="month" type="month" defaultValue={goal?.month?.slice(0, 7) ?? new Date().toISOString().slice(0, 7)} required className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5" />
              </>
            )}
            <textarea name="notes" defaultValue={goal?.notes ?? ''} placeholder="Observações (opcional)" className="min-h-20 rounded-xl border border-zinc-800 bg-zinc-900 p-2.5" />
            <SubmitButton pendingText="Salvando..." className="rounded-xl bg-emerald-400 px-3 py-2.5 font-medium text-emerald-950">
              {isEdit ? 'Salvar alterações' : 'Criar meta'}
            </SubmitButton>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
