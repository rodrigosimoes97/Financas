-- Goals refactor: unified goals table + contributions + automatic recalculation

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.goals
  add column if not exists name text,
  add column if not exists deadline date,
  add column if not exists status text not null default 'ACTIVE',
  add column if not exists notes text,
  add column if not exists updated_at timestamptz not null default now();

-- Legacy compatibility: keep monthly_limit while moving canonical value to target_amount
update public.goals
set target_amount = coalesce(nullif(target_amount, 0), monthly_limit, 0)
where coalesce(target_amount, 0) = 0;

update public.goals
set monthly_limit = target_amount
where type = 'SPEND_LIMIT';

alter table public.goals
  alter column category_id drop not null,
  alter column month drop not null;

alter table public.goals
  drop constraint if exists goals_type_check;

alter table public.goals
  add constraint goals_type_check check (type in ('SAVINGS_GOAL', 'SPEND_LIMIT'));

alter table public.goals
  drop constraint if exists goals_status_check;

alter table public.goals
  add constraint goals_status_check check (status in ('ACTIVE', 'COMPLETED', 'ARCHIVED'));

alter table public.goals
  drop constraint if exists goals_target_amount_positive;

alter table public.goals
  add constraint goals_target_amount_positive check (target_amount > 0);

alter table public.goals
  drop constraint if exists goals_current_amount_non_negative;

alter table public.goals
  add constraint goals_current_amount_non_negative check (current_amount >= 0);

alter table public.goals
  drop constraint if exists goals_type_business_rules_check;

alter table public.goals
  add constraint goals_type_business_rules_check check (
    (type = 'SPEND_LIMIT' and category_id is not null and month is not null)
    or
    (type = 'SAVINGS_GOAL' and nullif(trim(name), '') is not null)
  );

create unique index if not exists idx_goals_spend_limit_unique_per_month
  on public.goals (user_id, category_id, month)
  where type = 'SPEND_LIMIT' and status <> 'ARCHIVED';

create index if not exists idx_goals_user_type_status on public.goals(user_id, type, status);
create index if not exists idx_goals_user_month on public.goals(user_id, month) where month is not null;
create index if not exists idx_goals_user_deadline on public.goals(user_id, deadline) where deadline is not null;

-- Remove older permissive unique index that can conflict with the partial uniqueness above.
drop index if exists idx_goals_user_month_type_category_unique;

create trigger trg_goals_set_updated_at
before update on public.goals
for each row
execute function public.set_updated_at();

create table if not exists public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  contribution_date date not null default current_date,
  source_account_id uuid references public.accounts(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.goal_contributions enable row level security;

DO $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='goal_contributions' and policyname='goal_contributions_select_own') then
    create policy "goal_contributions_select_own" on public.goal_contributions for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='goal_contributions' and policyname='goal_contributions_insert_own') then
    create policy "goal_contributions_insert_own" on public.goal_contributions for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='goal_contributions' and policyname='goal_contributions_update_own') then
    create policy "goal_contributions_update_own" on public.goal_contributions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='goal_contributions' and policyname='goal_contributions_delete_own') then
    create policy "goal_contributions_delete_own" on public.goal_contributions for delete using (auth.uid() = user_id);
  end if;
end $$;

create index if not exists idx_goal_contributions_goal_date on public.goal_contributions(goal_id, contribution_date desc);
create index if not exists idx_goal_contributions_user_goal on public.goal_contributions(user_id, goal_id);

create or replace function public.recalculate_savings_goal_current_amount(p_goal_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.goals g
  set
    current_amount = coalesce((
      select sum(c.amount)::numeric(14,2)
      from public.goal_contributions c
      where c.goal_id = g.id
    ), 0),
    monthly_limit = case when g.type = 'SPEND_LIMIT' then g.target_amount else g.monthly_limit end,
    status = case
      when g.type = 'SAVINGS_GOAL' and coalesce((select sum(c.amount) from public.goal_contributions c where c.goal_id = g.id), 0) >= g.target_amount then 'COMPLETED'
      when g.status = 'COMPLETED' and g.type = 'SAVINGS_GOAL' then 'ACTIVE'
      else g.status
    end,
    updated_at = now()
  where g.id = p_goal_id
    and g.type = 'SAVINGS_GOAL';
end;
$$;

grant execute on function public.recalculate_savings_goal_current_amount(uuid) to authenticated;

create or replace function public.calculate_spend_limit_current_amount(
  p_user_id uuid,
  p_category_id uuid,
  p_month date
)
returns numeric
language sql
security definer
set search_path = public
as $$
  with month_limits as (
    select date_trunc('month', p_month)::date as month_start,
           (date_trunc('month', p_month) + interval '1 month')::date as next_month_start
  ),
  expense_rows as (
    select t.amount
    from public.transactions t
    left join public.invoices i on i.id = t.invoice_id
    cross join month_limits m
    where t.user_id = p_user_id
      and t.type = 'expense'
      and t.category_id = p_category_id
      and coalesce(t.payment_method, '') <> 'transfer'
      and (t.parent_transaction_id is null or coalesce(t.is_installment, false) = true)
      and (
        (coalesce(t.payment_method, '') = 'credit' and coalesce(i.reference_month, t.invoice_month, date_trunc('month', t.date)::date) = m.month_start)
        or
        (coalesce(t.payment_method, '') <> 'credit' and t.date >= m.month_start and t.date < m.next_month_start)
      )
  )
  select coalesce(sum(amount), 0)::numeric(14,2)
  from expense_rows;
$$;

grant execute on function public.calculate_spend_limit_current_amount(uuid, uuid, date) to authenticated;

create or replace function public.recalculate_spend_limits_for_month(
  p_user_id uuid,
  p_month date default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  r record;
begin
  for r in
    select g.id, g.user_id, g.category_id, g.month
    from public.goals g
    where g.type = 'SPEND_LIMIT'
      and g.status = 'ACTIVE'
      and g.user_id = coalesce(p_user_id, auth.uid())
      and (p_month is null or g.month = date_trunc('month', p_month)::date)
  loop
    update public.goals g
    set
      current_amount = public.calculate_spend_limit_current_amount(r.user_id, r.category_id, r.month),
      monthly_limit = g.target_amount,
      updated_at = now()
    where g.id = r.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.recalculate_spend_limits_for_month(uuid, date) to authenticated;

create or replace function public.sync_goal_current_amount_from_contributions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_goal_id uuid;
begin
  v_goal_id := coalesce(new.goal_id, old.goal_id);
  perform public.recalculate_savings_goal_current_amount(v_goal_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_goal_contributions_sync_goal on public.goal_contributions;
create trigger trg_goal_contributions_sync_goal
after insert or update or delete on public.goal_contributions
for each row
execute function public.sync_goal_current_amount_from_contributions();

-- Backfill legacy goal types
update public.goals
set type = 'SAVINGS_GOAL'
where type in ('SAVE', 'INVESTMENT');

-- Ensure savings goals are aligned with historical contributions when they exist.
update public.goals g
set current_amount = coalesce(c.total, g.current_amount)
from (
  select goal_id, sum(amount)::numeric(14,2) as total
  from public.goal_contributions
  group by goal_id
) c
where g.id = c.goal_id
  and g.type = 'SAVINGS_GOAL';
