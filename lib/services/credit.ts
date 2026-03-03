import { createClient } from '@/lib/supabase/server';

type CreditCard = {
  id: string;
  user_id: string;
  name: string;
  closing_day: number;
  due_day: number;
  limit_amount: number | null;
};

type PurchaseInput = {
  user_id: string;
  account_id: string;
  category_id: string;
  description: string;
  amount_total: number;
  purchase_date: string;
  credit_card_id: string;
  is_installment: boolean;
  total_installments?: number;
};

export const monthStart = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

export const addMonths = (date: Date, count: number) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + count, 1));

export const toISODate = (date: Date) => date.toISOString().slice(0, 10);

export function resolveInvoiceReferenceMonth(purchaseDateISO: string, closingDay: number) {
  const purchaseDate = new Date(`${purchaseDateISO}T00:00:00.000Z`);
  const base = monthStart(purchaseDate);
  return purchaseDate.getUTCDate() <= closingDay ? base : addMonths(base, 1);
}

export function splitInstallments(total: number, count: number) {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / count);
  const remainder = cents - base * count;
  return Array.from({ length: count }).map((_, idx) => (base + (idx === count - 1 ? remainder : 0)) / 100);
}

export async function recalcInvoiceTotal(invoiceId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('transactions')
    .select('amount')
    .eq('invoice_id', invoiceId)
    .eq('payment_method', 'credit')
    .eq('type', 'expense');

  const total = (data ?? []).reduce((sum, row) => sum + Number(row.amount), 0);
  await supabase.from('invoices').update({ total_amount: total }).eq('id', invoiceId);
}

export async function getOrCreateInvoice(creditCard: CreditCard, referenceMonth: Date) {
  const supabase = await createClient();
  const referenceMonthISO = toISODate(referenceMonth);

  const { data: existing } = await supabase
    .from('invoices')
    .select('*')
    .eq('credit_card_id', creditCard.id)
    .eq('reference_month', referenceMonthISO)
    .maybeSingle();

  if (existing) return existing;

  const closingDate = new Date(Date.UTC(referenceMonth.getUTCFullYear(), referenceMonth.getUTCMonth(), creditCard.closing_day));
  const dueDateBase = new Date(Date.UTC(referenceMonth.getUTCFullYear(), referenceMonth.getUTCMonth() + 1, 1));
  const dueDate = new Date(Date.UTC(dueDateBase.getUTCFullYear(), dueDateBase.getUTCMonth(), creditCard.due_day));

  const { data: created, error } = await supabase
    .from('invoices')
    .insert({
      credit_card_id: creditCard.id,
      reference_month: referenceMonthISO,
      closing_date: toISODate(closingDate),
      due_date: toISODate(dueDate),
      status: 'open',
      total_amount: 0
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return created;
}

export async function createCreditPurchase(input: PurchaseInput) {
  const supabase = await createClient();
  const { data: creditCard, error: cardError } = await supabase
    .from('credit_cards')
    .select('*')
    .eq('id', input.credit_card_id)
    .eq('user_id', input.user_id)
    .is('archived_at', null)
    .single();

  if (cardError || !creditCard) throw new Error(cardError?.message ?? 'Cartão não encontrado.');

  if (!input.is_installment) {
    const refMonth = resolveInvoiceReferenceMonth(input.purchase_date, creditCard.closing_day);
    const invoice = await getOrCreateInvoice(creditCard as CreditCard, refMonth);

    const { error } = await supabase.from('transactions').insert({
      user_id: input.user_id,
      account_id: input.account_id,
      category_id: input.category_id,
      description: input.description,
      amount: input.amount_total,
      type: 'expense',
      payment_method: 'credit',
      credit_card_id: input.credit_card_id,
      invoice_id: invoice.id,
      date: input.purchase_date
    });

    if (error) throw new Error(error.message);
    await recalcInvoiceTotal(invoice.id);

    return {
      invoice_first_month: invoice.reference_month,
      invoice_last_month: invoice.reference_month,
      installments: [{ month: invoice.reference_month, value: input.amount_total }]
    };
  }

  const installmentsCount = input.total_installments ?? 2;
  const installmentValues = splitInstallments(input.amount_total, installmentsCount);

  const { data: group, error: groupError } = await supabase
    .from('installment_groups')
    .insert({
      user_id: input.user_id,
      credit_card_id: input.credit_card_id,
      purchase_date: input.purchase_date,
      description: input.description,
      total_amount: input.amount_total,
      total_installments: installmentsCount
    })
    .select('*')
    .single();

  if (groupError || !group) throw new Error(groupError?.message ?? 'Erro ao criar parcelamento.');

  const firstRefMonth = resolveInvoiceReferenceMonth(input.purchase_date, creditCard.closing_day);
  const parcels: { month: string; value: number }[] = [];

  for (let i = 0; i < installmentsCount; i++) {
    const refMonth = addMonths(firstRefMonth, i);
    const invoice = await getOrCreateInvoice(creditCard as CreditCard, refMonth);
    const installmentDate = toISODate(new Date(Date.UTC(refMonth.getUTCFullYear(), refMonth.getUTCMonth(), 1)));

    const { error } = await supabase.from('transactions').insert({
      user_id: input.user_id,
      account_id: input.account_id,
      category_id: input.category_id,
      description: `${input.description} (${i + 1}/${installmentsCount})`,
      amount: installmentValues[i],
      type: 'expense',
      payment_method: 'credit',
      credit_card_id: input.credit_card_id,
      invoice_id: invoice.id,
      installment_group_id: group.id,
      installment_number: i + 1,
      total_installments: installmentsCount,
      date: installmentDate
    });

    if (error) throw new Error(error.message);
    await recalcInvoiceTotal(invoice.id);
    parcels.push({ month: invoice.reference_month, value: installmentValues[i] });
  }

  return {
    invoice_first_month: parcels[0]?.month,
    invoice_last_month: parcels[parcels.length - 1]?.month,
    installments: parcels
  };
}

export async function simulateCreditPurchase(input: PurchaseInput) {
  const supabase = await createClient();
  const { data: card } = await supabase
    .from('credit_cards')
    .select('*')
    .eq('id', input.credit_card_id)
    .eq('user_id', input.user_id)
    .is('archived_at', null)
    .single();

  if (!card) throw new Error('Cartão não encontrado.');

  const count = input.is_installment ? (input.total_installments ?? 2) : 1;
  const values = input.is_installment ? splitInstallments(input.amount_total, count) : [input.amount_total];
  const firstRef = resolveInvoiceReferenceMonth(input.purchase_date, card.closing_day);

  const rows = [] as Array<{ month: string; total_before: number; total_after: number; delta: number }>;

  for (let i = 0; i < values.length; i++) {
    const ref = addMonths(firstRef, i);
    const refISO = toISODate(ref);

    const { data: inv } = await supabase
      .from('invoices')
      .select('total_amount')
      .eq('credit_card_id', card.id)
      .eq('reference_month', refISO)
      .maybeSingle();

    const before = Number(inv?.total_amount ?? 0);
    const delta = values[i];
    const after = before + delta;

    rows.push({ month: refISO, total_before: before, total_after: after, delta });
  }

  const first = rows[0];
  const util = card.limit_amount
    ? {
        percent_before: (first.total_before / Number(card.limit_amount)) * 100,
        percent_after: (first.total_after / Number(card.limit_amount)) * 100
      }
    : null;

  return {
    invoice_first_month: first,
    next_months: rows,
    utilization_if_limit_known: util
  };
}
