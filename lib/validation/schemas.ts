import { normalizeMoney } from '@/lib/domain/money';
import { PaymentMethodKind } from '@/lib/domain/transactions';

const PAYMENT_METHODS: PaymentMethodKind[] = ['cash', 'credit', 'debit', 'pix', 'transfer'];
const TRANSACTION_TYPES = ['income', 'expense'] as const;

export type ValidatedTransactionInput = {
  account_id: string;
  category_id: string;
  amount: number;
  type: (typeof TRANSACTION_TYPES)[number];
  payment_method: PaymentMethodKind;
  description: string;
  date: string;
  credit_card_id?: string | null;
  is_installment: boolean;
  total_installments: number;
};

const sanitizeText = (value: unknown) => String(value ?? '').trim().slice(0, 280);

export function parseMonthFilter(value: string): string | null {
  return /^\d{4}-\d{2}$/.test(value) ? value : null;
}

export function parseTransactionForm(formData: FormData): { ok: true; data: ValidatedTransactionInput } | { ok: false; error: string } {
  const account_id = String(formData.get('account_id') ?? '').trim();
  const category_id = String(formData.get('category_id') ?? '').trim();
  const amount = normalizeMoney(String(formData.get('amount') ?? 0));
  const type = String(formData.get('type') ?? '').trim();
  const payment_method = String(formData.get('payment_method') ?? '').trim() as PaymentMethodKind;
  const date = String(formData.get('date') ?? '').trim();
  const description = sanitizeText(formData.get('description'));
  const credit_card_id = String(formData.get('credit_card_id') ?? '').trim() || null;
  const is_installment = String(formData.get('is_installment') ?? 'false') === 'true';
  const total_installments = Number(formData.get('total_installments') ?? 1);

  if (!account_id || !category_id || !date) return { ok: false, error: 'Conta, categoria e data são obrigatórias.' };
  if (!TRANSACTION_TYPES.includes(type as never)) return { ok: false, error: 'Tipo de transação inválido.' };
  if (!PAYMENT_METHODS.includes(payment_method)) return { ok: false, error: 'Forma de pagamento inválida.' };
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Informe um valor válido maior que zero.' };
  if (is_installment && (!Number.isInteger(total_installments) || total_installments < 2 || total_installments > 36)) {
    return { ok: false, error: 'Parcelamento inválido (2 a 36).' };
  }
  if (payment_method === 'credit' && !credit_card_id) return { ok: false, error: 'Selecione um cartão de crédito.' };

  return {
    ok: true,
    data: {
      account_id,
      category_id,
      amount,
      type: type as (typeof TRANSACTION_TYPES)[number],
      payment_method,
      description,
      date,
      credit_card_id,
      is_installment,
      total_installments: is_installment ? total_installments : 1
    }
  };
}
