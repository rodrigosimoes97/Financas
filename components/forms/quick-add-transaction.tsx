'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useRef, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { createTransaction } from '@/lib/actions/transactions';
import { Account, Category } from '@/types/models';
import { ptBR } from '@/lib/i18n/pt-BR';
import { useToast } from '@/components/ui/toast';
import { SubmitButton } from '@/components/ui/submit-button';

interface QuickAddTransactionProps {
  accounts: Account[];
  categories: Category[];
}

export function QuickAddTransaction({ accounts, categories }: QuickAddTransactionProps) {
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const { showToast } = useToast();

  const validate = (formData: FormData) => {
    const amount = Number(formData.get('amount'));
    const date = String(formData.get('date') || '');
    const account = String(formData.get('account_id') || '');
    const category = String(formData.get('category_id') || '');

    if (!amount || !date || !account || !category) {
      setError(ptBR.modal.validation);
      return false;
    }
    setError('');
    return true;
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-medium text-emerald-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-300">
        <Plus size={16} />
        {ptBR.actions.newTransaction}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
          <Dialog.Title className="text-xl font-semibold">{ptBR.modal.title}</Dialog.Title>
          <p className="mt-1 text-sm text-zinc-400">{ptBR.hints.quickAdd}</p>
          <form
            ref={formRef}
            action={async (formData) => {
              if (!validate(formData)) return;
              const result = await createTransaction(formData);
              if (result.ok) {
                formRef.current?.reset();
                showToast(result.message ?? 'Cadastro realizado com sucesso.', 'success');
                setOpen(false);
              } else {
                showToast(result.error ?? 'Ocorreu um erro ao salvar.', 'error');
              }
            }}
            className="mt-4 grid gap-3"
          >
            <label className="grid gap-1 text-sm">
              {ptBR.labels.description}
              <input name="description" placeholder="Ex.: Mercado" className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5" />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                {ptBR.labels.amount}
                <input name="amount" type="number" step="0.01" required className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5" />
              </label>
              <label className="grid gap-1 text-sm">
                {ptBR.labels.date}
                <input name="date" type="date" required className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5" />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="grid gap-1 text-sm">
                {ptBR.labels.type}
                <select name="type" className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5"><option value="income">Receita</option><option value="expense">Despesa</option></select>
              </label>
              <label className="grid gap-1 text-sm">
                {ptBR.labels.account}
                <select name="account_id" required className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5">{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select>
              </label>
              <label className="grid gap-1 text-sm">
                {ptBR.labels.category}
                <select name="category_id" required className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
              </label>
            </div>
            {error && <p className="rounded-xl border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>}
            <SubmitButton className="mt-1 rounded-xl bg-emerald-400 px-3 py-2.5 font-medium text-emerald-950 hover:bg-emerald-300">{ptBR.actions.save}</SubmitButton>
          </form>
          <Dialog.Close className="absolute right-4 top-4 rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"><X size={18} /></Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
