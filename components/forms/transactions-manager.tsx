'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit3, Search, Trash2, X } from 'lucide-react';
import { deleteTransaction, updateTransaction } from '@/lib/actions/transactions';
import { ptBR } from '@/lib/i18n/pt-BR';
import { formatCurrencyBRL, formatDateBR, paymentMethodToLabel, typeToLabel } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { SubmitButton } from '@/components/ui/submit-button';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Account, Category, Transaction, PaymentMethod } from '@/types/models';

interface CreditCardOption {
  id: string;
  name: string;
}

interface Props {
  rows: Transaction[];
  categories: Category[];
  accounts: Account[];
  creditCards: CreditCardOption[];
  currentFilters: {
    month: string;
    type: string;
    category: string;
    payment: string;
    q: string;
  };
}

const MONTHS_TO_SHOW = 12;

const getInstallmentSummary = (tx: Transaction) => {
  const totalInstallments = tx.total_installments ?? tx.installments_total ?? tx.installment_total ?? null;

  if (!tx.is_installment || !totalInstallments || totalInstallments <= 1) return null;

  const total = Number(tx.amount) * totalInstallments;
  return `Total: ${formatCurrencyBRL(total)} em ${totalInstallments}x`;
};

export function TransactionsManager({ rows, categories, accounts, creditCards, currentFilters }: Props) {
  const toast = useToast();
  const router = useRouter();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const monthOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string }> = [];
    const base = new Date();

    for (let i = 0; i < MONTHS_TO_SHOW; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      opts.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }

    if (!opts.find((item) => item.value === currentFilters.month)) {
      const [year, month] = currentFilters.month.split('-').map(Number);
      const selectedDate = new Date(year, month - 1, 1);
      const selectedLabel = selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      opts.unshift({
        value: currentFilters.month,
        label: selectedLabel.charAt(0).toUpperCase() + selectedLabel.slice(1)
      });
    }

    return opts;
  }, [currentFilters.month]);

  const hasSingleAccount = accounts.length === 1;

  return (
    <>
      <form className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4" action="/transactions" method="get">
        <p className="mb-3 text-sm text-zinc-400">{ptBR.hints.filters}</p>
        <div className="grid gap-2 lg:grid-cols-6">
          <select name="month" defaultValue={currentFilters.month} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-sm">
            {monthOptions.map((month) => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </select>

          <select name="type" defaultValue={currentFilters.type} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-sm">
            <option value="">{ptBR.labels.allTypes}</option>
            <option value="income">{ptBR.typeLabel.income}</option>
            <option value="expense">{ptBR.typeLabel.expense}</option>
          </select>

          <select name="category" defaultValue={currentFilters.category} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-sm">
            <option value="">{ptBR.labels.allCategories}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select name="payment" defaultValue={currentFilters.payment} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-sm">
            <option value="">Todas as formas</option>
            <option value="credit">Crédito</option>
            <option value="debit">Débito</option>
            <option value="pix">Pix</option>
            <option value="cash">Dinheiro</option>
          </select>

          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              name="q"
              defaultValue={currentFilters.q}
              placeholder="Buscar por descrição"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 pl-9 pr-3 text-sm"
            />
          </label>

          <div className="flex gap-2">
            <button type="submit" className="flex-1 rounded-xl border border-zinc-600 bg-zinc-900 px-3 py-2.5 text-sm font-medium text-zinc-100 hover:bg-zinc-800">
              Filtrar
            </button>
            <a href="/transactions" className="rounded-xl border border-zinc-700 px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800">
              {ptBR.actions.clear}
            </a>
          </div>
        </div>
      </form>

      {rows.length === 0 ? (
        <EmptyState title={ptBR.states.noTransactions} description="Tente ajustar os filtros ou adicionar uma nova transação." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
          <div className="hidden grid-cols-[1.2fr_1.6fr_1fr_0.9fr_1fr_1fr_1.2fr_80px] gap-3 border-b border-zinc-800 bg-zinc-950/70 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-400 md:grid">
            <span>Categoria</span>
            <span>Descrição</span>
            <span className="text-right">Valor</span>
            <span>Tipo</span>
            <span>Pagamento</span>
            <span>Data</span>
            <span>Parcelamento</span>
            <span className="text-center">Ações</span>
          </div>

          <div className="divide-y divide-zinc-800">
            {rows.map((tx) => {
              const installmentSummary = getInstallmentSummary(tx);

              return (
                <div key={tx.id} className="grid gap-3 px-4 py-4 transition hover:bg-zinc-900/80 md:grid-cols-[1.2fr_1.6fr_1fr_0.9fr_1fr_1fr_1.2fr_80px] md:items-center">
                  <div>
                    <p className="text-xs text-zinc-500 md:hidden">Categoria</p>
                    <p className="text-sm text-zinc-200">{tx.category?.name ?? '-'}</p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500 md:hidden">Descrição</p>
                    <p className="font-medium text-zinc-100">{tx.description || 'Transação'}</p>
                    <p className="text-xs text-zinc-500">{(tx.account as { name?: string } | undefined)?.name ?? 'Conta'}</p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500 md:hidden">Valor</p>
                    <p className="text-right text-sm font-semibold text-zinc-100 md:text-base">{formatCurrencyBRL(Number(tx.amount))}</p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500 md:hidden">Tipo</p>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tx.type === 'income' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
                      {typeToLabel(tx.type)}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500 md:hidden">Pagamento</p>
                    <span className="inline-flex rounded-full bg-sky-500/10 px-2.5 py-1 text-xs text-sky-300">
                      {paymentMethodToLabel(tx.payment_method)}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500 md:hidden">Data</p>
                    <p className="text-sm text-zinc-300">{formatDateBR(tx.date)}</p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500 md:hidden">Parcelamento</p>
                    {installmentSummary ? (
                      <span className="inline-flex rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300">{installmentSummary}</span>
                    ) : (
                      <span className="text-sm text-zinc-500">-</span>
                    )}
                  </div>

                  <div className="flex items-center justify-start gap-1 md:justify-center">
                    <button
                      type="button"
                      onClick={() => setSelectedTransaction(tx)}
                      title="Editar transação"
                      className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
                    >
                      <Edit3 size={16} />
                    </button>
                    <ConfirmDialog
                      triggerLabel=""
                      triggerClassName="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-rose-300"
                      onConfirm={async () => {
                        const result = await deleteTransaction(tx.id);
                        if (result.ok) {
                          toast.success(result.message ?? 'Exclusão realizada com sucesso.');
                          router.refresh();
                        } else toast.error(result.error ?? 'Ocorreu um erro ao excluir.');
                      }}
                      triggerNode={<Trash2 size={16} aria-label="Excluir transação" />}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Dialog.Root open={Boolean(selectedTransaction)} onOpenChange={(open) => !open && setSelectedTransaction(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-[95vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <Dialog.Title className="text-xl font-semibold">Editar transação</Dialog.Title>
            <p className="mt-1 text-sm text-zinc-400">Atualize os dados e salve para refletir na lista.</p>

            {selectedTransaction ? (
              <form
                className="mt-4 grid gap-3"
                action={async (formData) => {
                  if (hasSingleAccount) formData.set('account_id', accounts[0].id);
                  const result = await updateTransaction(selectedTransaction.id, formData);

                  if (result.ok) {
                    toast.success(result.message ?? 'Atualização realizada com sucesso.');
                    setSelectedTransaction(null);
                    router.refresh();
                  } else {
                    toast.error(result.error ?? 'Ocorreu um erro ao salvar.');
                  }
                }}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1 text-sm">{ptBR.labels.description}<input name="description" defaultValue={selectedTransaction.description ?? ''} className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5" /></label>
                  <label className="grid gap-1 text-sm">{ptBR.labels.amount}<input name="amount" type="number" step="0.01" defaultValue={Number(selectedTransaction.amount)} className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5" /></label>
                  <label className="grid gap-1 text-sm">{ptBR.labels.date}<input name="date" type="date" defaultValue={selectedTransaction.date} className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5" /></label>
                  <label className="grid gap-1 text-sm">{ptBR.labels.type}<select name="type" defaultValue={selectedTransaction.type} className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5"><option value="income">Receita</option><option value="expense">Despesa</option></select></label>

                  {!hasSingleAccount ? (
                    <label className="grid gap-1 text-sm">{ptBR.labels.account}<select name="account_id" defaultValue={selectedTransaction.account_id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5">{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
                  ) : (
                    <input type="hidden" name="account_id" value={accounts[0]?.id ?? ''} />
                  )}

                  <label className="grid gap-1 text-sm">{ptBR.labels.category}<select name="category_id" defaultValue={selectedTransaction.category_id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5">{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>

                  <label className="grid gap-1 text-sm">{ptBR.labels.paymentMethod}<select name="payment_method" defaultValue={selectedTransaction.payment_method ?? 'pix'} className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5"><option value="credit">Crédito</option><option value="debit">Débito</option><option value="pix">Pix</option><option value="cash">Dinheiro</option></select></label>

                  {selectedTransaction.payment_method === 'credit' ? (
                    <label className="grid gap-1 text-sm">Cartão<select name="credit_card_id" defaultValue={selectedTransaction.credit_card_id ?? ''} className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5"><option value="">Selecione</option>{creditCards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select></label>
                  ) : null}
                </div>

                {getInstallmentSummary(selectedTransaction) ? (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-sm text-zinc-300">
                    {getInstallmentSummary(selectedTransaction)}
                  </div>
                ) : null}

                <div className="flex justify-end gap-2">
                  <Dialog.Close className="rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800">{ptBR.actions.cancel}</Dialog.Close>
                  <SubmitButton className="rounded-xl bg-emerald-400 px-3 py-2 font-medium text-emerald-950 hover:bg-emerald-300">{ptBR.actions.save}</SubmitButton>
                </div>
              </form>
            ) : null}

            <Dialog.Close className="absolute right-4 top-4 rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"><X size={18} /></Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
