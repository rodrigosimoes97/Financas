export function monthStart(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function addMonths(date, count) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + count, 1));
}

export function resolveInvoiceReferenceMonth(purchaseDateISO, closingDay) {
  const purchaseDate = new Date(`${purchaseDateISO}T00:00:00.000Z`);
  const base = monthStart(purchaseDate);
  return purchaseDate.getUTCDate() <= closingDay ? base : addMonths(base, 1);
}

export function splitInstallments(total, count) {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / count);
  const remainder = cents - base * count;
  return Array.from({ length: count }).map((_, idx) => (base + (idx === count - 1 ? remainder : 0)) / 100);
}

export function buildSimulationRows({ beforeByMonth, firstMonthISO, installments, limitAmount }) {
  const firstDate = new Date(`${firstMonthISO}T00:00:00.000Z`);
  return installments.map((delta, idx) => {
    const month = addMonths(firstDate, idx).toISOString().slice(0, 10);
    const before = Number(beforeByMonth[month] ?? 0);
    const after = before + Number(delta);
    return {
      month,
      total_before: before,
      total_after: Number(after.toFixed(2)),
      delta: Number(Number(delta).toFixed(2)),
      exceeds_limit: limitAmount ? after > limitAmount : false
    };
  });
}
