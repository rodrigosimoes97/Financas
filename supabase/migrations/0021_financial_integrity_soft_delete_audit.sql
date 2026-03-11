-- Production hardening: constraints, indexes, soft delete and audit trail

alter table public.transactions
  add column if not exists deleted_at timestamptz,
  add column if not exists competency_month date,
  add column if not exists effective_date date,
  add column if not exists posted_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.invoices
  add column if not exists deleted_at timestamptz;

create index if not exists idx_transactions_user_date_active
  on public.transactions(user_id, date desc)
  where deleted_at is null;

create index if not exists idx_transactions_user_competency_active
  on public.transactions(user_id, competency_month)
  where deleted_at is null;

create index if not exists idx_transactions_user_category_active
  on public.transactions(user_id, category_id)
  where deleted_at is null;

create index if not exists idx_transactions_user_account_active
  on public.transactions(user_id, account_id)
  where deleted_at is null;

create index if not exists idx_transactions_user_card_active
  on public.transactions(user_id, credit_card_id)
  where deleted_at is null;

create index if not exists idx_transactions_invoice_active
  on public.transactions(invoice_id)
  where deleted_at is null;

create index if not exists idx_transactions_installment_group_active
  on public.transactions(installment_group_id)
  where deleted_at is null;

create index if not exists idx_invoices_reference_month_active
  on public.invoices(reference_month)
  where deleted_at is null;

alter table public.transactions
  drop constraint if exists transactions_installment_index_check;

alter table public.transactions
  add constraint transactions_installment_index_check
  check (
    installment_index is null
    or (
      coalesce(total_installments, installments_total) is not null
      and coalesce(total_installments, installments_total) >= 1
      and installment_index >= 1
      and installment_index <= coalesce(total_installments, installments_total)
    )
  );

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

DO $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='audit_log' and policyname='audit_log_select_own') then
    create policy "audit_log_select_own" on public.audit_log for select using (auth.uid() = user_id);
  end if;
end $$;

create or replace function public.tg_set_transactions_defaults()
returns trigger
language plpgsql
as $$
begin
  new.competency_month := coalesce(new.competency_month, date_trunc('month', coalesce(new.date, current_date))::date);
  new.effective_date := coalesce(new.effective_date, new.date);
  return new;
end;
$$;

drop trigger if exists trg_transactions_defaults on public.transactions;
create trigger trg_transactions_defaults
before insert or update on public.transactions
for each row execute function public.tg_set_transactions_defaults();

create or replace function public.tg_audit_transactions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log(user_id, entity_type, entity_id, action, new_data)
    values (new.user_id, 'transaction', new.id, 'create', to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    if new.deleted_at is not null and old.deleted_at is null then
      insert into public.audit_log(user_id, entity_type, entity_id, action, old_data, new_data)
      values (new.user_id, 'transaction', new.id, 'soft_delete', to_jsonb(old), to_jsonb(new));
    else
      insert into public.audit_log(user_id, entity_type, entity_id, action, old_data, new_data)
      values (new.user_id, 'transaction', new.id, 'update', to_jsonb(old), to_jsonb(new));
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_log(user_id, entity_type, entity_id, action, old_data)
    values (old.user_id, 'transaction', old.id, 'delete', to_jsonb(old));
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_audit_transactions on public.transactions;
create trigger trg_audit_transactions
after insert or update or delete on public.transactions
for each row execute function public.tg_audit_transactions();
