'use client';

import { deleteTransaction, updateTransaction } from '@/lib/actions/transactions';
import { ptBR } from '@/lib/i18n/pt-BR';
import { formatCurrencyBRL, formatDateBR, typeToLabel } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { SubmitButton } from '@/components/ui/submit-button';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Account, Category, Transaction } from '@/types/models';

interface Props {
  rows: Transaction[];
  categories: Category[];
  accounts: Account[];
  currentMonthLabel: string;
}

export function TransactionsManager({ rows, categories, accounts, currentMonthLabel }: Props) {
  const toast = useToast();

  return (
    <>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <p className="mb-3 text-sm text-zinc-400">{ptBR.hints.filters}</p>
        <div className="grid gap-2 md:grid-cols-4">
          <select className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-sm"><option>{currentMonthLabel}</option></select>
          <select className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-sm"><option>{ptBR.labels.allCategories}</option>{categories.map((c) => <option key={c.id}>{c.name}</option>)}</select>
          <select className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-sm"><option>{ptBR.labels.allTypes}</option><option>{ptBR.typeLabel.income}</option><option>{ptBR.typeLabel.expense}</option></select>
          <button className="rounded-xl border border-zinc-700 px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800">{ptBR.actions.clear}</button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title={ptBR.states.noTransactions} />
      ) : (
        <div className="space-y-2">
          {rows.map((tx) => {
            const accountName = (tx.account as { name?: string } | undefined)?.name ?? 'Conta';
            const installmentsCount = tx.total_installments ?? tx.installments_total ?? null;

            return (
              <form
                key={tx.id}
                action={async (formData) => {
                  const result = await updateTransaction(tx.id, formData);
                  if (result.ok) toast.success(result.message ?? 'Atualização realizada com sucesso.');
                  else toast.error(result.error ?? 'Ocorreu um erro ao salvar.');
                }}
                className="grid gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-zinc-700 hover:bg-zinc-900 md:grid-cols-8"
              >
                <input name="description" defaultValue={tx.description ?? ''} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" />
                <input name="amount" type="number" step="0.01" defaultValue={Number(tx.amount)} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" />
                <input name="date" type="date" defaultValue={tx.date} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" />
                <select name="type" defaultValue={tx.type} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5"><option value="income">Receita</option><option value="expense">Despesa</option></select>
                <select name="account_id" defaultValue={tx.account_id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5">{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
                <select name="category_id" defaultValue={tx.category_id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5">{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                <SubmitButton className="rounded-xl bg-emerald-500 px-3 py-2.5 text-sm font-medium text-white hover:bg-emerald-400">{ptBR.actions.save}</SubmitButton>
                <ConfirmDialog
                  triggerLabel={ptBR.actions.delete}
                  triggerClassName="rounded-xl bg-rose-500/80 px-3 py-2.5 text-sm font-medium text-white hover:bg-rose-500"
                  onConfirm={async () => {
                    const result = await deleteTransaction(tx.id);
                    if (result.ok) toast.success(result.message ?? 'Exclusão realizada com sucesso.');
                    else toast.error(result.error ?? 'Ocorreu um erro ao excluir.');
                  }}
                />
                <div className="md:col-span-8 text-xs text-zinc-500">
                  {typeToLabel(tx.type)} • {formatCurrencyBRL(Number(tx.amount))} • {formatDateBR(tx.date)} • {accountName}
                  {installmentsCount && installmentsCount > 1 ? (
                    <span className="ml-2 rounded-md border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-xs text-zinc-300">{installmentsCount}x</span>
                  ) : null}
                </div>
              </form>
            );
          })}
        </div>
      )}
    </>
  );
}
