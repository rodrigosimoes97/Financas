'use client';

import { useEffect, useRef } from 'react';
import { useFormState } from 'react-dom';
import { createAccountState, deleteAccount } from '@/lib/actions/accounts';
import { Account } from '@/types/models';
import { ptBR } from '@/lib/i18n/pt-BR';
import { SubmitButton } from '@/components/ui/submit-button';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';

const initialState: { ok: boolean; message?: string; error?: string } = { ok: false };

export function AccountsManager({ rows }: { rows: Account[] }) {
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, createAction] = useFormState(createAccountState, initialState);

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
      <form ref={formRef} action={createAction} className="grid gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 md:grid-cols-3">
        <input name="name" required placeholder={ptBR.labels.accountName} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" />
        <div />
        <SubmitButton className="rounded-xl bg-emerald-400 px-3 py-2.5 font-medium text-emerald-950 hover:bg-emerald-300">{ptBR.actions.add}</SubmitButton>
      </form>

      {rows.length === 0 ? (
        <EmptyState title={ptBR.states.noAccounts} />
      ) : (
        <div className="space-y-2">
          {rows.map((account) => (
            <div key={account.id} className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
              <p>{account.name}</p>
              <ConfirmDialog
                triggerLabel={ptBR.actions.delete}
                triggerClassName="rounded-xl bg-rose-500/80 px-3 py-2 text-sm font-medium text-white hover:bg-rose-500"
                onConfirm={async () => {
                  const result = await deleteAccount(account.id);
                  if (result.ok) toast.success(result.message ?? 'Exclusão realizada com sucesso.');
                  else toast.error(result.error ?? 'Ocorreu um erro ao excluir.');
                }}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
