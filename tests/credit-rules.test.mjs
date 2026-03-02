import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveInvoiceReferenceMonth, splitInstallments } from '../lib/services/credit-rules.js';

const iso = (d) => d.toISOString().slice(0, 10);

test('compra até dia de fechamento entra no mês atual', () => {
  const ref = resolveInvoiceReferenceMonth('2026-03-10', 12);
  assert.equal(iso(ref), '2026-03-01');
});

test('compra após dia de fechamento entra no mês seguinte', () => {
  const ref = resolveInvoiceReferenceMonth('2026-03-20', 12);
  assert.equal(iso(ref), '2026-04-01');
});

test('parcelamento fecha total com ajuste na última parcela', () => {
  const values = splitInstallments(100, 3);
  const total = values.reduce((s, v) => s + v, 0);
  assert.equal(values.length, 3);
  assert.equal(Number(total.toFixed(2)), 100);
});
