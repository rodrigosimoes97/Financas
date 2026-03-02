alter table public.transactions
  add column if not exists payment_method text;

alter table public.transactions
  drop constraint if exists transactions_payment_method_check;

alter table public.transactions
  add constraint transactions_payment_method_check
  check (payment_method in ('credit', 'debit', 'pix', 'cash'));
