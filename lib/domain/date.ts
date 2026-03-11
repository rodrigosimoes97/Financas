export function parseMonthToDate(month: string): Date | null { if (!/^\d{4}-\d{2}$/.test(month)) return null; const [year, monthNumber] = month.split('-').map(Number); return new Date(Date.UTC(year, monthNumber - 1, 1)); }
export function startOfMonthUTC(input: Date | string): Date { const date = typeof input === 'string' ? new Date(`${input}T00:00:00.000Z`) : input; return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)); }
export function endOfMonthUTC(input: Date | string): Date { const start = startOfMonthUTC(input); return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)); }
export function addMonthsUTC(input: Date, amount: number): Date { return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth() + amount, 1)); }
export function formatDateISO(date: Date): string { return date.toISOString().slice(0, 10); }
