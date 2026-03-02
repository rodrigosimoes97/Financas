-- up
create table if not exists public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  closing_day int not null check (closing_day between 1 and 28),
  due_day int not null check (due_day between 1 and 28),
  limit_amount numeric(12,2),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  credit_card_id uuid not null references public.credit_cards(id) on delete cascade,
  reference_month date not null,
  closing_date date not null,
  due_date date not null,
  total_amount numeric(12,2) not null default 0,
  status text not null default 'open' check (status in ('open','closed','paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(credit_card_id, reference_month)
);

create table if not exists public.installment_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credit_card_id uuid not null references public.credit_cards(id) on delete cascade,
  purchase_date date not null,
  description text,
  total_amount numeric(12,2) not null check (total_amount > 0),
  total_installments int not null check (total_installments > 1),
  created_at timestamptz not null default now()
);

alter table public.transactions
  add column if not exists credit_card_id uuid references public.credit_cards(id) on delete set null,
  add column if not exists invoice_id uuid references public.invoices(id) on delete set null,
  add column if not exists installment_group_id uuid references public.installment_groups(id) on delete set null,
  add column if not exists installment_number int,
  add column if not exists total_installments int;

create index if not exists idx_transactions_user_date on public.transactions(user_id, date);
create index if not exists idx_transactions_invoice on public.transactions(invoice_id);
create index if not exists idx_transactions_installment_group on public.transactions(installment_group_id);
create index if not exists idx_invoices_card_month on public.invoices(credit_card_id, reference_month);
create index if not exists idx_installment_groups_user on public.installment_groups(user_id, created_at desc);

alter table public.credit_cards enable row level security;
alter table public.invoices enable row level security;
alter table public.installment_groups enable row level security;

create policy "credit_cards_select_own" on public.credit_cards for select using (auth.uid() = user_id);
create policy "credit_cards_insert_own" on public.credit_cards for insert with check (auth.uid() = user_id);
create policy "credit_cards_update_own" on public.credit_cards for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "credit_cards_delete_own" on public.credit_cards for delete using (auth.uid() = user_id);

create policy "invoices_select_own" on public.invoices for select using (
  exists (select 1 from public.credit_cards c where c.id = invoices.credit_card_id and c.user_id = auth.uid())
);
create policy "invoices_insert_own" on public.invoices for insert with check (
  exists (select 1 from public.credit_cards c where c.id = invoices.credit_card_id and c.user_id = auth.uid())
);
create policy "invoices_update_own" on public.invoices for update using (
  exists (select 1 from public.credit_cards c where c.id = invoices.credit_card_id and c.user_id = auth.uid())
) with check (
  exists (select 1 from public.credit_cards c where c.id = invoices.credit_card_id and c.user_id = auth.uid())
);
create policy "invoices_delete_own" on public.invoices for delete using (
  exists (select 1 from public.credit_cards c where c.id = invoices.credit_card_id and c.user_id = auth.uid())
);

create policy "installment_groups_select_own" on public.installment_groups for select using (auth.uid() = user_id);
create policy "installment_groups_insert_own" on public.installment_groups for insert with check (auth.uid() = user_id);
create policy "installment_groups_update_own" on public.installment_groups for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "installment_groups_delete_own" on public.installment_groups for delete using (auth.uid() = user_id);

-- down (manual)
-- drop table if exists public.installment_groups;
-- drop table if exists public.invoices;
-- drop table if exists public.credit_cards;
