import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveInvoiceReferenceMonth, splitInstallments, buildSimulationRows } from '../lib/services/credit-rules.js';

const iso = (d) => d.toISOString().slice(0, 10);

test('compra até dia de fechamento entra no mês atual', () => {
  const ref = resolveInvoiceReferenceMonth('2026-03-12', 12);
  assert.equal(iso(ref), '2026-03-01');
});

test('compra após dia de fechamento entra no mês seguinte', () => {
  const ref = resolveInvoiceReferenceMonth('2026-03-20', 12);
  assert.equal(iso(ref), '2026-04-01');
});

test('regra é estável com datas no último dia do mês (evita bug UTC/local)', () => {
  const ref = resolveInvoiceReferenceMonth('2026-01-31', 10);
  assert.equal(iso(ref), '2026-02-01');
});

test('parcelado cria N parcelas e última ajusta centavos', () => {
  const values = splitInstallments(100, 3);
  const total = values.reduce((s, v) => s + v, 0);
  assert.equal(values.length, 3);
  assert.equal(Number(total.toFixed(2)), 100);
});

test('simulação retorna before/after coerentes com exceeds_limit', () => {
  const rows = buildSimulationRows({
    beforeByMonth: {
      '2026-04-01': 120,
      '2026-05-01': 80
    },
    firstMonthISO: '2026-04-01',
    installments: [50, 50],
    limitAmount: 160
  });

  assert.equal(rows.length, 2);
  assert.equal(rows[0].total_before, 120);
  assert.equal(rows[0].total_after, 170);
  assert.equal(rows[0].exceeds_limit, true);
  assert.equal(rows[1].total_before, 80);
  assert.equal(rows[1].total_after, 130);
  assert.equal(rows[1].exceeds_limit, false);
});
