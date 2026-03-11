import { startOfMonthUTC } from '@/lib/domain/date';
export type TransactionKind = 'income' | 'expense' | 'transfer';
export type PaymentMethodKind = 'credit' | 'debit' | 'pix' | 'cash' | 'transfer';
export function classifyTransaction(type: 'income' | 'expense', paymentMethod?: string): TransactionKind { if (paymentMethod === 'transfer') return 'transfer'; return type; }
export function getCompetencyMonth(transactionDate: string): string { return startOfMonthUTC(transactionDate).toISOString().slice(0, 10); }
export function impactsOperationalBalance(paymentMethod?: string): boolean { return paymentMethod !== 'transfer'; }
