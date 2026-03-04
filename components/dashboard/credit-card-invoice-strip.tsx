import { formatCurrencyBRL, formatDateBR } from '@/lib/utils';

interface CardInvoice {
  card_id: string;
  card_name: string;
  current_invoice_total: number;
  next_invoice_total: number;
  closing_date: string;
  due_date: string;
  limit_available: number | null;
}

export function CreditCardInvoiceStrip({ cards }: { cards: CardInvoice[] }) {
  if (!cards.length) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Faturas por cartão</h3>
      <div className="grid gap-3 overflow-x-auto pb-1 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <article key={card.card_id} className="min-w-[260px] rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <p className="font-medium">{card.card_name}</p>
            <p className="mt-3 text-xs text-zinc-500">Próxima fatura</p>
            <p className="text-xl font-semibold">{formatCurrencyBRL(card.next_invoice_total)}</p>
            <p className="text-xs text-zinc-500">Fecha em {formatDateBR(card.closing_date)} • Vence em {formatDateBR(card.due_date)}</p>
            <p className="mt-3 text-xs text-zinc-500">Fatura atual: {formatCurrencyBRL(card.current_invoice_total)}</p>
            {typeof card.limit_available === 'number' && <p className="text-xs text-zinc-500">Limite disponível: {formatCurrencyBRL(card.limit_available)}</p>}
          </article>
        ))}
      </div>
    </div>
  );
}
