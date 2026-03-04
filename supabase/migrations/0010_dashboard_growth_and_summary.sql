-- Dashboard + growth foundations
alter table public.transactions
  add column if not exists invoice_month date,
  add column if not exists installment_total int,
  add column if not exists title text generated always as (coalesce(nullif(description, ''), 'Transação')) stored;

update public.transactions t
set installment_total = coalesce(t.installment_total, t.total_installments)
where t.installment_total is null;

update public.transactions t
set invoice_month = coalesce(i.reference_month, date_trunc('month', t.date)::date)
from public.invoices i
where t.invoice_id = i.id
  and t.invoice_month is null;

update public.transactions t
set invoice_month = date_trunc('month', t.date)::date
where t.invoice_month is null;

create index if not exists idx_transactions_user_month_type on public.transactions(user_id, date, type);
create index if not exists idx_transactions_user_invoice_month on public.transactions(user_id, invoice_month) where payment_method = 'credit';
create index if not exists idx_transactions_parent_installment on public.transactions(parent_transaction_id, is_installment);

create table if not exists public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  amount numeric(12,2) not null check (amount > 0),
  category_id uuid references public.categories(id) on delete set null,
  account_id uuid references public.accounts(id) on delete set null,
  type text not null default 'expense' check (type in ('income', 'expense')),
  payment_method text not null default 'pix' check (payment_method in ('credit', 'debit', 'pix', 'cash')),
  day_of_month int not null check (day_of_month between 1 and 28),
  active boolean not null default true,
  next_run_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.recurring_rules enable row level security;

DO $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='recurring_rules' and policyname='recurring_rules_select_own') then
    create policy "recurring_rules_select_own" on public.recurring_rules for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='recurring_rules' and policyname='recurring_rules_insert_own') then
    create policy "recurring_rules_insert_own" on public.recurring_rules for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='recurring_rules' and policyname='recurring_rules_update_own') then
    create policy "recurring_rules_update_own" on public.recurring_rules for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='recurring_rules' and policyname='recurring_rules_delete_own') then
    create policy "recurring_rules_delete_own" on public.recurring_rules for delete using (auth.uid() = user_id);
  end if;
end $$;

create index if not exists idx_recurring_rules_user_next_run on public.recurring_rules(user_id, next_run_date) where active = true;

alter table public.goals
  add column if not exists name text,
  add column if not exists target_amount numeric(12,2),
  add column if not exists current_amount numeric(12,2) not null default 0,
  add column if not exists deadline date,
  add column if not exists type text not null default 'SPEND_LIMIT' check (type in ('SAVE', 'SPEND_LIMIT'));

create or replace function public.clamp_day_to_month(p_month date, p_day int)
returns date
language sql
immutable
as $$
  select (date_trunc('month', p_month)::date + (least(greatest(p_day, 1), extract(day from ((date_trunc('month', p_month) + interval '1 month - 1 day')::date))::int) - 1));
$$;

create or replace function public.calculate_invoice_month(p_purchase_date date, p_closing_day int)
returns date
language sql
immutable
as $$
  select case
    when extract(day from p_purchase_date)::int <= p_closing_day then date_trunc('month', p_purchase_date)::date
    else (date_trunc('month', p_purchase_date) + interval '1 month')::date
  end;
$$;

create or replace function public.generate_pending_recurring_transactions(p_user_id uuid default auth.uid())
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := coalesce(p_user_id, auth.uid());
  v_rule record;
  v_created int := 0;
  v_run_date date;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado';
  end if;

  for v_rule in
    select *
    from public.recurring_rules
    where user_id = v_user_id
      and active = true
      and next_run_date <= current_date
    order by next_run_date asc
  loop
    v_run_date := v_rule.next_run_date;
    while v_run_date <= current_date loop
      if not exists (
        select 1 from public.transactions t
        where t.user_id = v_user_id
          and t.description = v_rule.title
          and t.date = v_run_date
          and t.amount = v_rule.amount
      ) then
        insert into public.transactions (
          user_id, account_id, category_id, amount, type, payment_method, description, date, invoice_month
        ) values (
          v_user_id,
          v_rule.account_id,
          v_rule.category_id,
          v_rule.amount,
          v_rule.type,
          v_rule.payment_method,
          v_rule.title,
          v_run_date,
          date_trunc('month', v_run_date)::date
        );
        v_created := v_created + 1;
      end if;
      v_run_date := (date_trunc('month', v_run_date) + interval '1 month')::date + (v_rule.day_of_month - 1);
      v_run_date := public.clamp_day_to_month(v_run_date, v_rule.day_of_month);
    end loop;

    update public.recurring_rules
    set next_run_date = v_run_date,
        updated_at = now()
    where id = v_rule.id;
  end loop;

  return v_created;
end;
$$;

grant execute on function public.generate_pending_recurring_transactions(uuid) to authenticated;

create or replace function public.create_credit_purchase(
  p_account_id uuid,
  p_category_id uuid,
  p_credit_card_id uuid,
  p_purchase_date date,
  p_description text,
  p_total_amount numeric,
  p_total_installments int default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_card record;
  v_first_ref date;
  v_group_id uuid;
  v_i int;
  v_count int;
  v_invoice record;
  v_installment_amount numeric(12,2);
  v_sum numeric(12,2) := 0;
  v_rows jsonb := '[]'::jsonb;
  v_ref_month date;
  v_parent_id uuid;
  v_installment_date date;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado';
  end if;

  select * into v_card
  from public.credit_cards
  where id = p_credit_card_id and user_id = v_user_id and is_archived = false;

  if not found then
    raise exception 'Cartão não encontrado';
  end if;

  if p_total_amount <= 0 then
    raise exception 'Valor inválido';
  end if;

  v_count := greatest(coalesce(p_total_installments, 1), 1);

  v_first_ref := public.calculate_invoice_month(p_purchase_date, v_card.closing_day);

  if v_count = 1 then
    select * into v_invoice
    from public.get_or_create_invoice(p_credit_card_id, v_first_ref);

    insert into public.transactions (
      user_id, account_id, category_id, amount, type, description, date, payment_method,
      credit_card_id, invoice_id, invoice_month, is_installment, installment_group_id, installment_number,
      installment_index, parent_transaction_id, total_installments, installment_total
    ) values (
      v_user_id,
      p_account_id,
      p_category_id,
      p_total_amount,
      'expense',
      p_description,
      p_purchase_date,
      'credit',
      p_credit_card_id,
      v_invoice.id,
      v_first_ref,
      false,
      null,
      null,
      null,
      null,
      1,
      1
    ) returning id into v_parent_id;

    return jsonb_build_object(
      'parent_transaction_id', v_parent_id,
      'invoice_first_month', v_first_ref,
      'invoice_last_month', v_first_ref,
      'installments', jsonb_build_array(jsonb_build_object('month', v_first_ref, 'value', p_total_amount))
    );
  end if;

  insert into public.transactions (
    user_id, account_id, category_id, amount, type, description, date, payment_method,
    credit_card_id, installment_group_id, total_installments, installment_total,
    parent_transaction_id, is_installment, installment_number, installment_index, invoice_id, invoice_month
  ) values (
    v_user_id,
    p_account_id,
    p_category_id,
    p_total_amount,
    'expense',
    p_description,
    p_purchase_date,
    'credit',
    p_credit_card_id,
    null,
    v_count,
    v_count,
    null,
    false,
    null,
    null,
    null,
    null
  ) returning id into v_parent_id;

  insert into public.installment_groups(user_id, credit_card_id, purchase_date, description, total_amount, total_installments)
  values (v_user_id, p_credit_card_id, p_purchase_date, p_description, p_total_amount, v_count)
  returning id into v_group_id;

  v_installment_amount := round((p_total_amount / v_count)::numeric, 2);

  for v_i in 1..v_count loop
    v_installment_date := public.clamp_day_to_month((date_trunc('month', p_purchase_date) + make_interval(months => v_i - 1))::date, extract(day from p_purchase_date)::int);
    v_ref_month := public.calculate_invoice_month(v_installment_date, v_card.closing_day);

    select * into v_invoice
    from public.get_or_create_invoice(p_credit_card_id, v_ref_month);

    if v_i = v_count then
      v_installment_amount := round((p_total_amount - v_sum)::numeric, 2);
    end if;

    insert into public.transactions (
      user_id, account_id, category_id, amount, type, description, date, payment_method,
      credit_card_id, invoice_id, invoice_month, installment_group_id, installment_number, total_installments,
      parent_transaction_id, is_installment, installment_index, installment_total
    ) values (
      v_user_id,
      p_account_id,
      p_category_id,
      v_installment_amount,
      'expense',
      p_description,
      v_installment_date,
      'credit',
      p_credit_card_id,
      v_invoice.id,
      v_ref_month,
      v_group_id,
      v_i,
      v_count,
      v_parent_id,
      true,
      v_i,
      v_count
    );

    v_sum := v_sum + v_installment_amount;
    v_rows := v_rows || jsonb_build_array(jsonb_build_object('month', v_ref_month, 'value', v_installment_amount));
  end loop;

  return jsonb_build_object(
    'parent_transaction_id', v_parent_id,
    'invoice_first_month', v_first_ref,
    'invoice_last_month', v_ref_month,
    'installments', v_rows
  );
end;
$$;

create or replace function public.get_dashboard_summary(p_user_id uuid, p_month date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := coalesce(p_user_id, auth.uid());
  v_month date := date_trunc('month', p_month)::date;
  v_next_month date := (date_trunc('month', p_month) + interval '1 month')::date;
  v_month_end date := (v_next_month - interval '1 day')::date;
  v_income numeric(12,2) := 0;
  v_expense numeric(12,2) := 0;
  v_balance numeric(12,2) := 0;
  v_cards jsonb := '[]'::jsonb;
  v_category_spend jsonb := '[]'::jsonb;
  v_upcoming jsonb := '[]'::jsonb;
  v_recent jsonb := '[]'::jsonb;
  v_free_money numeric(12,2) := 0;
  v_future_commitments numeric(12,2) := 0;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado';
  end if;

  select
    coalesce(sum(case when t.type = 'income' then t.amount else 0 end), 0),
    coalesce(sum(case when t.type = 'expense' then t.amount else 0 end), 0)
  into v_income, v_expense
  from public.transactions t
  where t.user_id = v_user_id
    and t.date >= v_month
    and t.date < v_next_month
    and (
      t.parent_transaction_id is null
      or coalesce(t.is_installment, false) = true
    );

  v_balance := v_income - v_expense;

  select coalesce(jsonb_agg(card_row order by card_row->>'card_name'), '[]'::jsonb)
  into v_cards
  from (
    select jsonb_build_object(
      'card_id', c.id,
      'card_name', c.name,
      'current_invoice_total', coalesce(sum(case when t.invoice_month = v_month then t.amount else 0 end), 0),
      'next_invoice_total', coalesce(sum(case when t.invoice_month = v_next_month then t.amount else 0 end), 0),
      'closing_date', public.clamp_day_to_month(v_month, c.closing_day),
      'due_date', public.clamp_day_to_month(v_next_month, c.due_day),
      'limit_used', coalesce(sum(case when t.invoice_month = v_next_month then t.amount else 0 end), 0),
      'limit_available', case when c.limit_amount is null then null else greatest(c.limit_amount - coalesce(sum(case when t.invoice_month = v_next_month then t.amount else 0 end), 0), 0) end
    ) as card_row
    from public.credit_cards c
    left join public.transactions t
      on t.credit_card_id = c.id
     and t.user_id = v_user_id
     and t.payment_method = 'credit'
     and t.type = 'expense'
     and (t.parent_transaction_id is null or coalesce(t.is_installment, false) = true)
     and t.invoice_month in (v_month, v_next_month)
    where c.user_id = v_user_id
      and c.is_archived = false
    group by c.id, c.name, c.closing_day, c.due_day, c.limit_amount
  ) cards;

  select coalesce(jsonb_agg(row_to_json(x) order by x.total desc), '[]'::jsonb)
  into v_category_spend
  from (
    select c.id as category_id, c.name, sum(t.amount)::numeric(12,2) as total
    from public.transactions t
    left join public.categories c on c.id = t.category_id
    where t.user_id = v_user_id
      and t.type = 'expense'
      and t.date >= v_month
      and t.date < v_next_month
      and (t.parent_transaction_id is null or coalesce(t.is_installment, false) = true)
    group by c.id, c.name
    order by total desc
    limit 10
  ) x;

  select coalesce(jsonb_agg(row_to_json(u) order by u.due_date), '[]'::jsonb)
  into v_upcoming
  from (
    select rr.title as label, rr.next_run_date as due_date, rr.amount, 'RECURRING'::text as source_type
    from public.recurring_rules rr
    where rr.user_id = v_user_id
      and rr.active = true
      and rr.next_run_date >= current_date
      and rr.next_run_date <= (v_next_month + interval '1 month - 1 day')::date
    union all
    select concat('Fatura ', c.name) as label, public.clamp_day_to_month(v_next_month, c.due_day) as due_date,
      coalesce(sum(t.amount),0)::numeric(12,2) as amount,
      'INVOICE'::text as source_type
    from public.credit_cards c
    left join public.transactions t
      on t.credit_card_id = c.id
      and t.user_id = v_user_id
      and t.payment_method = 'credit'
      and t.type = 'expense'
      and t.invoice_month = v_next_month
      and (t.parent_transaction_id is null or coalesce(t.is_installment, false) = true)
    where c.user_id = v_user_id
      and c.is_archived = false
    group by c.id, c.name, c.due_day
  ) u;

  select coalesce(sum(value), 0)
  into v_future_commitments
  from (
    select amount as value
    from public.recurring_rules rr
    where rr.user_id = v_user_id
      and rr.active = true
      and rr.next_run_date >= current_date
      and rr.next_run_date <= v_month_end
    union all
    select coalesce(sum(t.amount),0)::numeric(12,2) as value
    from public.credit_cards c
    left join public.transactions t
      on t.credit_card_id = c.id
      and t.user_id = v_user_id
      and t.payment_method = 'credit'
      and t.type = 'expense'
      and t.invoice_month = v_month
      and (t.parent_transaction_id is null or coalesce(t.is_installment, false) = true)
    where c.user_id = v_user_id
      and c.is_archived = false
      and public.clamp_day_to_month(v_month, c.due_day) >= current_date
    group by c.id
  ) commitments;

  v_free_money := v_balance - v_future_commitments;

  select coalesce(jsonb_agg(row_to_json(rt) order by rt.date desc), '[]'::jsonb)
  into v_recent
  from (
    select
      t.id,
      t.date,
      coalesce(nullif(t.description, ''), c.name, 'Transação') as title,
      t.amount,
      c.name as category,
      t.payment_method,
      cc.name as card_name,
      t.installment_index,
      coalesce(t.installment_total, t.total_installments) as installment_total
    from public.transactions t
    left join public.categories c on c.id = t.category_id
    left join public.credit_cards cc on cc.id = t.credit_card_id
    where t.user_id = v_user_id
      and t.date >= v_month
      and t.date < v_next_month
      and (t.parent_transaction_id is null or coalesce(t.is_installment, false) = true)
    order by t.date desc, t.created_at desc
    limit 10
  ) rt;

  return jsonb_build_object(
    'income_total', v_income,
    'expense_total', v_expense,
    'balance_total', v_balance,
    'cards', v_cards,
    'category_spend', v_category_spend,
    'upcoming_payments', v_upcoming,
    'free_money_estimate', v_free_money,
    'recent_transactions', v_recent
  );
end;
$$;

grant execute on function public.get_dashboard_summary(uuid, date) to authenticated;

create or replace function public.get_dashboard_insights(p_user_id uuid, p_month date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := coalesce(p_user_id, auth.uid());
  v_month date := date_trunc('month', p_month)::date;
  v_prev_month date := (v_month - interval '1 month')::date;
  v_next_month date := (v_month + interval '1 month')::date;
  v_day int := greatest(extract(day from current_date)::int, 1);
  v_curr_total numeric(12,2) := 0;
  v_prev_total numeric(12,2) := 0;
  v_food_current numeric(12,2) := 0;
  v_food_prev numeric(12,2) := 0;
  v_proj numeric(12,2) := 0;
  v_month_days int := extract(day from (v_next_month - interval '1 day'))::int;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado';
  end if;

  select coalesce(sum(amount),0) into v_curr_total
  from public.transactions
  where user_id = v_user_id and type = 'expense' and date >= v_month and date < v_next_month
    and (parent_transaction_id is null or coalesce(is_installment,false)=true);

  select coalesce(sum(amount),0) into v_prev_total
  from public.transactions
  where user_id = v_user_id and type = 'expense' and date >= v_prev_month and date < v_month
    and (parent_transaction_id is null or coalesce(is_installment,false)=true);

  select coalesce(sum(t.amount),0) into v_food_current
  from public.transactions t
  join public.categories c on c.id = t.category_id
  where t.user_id = v_user_id and t.type='expense' and lower(c.name) like '%alimenta%'
    and t.date >= v_month and t.date < v_next_month;

  select coalesce(sum(t.amount),0) into v_food_prev
  from public.transactions t
  join public.categories c on c.id = t.category_id
  where t.user_id = v_user_id and t.type='expense' and lower(c.name) like '%alimenta%'
    and t.date >= v_prev_month and t.date < v_month;

  v_proj := case when v_day = 0 then v_curr_total else (v_curr_total / v_day) * v_month_days end;

  return jsonb_build_array(
    jsonb_build_object(
      'emoji', case when v_food_current > v_food_prev then '⚠️' else '✅' end,
      'level', case when v_food_current > v_food_prev then 'warn' else 'info' end,
      'text', case when v_food_prev > 0
        then format('Alimentação %s %.1s%% vs mês anterior.', case when v_food_current >= v_food_prev then 'subiu' else 'caiu' end, to_char(abs((v_food_current - v_food_prev) / v_food_prev * 100), 'FM999D0'))
        else 'Sem base de alimentação no mês anterior para comparar.'
      end
    ),
    jsonb_build_object(
      'emoji', '📺',
      'level', 'info',
      'text', format('Você gastou %s em despesas recorrentes previstas.', to_char((select coalesce(sum(amount),0) from public.recurring_rules where user_id = v_user_id and active = true), 'FM"R$"999G999G990D00'))
    ),
    jsonb_build_object(
      'emoji', case when v_proj > v_curr_total then '📈' else '📉' end,
      'level', 'info',
      'text', format('No ritmo atual, o mês pode fechar em %s de gastos.', to_char(v_proj, 'FM"R$"999G999G990D00'))
    )
  );
end;
$$;

grant execute on function public.get_dashboard_insights(uuid, date) to authenticated;
