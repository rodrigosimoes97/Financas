'use client';

import { formatCurrencyBRL, formatDateBR, formatMonthBR } from '@/lib/utils';
import { InvoiceActions } from '../../../../components/cards/invoice-actions';
import { ptBR } from '@/lib/i18n/pt-BR';

type InvoiceRow = {
  id: string;
  reference_month: string; // vem como string YYYY-MM-DD
  due_date: string;
  closing_date: string;
  total_amount: number;
  status: 'open' | 'closed' | 'paid' | string;
};

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export function InvoicesTable({ invoices }: { invoices: InvoiceRow[] }) {
  const now = new Date();
  const currentRef = monthKey(new Date(now.getFullYear(), now.getMonth(), 1));

  const totalAll = invoices.reduce((acc, inv) => acc + Number(inv.total_amount ?? 0), 0);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Faturas</h3>
          <p className="text-sm text-zinc-400">
            Total (todas): {formatCurrencyBRL(totalAll)}
          </p>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-950/60 text-zinc-300">
            <tr>
              <th className="px-3 py-2 text-left">Mês</th>
              <th className="px-3 py-2 text-left">Fechamento</th>
              <th className="px-3 py-2 text-left">Vencimento</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>

          <tbody>
            {invoices.map((inv) => {
              const isCurrent = inv.reference_month === currentRef;

              return (
                <tr
                  key={inv.id}
                  className={[
                    'border-t border-zinc-800',
                    isCurrent ? 'bg-emerald-500/10' : 'bg-transparent',
                  ].join(' ')}
                >
                  <td className="px-3 py-2 font-medium">
                    <span className={isCurrent ? 'text-emerald-300' : ''}>
                      {formatMonthBR(inv.reference_month)}
                    </span>
                    {isCurrent && (
                      <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-200">
                        Atual
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-2 text-zinc-300">
                    {formatDateBR(inv.closing_date)}
                  </td>

                  <td className="px-3 py-2 text-zinc-300">
                    {formatDateBR(inv.due_date)}
                  </td>

                  <td className="px-3 py-2">
                    <span
                      className={[
                        'rounded-full px-2 py-0.5 text-xs',
                        inv.status === 'paid'
                          ? 'bg-emerald-500/20 text-emerald-200'
                          : inv.status === 'open'
                          ? 'bg-sky-500/20 text-sky-200'
                          : 'bg-zinc-500/20 text-zinc-200',
                      ].join(' ')}
                    >
                      {inv.status}
                    </span>
                  </td>

                  <td className="px-3 py-2 text-right font-semibold">
                    {formatCurrencyBRL(Number(inv.total_amount ?? 0))}
                  </td>

                  <td className="px-3 py-2 text-right">
                    {inv.status !== 'paid' ? <InvoiceActions invoiceId={inv.id} /> : <span className="text-zinc-500">—</span>}
                  </td>
                </tr>
              );
            })}

            {invoices.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-zinc-400">
                  Nenhuma fatura encontrada para este cartão.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}