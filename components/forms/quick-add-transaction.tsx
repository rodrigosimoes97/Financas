'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { createTransaction } from '@/lib/actions/transactions';
import { Account, Category } from '@/types/models';

interface QuickAddTransactionProps {
  accounts: Account[];
  categories: Category[];
}

export function QuickAddTransaction({ accounts, categories }: QuickAddTransactionProps) {
  return (
    <Dialog.Root>
      <Dialog.Trigger className="rounded-lg bg-white px-4 py-2 text-black">Quick Add</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[90vw] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6">
          <Dialog.Title className="text-xl font-semibold">Add Transaction</Dialog.Title>
          <form action={createTransaction} className="mt-4 grid gap-3">
            <input name="description" placeholder="Description" className="rounded border border-border bg-transparent p-2" />
            <input name="amount" type="number" step="0.01" required className="rounded border border-border bg-transparent p-2" />
            <input name="date" type="date" required className="rounded border border-border bg-transparent p-2" />
            <select name="type" className="rounded border border-border bg-transparent p-2">
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <select name="account_id" required className="rounded border border-border bg-transparent p-2">
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>{account.name}</option>
              ))}
            </select>
            <select name="category_id" required className="rounded border border-border bg-transparent p-2">
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <button className="rounded bg-white px-3 py-2 font-medium text-black">Save</button>
          </form>
          <Dialog.Close className="absolute right-4 top-4">
            <X size={18} />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
