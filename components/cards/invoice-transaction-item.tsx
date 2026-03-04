'use client';

import { deleteInvoiceTransaction } from '@/lib/actions/credit-cards';
import { useToast } from '@/components/ui/toast';

interface Props {
  id: string;
  invoiceId: string;
  title: string;
  subtitle: string;
  amountLabel: string;
}

export function InvoiceTransactionItem({ id, invoiceId, title, subtitle, amountLabel }: Props) {
  const toast = useToast();

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-zinc-100">{title}</p>
          <p className="mt-1 text-xs text-zinc-400">{subtitle}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-zinc-100">{amountLabel}</p>
          <button
            type="button"
            className="mt-2 text-xs text-rose-300 hover:text-rose-200"
            onClick={async () => {
              const result = await deleteInvoiceTransaction(id, invoiceId);
              if (result.ok) toast.success(result.message ?? 'Lançamento removido.');
              else toast.error(result.error ?? 'Erro ao remover lançamento.');
            }}
          >
            Excluir lançamento
          </button>
        </div>
      </div>
    </div>
  );
}
