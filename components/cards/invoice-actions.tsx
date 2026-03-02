'use client';

import { markInvoiceAsPaid } from '@/lib/actions/credit-cards';
import { useToast } from '@/components/ui/toast';

export function InvoiceActions({ invoiceId }: { invoiceId: string }) {
  const toast = useToast();

  return (
    <button
      onClick={async () => {
        const result = await markInvoiceAsPaid(invoiceId);
        if (result.ok) toast.success(result.message ?? 'Fatura marcada como paga.');
        else toast.error(result.error ?? 'Erro ao marcar fatura.');
      }}
      className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-400"
    >
      Marcar como paga
    </button>
  );
}
