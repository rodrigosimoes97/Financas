'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useMemo, useRef, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { createTransaction } from '@/lib/actions/transactions';
import { simulateCreditPurchaseAction } from '@/lib/actions/credit';
import { Account, Category } from '@/types/models';
import { ptBR } from '@/lib/i18n/pt-BR';
import { useToast } from '@/components/ui/toast';
import { SubmitButton } from '@/components/ui/submit-button';
import { formatCurrencyBRL, formatMonthBR } from '@/lib/utils';

interface CreditCardOption {
  id: string;
  name: string;
  closing_day: number;
  due_day: number;
  limit_amount: number | null;
}

interface SimulationMonth {
  month: string;
  total_before: number;
  total_after: number;
  delta: number;
}

interface SimulationResult {
  invoice_first_month?: SimulationMonth;
  next_months?: SimulationMonth[];
}

interface QuickAddTransactionProps {
  accounts: Account[];
  categories: Category[];
  creditCards?: CreditCardOption[];
}

export function QuickAddTransaction({ accounts, categories, creditCards = [] }: QuickAddTransactionProps) {
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [isInstallment, setIsInstallment] = useState(false);
  const [installments, setInstallments] = useState(2);
  const [purchaseDate, setPurchaseDate] = useState('');
  const [amount, setAmount] = useState(0);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();
  const hasSingleAccount = accounts.length === 1;
  const isCredit = paymentMethod === 'credit';

  const validate = (formData: FormData) => {
    const amountValue = Number(formData.get('amount'));
    const date = String(formData.get('date') || '');
    const account = String(formData.get('account_id') || '');
    const category = String(formData.get('category_id') || '');

    if (!amountValue || !date || !account || !category) {
      setError(ptBR.modal.validation);
      return false;
    }
    if (isCredit && !String(formData.get('credit_card_id') || '')) {
      setError('Selecione um cartão de crédito.');
      return false;
    }
    setError('');
    return true;
  };

  const monthFrom = (date: string, add = 0) => {
    const d = new Date(`${date}T00:00:00`);
    d.setMonth(d.getMonth() + add);
    return formatMonthBR(d);
  };

  const monthlyValue = useMemo(() => {
    if (!amount) return 0;
    return isInstallment ? amount / installments : amount;
  }, [amount, isInstallment, installments]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-medium text-emerald-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-300">
        <Plus size={16} />
        {ptBR.actions.newTransaction}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[95vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
          <Dialog.Title className="text-xl font-semibold">{ptBR.modal.title}</Dialog.Title>
          <p className="mt-1 text-sm text-zinc-400">{ptBR.hints.quickAdd}</p>
          <form
            ref={formRef}
            action={async (formData) => {
              if (hasSingleAccount) formData.set('account_id', accounts[0].id);
              formData.set('is_installment', String(isCredit && isInstallment));
              formData.set('total_installments', String(isInstallment ? installments : 1));
              if (!validate(formData)) return;

              const result = await createTransaction(formData);
              if (result.ok) {
                formRef.current?.reset();
                setSimulation(null);
                setPaymentMethod('pix');
                setIsInstallment(false);
                setInstallments(2);
                setPurchaseDate('');
                setAmount(0);
                toast.success(result.message ?? 'Cadastro realizado com sucesso.');
                setOpen(false);
              } else {
                toast.error(result.error ?? 'Ocorreu um erro ao salvar.');
              }
            }}
            className="mt-4 grid gap-3"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm">{ptBR.labels.description}<input name="description" placeholder="Ex.: Mercado" className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5" /></label>
              <label className="grid gap-1 text-sm">{ptBR.labels.amount}<input name="amount" type="number" step="0.01" required onChange={(e) => setAmount(Number(e.target.value || 0))} className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5" /></label>
              <label className="grid gap-1 text-sm">{ptBR.labels.date}<input name="date" type="date" required onChange={(e) => setPurchaseDate(e.target.value)} className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5" /></label>
              <label className="grid gap-1 text-sm">{ptBR.labels.type}<select name="type" defaultValue="expense" className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5"><option value="income">Receita</option><option value="expense">Despesa</option></select></label>
              {!hasSingleAccount ? (
                <label className="grid gap-1 text-sm">{ptBR.labels.account}<select name="account_id" required className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5">{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
              ) : (
                <input type="hidden" name="account_id" value={accounts[0]?.id ?? ''} />
              )}
              <label className="grid gap-1 text-sm">{ptBR.labels.category}<select name="category_id" required className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <label className="grid gap-1 text-sm">{ptBR.labels.paymentMethod}<select name="payment_method" defaultValue="pix" onChange={(e) => setPaymentMethod(e.target.value)} className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5"><option value="credit">{ptBR.paymentMethod.credit}</option><option value="debit">{ptBR.paymentMethod.debit}</option><option value="pix">{ptBR.paymentMethod.pix}</option><option value="cash">{ptBR.paymentMethod.cash}</option></select></label>

              {isCredit && (
                <>
                  <label className="grid gap-1 text-sm">Cartão<select name="credit_card_id" className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5">{creditCards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select></label>
                  <label className="grid gap-1 text-sm">Parcelado?
                    <select value={isInstallment ? 'sim' : 'nao'} onChange={(e) => setIsInstallment(e.target.value === 'sim')} className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5"><option value="nao">Não</option><option value="sim">Sim</option></select>
                  </label>
                  {isInstallment && (
                    <label className="grid gap-1 text-sm">Número de parcelas
                      <input type="number" min={2} max={36} value={installments} onChange={(e) => setInstallments(Number(e.target.value || 2))} className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5" />
                    </label>
                  )}
                </>
              )}
            </div>

            {isCredit && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-sm">
                <p>Primeira parcela entra na fatura: <b>{purchaseDate ? monthFrom(purchaseDate) : '-'}</b></p>
                <p>Última parcela: <b>{purchaseDate ? monthFrom(purchaseDate, isInstallment ? installments - 1 : 0) : '-'}</b></p>
                <p>Valor mensal: <b>{formatCurrencyBRL(monthlyValue)}</b></p>
              </div>
            )}

            {simulation?.next_months && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-sm">
                <p className="mb-2 font-medium">Simulação de impacto</p>
                {simulation.next_months.slice(0, 12).map((row) => (
                  <div key={row.month} className="flex justify-between text-zinc-300">
                    <span>{formatMonthBR(row.month)}</span>
                    <span>+{formatCurrencyBRL(Number(row.delta))} → {formatCurrencyBRL(Number(row.total_after))}</span>
                  </div>
                ))}
              </div>
            )}

            {error && <p className="rounded-xl border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>}

            <div className="flex justify-between gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (!formRef.current) return;
                  const fd = new FormData(formRef.current);
                  if (hasSingleAccount) fd.set('account_id', accounts[0].id);
                  fd.set('is_installment', String(isCredit && isInstallment));
                  fd.set('total_installments', String(isInstallment ? installments : 1));
                  const sim = await simulateCreditPurchaseAction(fd);
                  if (sim.ok) setSimulation((sim.data as SimulationResult) ?? null);
                  else toast.error(sim.error ?? 'Erro na simulação.');
                }}
                className="rounded-xl border border-zinc-700 px-3 py-2.5 text-sm hover:bg-zinc-800"
              >
                Simular impacto
              </button>
              <SubmitButton className="rounded-xl bg-emerald-400 px-3 py-2.5 font-medium text-emerald-950 hover:bg-emerald-300">{ptBR.actions.save}</SubmitButton>
            </div>
          </form>
          <Dialog.Close className="absolute right-4 top-4 rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"><X size={18} /></Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
