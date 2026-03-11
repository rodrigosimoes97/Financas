import { addMonthsUTC, formatDateISO, startOfMonthUTC } from '@/lib/domain/date';
import { fromCents, toCents } from '@/lib/domain/money';
export function validateInstallments(count: number) { if (!Number.isInteger(count) || count < 1 || count > 36) throw new Error('Quantidade de parcelas inválida. Use um valor entre 1 e 36.'); }
export function splitInstallments(totalAmount: number, count: number): number[] { validateInstallments(count); const cents = toCents(totalAmount); const base = Math.floor(cents / count); const remainder = cents - base * count; return Array.from({ length: count }).map((_, index) => fromCents(base + (index === count - 1 ? remainder : 0))); }
export function generateInstallmentMonths(firstDateISO: string, count: number): string[] { validateInstallments(count); const start = startOfMonthUTC(firstDateISO); return Array.from({ length: count }).map((_, index) => formatDateISO(addMonthsUTC(start, index))); }
