'use client';

import { useEffect, useRef } from 'react';
import { useFormState } from 'react-dom';
import Link from 'next/link';
import { createCreditCardState, deleteCreditCard, reactivateCreditCard } from '@/lib/actions/credit-cards';
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
  archived_at?: string | null;
}

const initialState: { ok: boolean; message?: string; error?: string } = { ok: false };

export function CardsManager({ cards }: { cards: CardItem[] }) {
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useFormState(createCreditCardState, initialState);
  const activeCards = cards.filter((card) => !card.archived_at);
  const archivedCards = cards.filter((card) => Boolean(card.archived_at));

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      toast.success(state.message ?? 'Cartão cadastrado com sucesso.');
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, toast]);

  return (
    <div className="space-y-6">
      <form ref={formRef} action={action} className="grid gap-2 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4 md:grid-cols-5">
        <input name="name" required placeholder="Nome do cartão" className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" />
        <input name="closing_day" type="number" min={1} max={28} required placeholder="Dia fechamento" className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" />
        <input name="due_day" type="number" min={1} max={28} required placeholder="Dia vencimento" className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" />
        <input name="limit_amount" type="number" step="0.01" placeholder="Limite" className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5" />
        <SubmitButton className="rounded-xl bg-emerald-400 px-3 py-2.5 font-medium text-emerald-950 hover:bg-emerald-300">Adicionar cartão</SubmitButton>
      </form>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Cartões ativos</h3>
        {activeCards.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/60 p-4 text-sm text-zinc-500">Nenhum cartão ativo.</p>
        ) : (
          activeCards.map((card) => (
            <article key={card.id} className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-4">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/cards/${card.id}`} className="min-w-0 flex-1">
                  <p className="text-lg font-semibold text-zinc-100">{card.name}</p>
                  <p className="mt-2 text-sm text-zinc-400">Limite: {card.limit_amount ? formatCurrencyBRL(Number(card.limit_amount)) : '—'}</p>
                  <p className="text-xs text-zinc-500">Fechamento dia {card.closing_day} • Vencimento dia {card.due_day}</p>
                  <span className="mt-3 inline-flex text-sm font-medium text-emerald-300">Abrir faturas →</span>
                </Link>
                <ConfirmDialog
                  triggerLabel="Arquivar"
                  triggerClassName="rounded-xl bg-rose-500/80 px-3 py-2 text-sm font-medium text-white hover:bg-rose-500"
                  onConfirm={async () => {
                    const result = await deleteCreditCard(card.id);
                    if (result.ok) toast.success(result.message ?? 'Cartão arquivado com sucesso.');
                    else toast.error(result.error ?? 'Erro ao arquivar cartão.');
                  }}
                />
              </div>
            </article>
          ))
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Cartões arquivados</h3>
        {archivedCards.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhum cartão arquivado.</p>
        ) : (
          archivedCards.map((card) => (
            <div key={card.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-zinc-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{card.name}</p>
                </div>
                <button
                  type="button"
                  className="rounded-xl border border-zinc-700 px-3 py-2 text-sm font-medium hover:bg-zinc-800"
                  onClick={async () => {
                    const result = await reactivateCreditCard(card.id);
                    if (result.ok) toast.success(result.message ?? 'Cartão reativado com sucesso.');
                    else toast.error(result.error ?? 'Erro ao reativar cartão.');
                  }}
                >
                  Reativar
                </button>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
