-- Goals normalization + dashboard support for expense by category

update public.goals
set target_amount = monthly_limit
where type = 'SPEND_LIMIT'
  and coalesce(target_amount, 0) = 0
  and coalesce(monthly_limit, 0) > 0;

alter table public.goals
  alter column target_amount set default 0;

update public.goals
set target_amount = 0
where target_amount is null;

alter table public.goals
  alter column target_amount set not null;

DO $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'goals_target_amount_non_negative'
      and conrelid = 'public.goals'::regclass
  ) then
    alter table public.goals
      add constraint goals_target_amount_non_negative check (target_amount >= 0);
  end if;
end $$;

create unique index if not exists idx_goals_user_month_type_category_unique
  on public.goals (user_id, month, type, coalesce(category_id, '00000000-0000-0000-0000-000000000000'::uuid));

create or replace function public.get_expense_by_category(
  p_user_id uuid,
  p_month_start date,
  p_next_month_start date
)
returns table(category_id uuid, amount numeric)
language sql
security definer
set search_path = public
as $$
  select
    t.category_id,
    coalesce(sum(t.amount), 0)::numeric(12,2) as amount
  from public.transactions t
  where t.user_id = coalesce(p_user_id, auth.uid())
    and t.type = 'expense'
    and t.date >= date_trunc('month', p_month_start)::date
    and t.date < date_trunc('month', p_next_month_start)::date
    and (t.parent_transaction_id is null or coalesce(t.is_installment, false) = true)
  group by t.category_id;
$$;

grant execute on function public.get_expense_by_category(uuid, date, date) to authenticated;
