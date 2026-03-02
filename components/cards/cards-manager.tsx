'use client';

import { useEffect, useRef } from 'react';
import { useFormState } from 'react-dom';
import Link from 'next/link';
import { createCreditCardState, deleteCreditCard } from '@/lib/actions/credit-cards';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SubmitButton } from '@/components/ui/submit-button';
import { useToast } from '@/components/ui/toast';
import { formatCurrencyBRL } from '@/lib/utils';

interface CardItem {
  id: string;
  name: string;
  closing_day: number;
  due_day: number;
  limit_amount: number | null;
}

const initialState: { ok: boolean; message?: string; error?: string } = { ok: false };

export function CardsManager({ cards }: { cards: CardItem[] }) {
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useFormState(createCreditCardState, initialState);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      toast.success(state.message ?? 'Cartão cadastrado com sucesso.');
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, toast]);

  return (
    <div className="space-y-4">
      <form ref={formRef} action={action} className="grid gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 md:grid-cols-5">
        <input name="name" required placeholder="Nome do cartão" className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" />
        <input name="closing_day" type="number" min={1} max={28} required placeholder="Dia fechamento" className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" />
        <input name="due_day" type="number" min={1} max={28} required placeholder="Dia vencimento" className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" />
        <input name="limit_amount" type="number" step="0.01" placeholder="Limite" className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" />
        <SubmitButton className="rounded-xl bg-emerald-400 px-3 py-2.5 font-medium text-emerald-950 hover:bg-emerald-300">Adicionar cartão</SubmitButton>
      </form>

      {cards.map((card) => (
        <div key={card.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{card.name}</p>
              <p className="mt-1 text-sm text-zinc-400">Fechamento: dia {card.closing_day} • Vencimento: dia {card.due_day} • Limite: {card.limit_amount ? formatCurrencyBRL(Number(card.limit_amount)) : '—'}</p>
              <Link href={`/cards/${card.id}`} className="mt-2 inline-block text-sm text-emerald-300 hover:underline">Ver faturas</Link>
            </div>
            <ConfirmDialog
              triggerLabel="Excluir"
              triggerClassName="rounded-xl bg-rose-500/80 px-3 py-2 text-sm font-medium text-white hover:bg-rose-500"
              onConfirm={async () => {
                const result = await deleteCreditCard(card.id);
                if (result.ok) toast.success(result.message ?? 'Cartão excluído com sucesso.');
                else toast.error(result.error ?? 'Erro ao excluir cartão.');
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
