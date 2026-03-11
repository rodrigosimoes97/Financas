export const MONEY_SCALE = 100;

export function toCents(value: number | string): number {
  const numeric = typeof value === 'string' ? Number(value.replace(',', '.')) : value;
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * MONEY_SCALE);
}

export function fromCents(cents: number): number {
  return Number((cents / MONEY_SCALE).toFixed(2));
}

export function normalizeMoney(value: number | string): number {
  return fromCents(toCents(value));
}

export function addMoney(...values: Array<number | string>): number {
  const centsTotal = values.reduce<number>((acc, value) => acc + toCents(value), 0);
  return fromCents(centsTotal);
}

export function subtractMoney(initial: number | string, ...values: Array<number | string>): number {
  const centsTotal = values.reduce<number>((acc, value) => acc - toCents(value), toCents(initial));
  return fromCents(centsTotal);
}
