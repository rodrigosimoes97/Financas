-- Product + UX + performance upgrades for dashboard

alter table public.categories
  add column if not exists is_essential boolean not null default false;

alter table public.goals
  drop constraint if exists goals_type_check;

alter table public.goals
  add constraint goals_type_check check (type in ('SAVE', 'SPEND_LIMIT', 'INVESTMENT'));

create table if not exists public.investment_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(12,2) not null check (target_amount > 0),
  current_amount numeric(12,2) not null default 0 check (current_amount >= 0),
  start_date date not null default now(),
  target_date date,
  monthly_contribution_target numeric(12,2),
  risk_profile text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.investment_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.investment_goals(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  date date not null,
  source text,
  created_at timestamptz not null default now()
);

alter table public.investment_goals enable row level security;
alter table public.investment_contributions enable row level security;

DO $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='investment_goals' and policyname='investment_goals_select_own') then
    create policy "investment_goals_select_own" on public.investment_goals for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='investment_goals' and policyname='investment_goals_insert_own') then
    create policy "investment_goals_insert_own" on public.investment_goals for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='investment_goals' and policyname='investment_goals_update_own') then
    create policy "investment_goals_update_own" on public.investment_goals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='investment_goals' and policyname='investment_goals_delete_own') then
    create policy "investment_goals_delete_own" on public.investment_goals for delete using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='investment_contributions' and policyname='investment_contributions_select_own') then
    create policy "investment_contributions_select_own" on public.investment_contributions for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='investment_contributions' and policyname='investment_contributions_insert_own') then
    create policy "investment_contributions_insert_own" on public.investment_contributions for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='investment_contributions' and policyname='investment_contributions_update_own') then
    create policy "investment_contributions_update_own" on public.investment_contributions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='investment_contributions' and policyname='investment_contributions_delete_own') then
    create policy "investment_contributions_delete_own" on public.investment_contributions for delete using (auth.uid() = user_id);
  end if;
end $$;

create index if not exists idx_transactions_user_date on public.transactions(user_id, date);
create index if not exists idx_transactions_user_type_date on public.transactions(user_id, type, date);
create index if not exists idx_transactions_user_category_date on public.transactions(user_id, category_id, date);
create index if not exists idx_transactions_user_payment_date on public.transactions(user_id, payment_method, date);
create index if not exists idx_investment_contributions_user_goal_date on public.investment_contributions(user_id, goal_id, date);

create or replace function public.get_investment_goals_summary(
  p_user_id uuid,
  p_month_start date,
  p_next_month_start date
)
returns table(
  goal_id uuid,
  name text,
  target_amount numeric,
  current_amount numeric,
  contributed_this_month numeric,
  remaining_amount numeric,
  months_to_target integer,
  required_monthly_contribution numeric,
  status text
)
language sql
security definer
set search_path = public
as $$
  with goals as (
    select g.*
    from public.investment_goals g
    where g.user_id = coalesce(p_user_id, auth.uid())
  ),
  contrib as (
    select
      c.goal_id,
      coalesce(sum(case when c.date < p_next_month_start then c.amount else 0 end), 0)::numeric(12,2) as total_until_month,
      coalesce(sum(case when c.date >= p_month_start and c.date < p_next_month_start then c.amount else 0 end), 0)::numeric(12,2) as this_month
    from public.investment_contributions c
    where c.user_id = coalesce(p_user_id, auth.uid())
    group by c.goal_id
  ),
  base as (
    select
      g.id as goal_id,
      g.name,
      g.target_amount,
      (g.current_amount + coalesce(c.total_until_month, 0))::numeric(12,2) as current_amount,
      coalesce(c.this_month, 0)::numeric(12,2) as contributed_this_month,
      greatest(g.target_amount - (g.current_amount + coalesce(c.total_until_month, 0)), 0)::numeric(12,2) as remaining_amount,
      case
        when g.target_date is null then null
        else greatest(
          (
            extract(year from age(date_trunc('month', g.target_date), date_trunc('month', current_date)))::int * 12 +
            extract(month from age(date_trunc('month', g.target_date), date_trunc('month', current_date)))::int + 1
          ),
          1
        )
      end as months_to_target
    from goals g
    left join contrib c on c.goal_id = g.id
  )
  select
    b.goal_id,
    b.name,
    b.target_amount,
    b.current_amount,
    b.contributed_this_month,
    b.remaining_amount,
    b.months_to_target,
    case when b.months_to_target is null then null else round((b.remaining_amount / b.months_to_target)::numeric, 2) end as required_monthly_contribution,
    case
      when b.remaining_amount <= 0 then 'ahead'
      when b.months_to_target is null then case when b.contributed_this_month > 0 then 'on_track' else 'behind' end
      when b.contributed_this_month >= round((b.remaining_amount / b.months_to_target)::numeric, 2) then 'on_track'
      else 'behind'
    end as status
  from base b
  order by
    case
      when b.remaining_amount <= 0 then 3
      when b.months_to_target is not null and b.contributed_this_month < round((b.remaining_amount / b.months_to_target)::numeric, 2) then 1
      else 2
    end,
    b.remaining_amount desc;
$$;

grant execute on function public.get_investment_goals_summary(uuid, date, date) to authenticated;

create or replace function public.get_month_forecast(
  p_user_id uuid,
  p_month_start date,
  p_next_month_start date,
  p_today date
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with period as (
    select
      date_trunc('month', p_month_start)::date as month_start,
      date_trunc('month', p_next_month_start)::date as next_month_start,
      greatest(least(coalesce(p_today, current_date), (date_trunc('month', p_next_month_start)::date - 1)), date_trunc('month', p_month_start)::date) as today
  ),
  totals as (
    select
      coalesce(sum(case when t.type = 'expense' then t.amount else 0 end), 0)::numeric(12,2) as spent_so_far,
      coalesce(sum(case when t.type = 'income' then t.amount else 0 end), 0)::numeric(12,2) as income_so_far
    from public.transactions t
    cross join period p
    where t.user_id = coalesce(p_user_id, auth.uid())
      and t.date >= p.month_start
      and t.date <= p.today
      and (t.parent_transaction_id is null or coalesce(t.is_installment, false) = true)
  ),
  budget as (
    select coalesce(sum(g.monthly_limit), 0)::numeric(12,2) as monthly_budget
    from public.goals g
    cross join period p
    where g.user_id = coalesce(p_user_id, auth.uid())
      and g.type = 'SPEND_LIMIT'
      and g.month = p.month_start
  ),
  calc as (
    select
      t.spent_so_far,
      (p.today - p.month_start + 1)::int as days_elapsed,
      extract(day from (p.next_month_start - interval '1 day'))::int as days_in_month,
      t.income_so_far,
      b.monthly_budget
    from totals t
    cross join period p
    cross join budget b
  )
  select jsonb_build_object(
    'spent_so_far', c.spent_so_far,
    'days_elapsed', c.days_elapsed,
    'days_in_month', c.days_in_month,
    'daily_avg', case when c.days_elapsed > 0 then round((c.spent_so_far / c.days_elapsed)::numeric, 2) else 0 end,
    'projected_spent', case when c.days_elapsed > 0 then round((c.spent_so_far / c.days_elapsed * c.days_in_month)::numeric, 2) else c.spent_so_far end,
    'projected_remaining_budget', case when c.monthly_budget > 0 and c.days_elapsed > 0 then round((c.monthly_budget - (c.spent_so_far / c.days_elapsed * c.days_in_month))::numeric, 2) else null end,
    'projected_savings', case when c.days_elapsed > 0 then round((c.income_so_far - (c.spent_so_far / c.days_elapsed * c.days_in_month))::numeric, 2) else c.income_so_far - c.spent_so_far end,
    'confidence', case when c.days_elapsed < 7 then 'low' when c.days_elapsed <= 14 then 'medium' else 'high' end
  )
  from calc c;
$$;

grant execute on function public.get_month_forecast(uuid, date, date, date) to authenticated;

create or replace function public.get_spending_breakdown(
  p_user_id uuid,
  p_month_start date,
  p_next_month_start date
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with tx as (
    select t.*
    from public.transactions t
    where t.user_id = coalesce(p_user_id, auth.uid())
      and t.date >= p_month_start
      and t.date < p_next_month_start
      and (t.parent_transaction_id is null or coalesce(t.is_installment, false) = true)
  ),
  totals as (
    select
      coalesce(sum(case when type = 'expense' then amount else 0 end), 0)::numeric(12,2) as total_expenses,
      coalesce(sum(case when type = 'income' then amount else 0 end), 0)::numeric(12,2) as total_income
    from tx
  ),
  by_cat as (
    select
      c.id as category_id,
      coalesce(c.name, 'Sem categoria') as category_name,
      coalesce(sum(t.amount), 0)::numeric(12,2) as total
    from tx t
    left join public.categories c on c.id = t.category_id
    where t.type = 'expense'
    group by c.id, c.name
  ),
  by_payment as (
    select coalesce(payment_method, 'unknown') as payment_type, coalesce(sum(amount),0)::numeric(12,2) as total
    from tx
    where type = 'expense'
    group by coalesce(payment_method, 'unknown')
  ),
  essentials as (
    select
      coalesce(sum(case when c.is_essential then t.amount else 0 end), 0)::numeric(12,2) as essentials_total,
      coalesce(sum(case when not c.is_essential then t.amount else 0 end), 0)::numeric(12,2) as non_essentials_total
    from tx t
    left join public.categories c on c.id = t.category_id
    where t.type = 'expense'
  )
  select jsonb_build_object(
    'total_expenses', totals.total_expenses,
    'total_income', totals.total_income,
    'net', (totals.total_income - totals.total_expenses),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'category_id', b.category_id,
        'category_name', b.category_name,
        'total', b.total,
        'percentage', case when totals.total_expenses = 0 then 0 else round((b.total / totals.total_expenses * 100)::numeric, 2) end
      ) order by b.total desc)
      from by_cat b
    ), '[]'::jsonb),
    'essentials_total', e.essentials_total,
    'non_essentials_total', e.non_essentials_total,
    'payment_mix', coalesce((
      select jsonb_agg(jsonb_build_object(
        'payment_type', p.payment_type,
        'total', p.total,
        'percentage', case when totals.total_expenses = 0 then 0 else round((p.total / totals.total_expenses * 100)::numeric, 2) end
      ) order by p.total desc)
      from by_payment p
    ), '[]'::jsonb),
    'credit_cards_total', coalesce((select sum(amount) from tx where type='expense' and payment_method='credit'), 0)::numeric(12,2),
    'accounts_total', coalesce((select sum(amount) from tx where type='expense' and coalesce(payment_method,'') <> 'credit'), 0)::numeric(12,2)
  )
  from totals cross join essentials e;
$$;

grant execute on function public.get_spending_breakdown(uuid, date, date) to authenticated;

create or replace function public.get_financial_insights(
  p_user_id uuid,
  p_month_start date,
  p_next_month_start date
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with curr as (
    select * from public.transactions t
    where t.user_id = coalesce(p_user_id, auth.uid())
      and t.date >= p_month_start
      and t.date < p_next_month_start
      and (t.parent_transaction_id is null or coalesce(t.is_installment, false) = true)
  ),
  prev as (
    select * from public.transactions t
    where t.user_id = coalesce(p_user_id, auth.uid())
      and t.date >= (p_month_start - interval '1 month')::date
      and t.date < p_month_start
      and (t.parent_transaction_id is null or coalesce(t.is_installment, false) = true)
  ),
  cat_delta as (
    select c.name, coalesce(sum(case when src='curr' then amount else 0 end),0)::numeric as curr_total,
      coalesce(sum(case when src='prev' then amount else 0 end),0)::numeric as prev_total
    from (
      select 'curr'::text as src, t.category_id, t.amount from curr t where t.type='expense'
      union all
      select 'prev'::text as src, t.category_id, t.amount from prev t where t.type='expense'
    ) x
    left join public.categories c on c.id = x.category_id
    group by c.name
  ),
  top_cat as (
    select c.name, sum(t.amount)::numeric as total
    from curr t
    left join public.categories c on c.id = t.category_id
    where t.type='expense'
    group by c.name
    order by total desc
    limit 1
  ),
  recurring as (
    select coalesce(nullif(trim(description), ''), 'Sem descrição') as merchant, count(*) as cnt, sum(amount)::numeric as total
    from curr
    where type='expense'
    group by 1
    having count(*) >= 2
    order by total desc
    limit 1
  ),
  cat_limit as (
    select c.name, g.monthly_limit, sum(t.amount)::numeric as spent
    from public.goals g
    join public.categories c on c.id = g.category_id
    left join curr t on t.category_id = g.category_id and t.type='expense'
    where g.user_id = coalesce(p_user_id, auth.uid())
      and g.type = 'SPEND_LIMIT'
      and g.month = p_month_start
    group by c.name, g.monthly_limit
    having sum(t.amount) >= g.monthly_limit * 0.8
    order by (sum(t.amount) / nullif(g.monthly_limit,0)) desc
    limit 1
  ),
  forecast as (
    select public.get_month_forecast(p_user_id, p_month_start, p_next_month_start, current_date) as f
  ),
  next_invoice as (
    select coalesce(sum(t.amount),0)::numeric as total,
      coalesce(avg(month_total),0)::numeric as avg_total
    from public.transactions t
    cross join lateral (
      select coalesce(sum(t2.amount),0)::numeric as month_total
      from public.transactions t2
      where t2.user_id = coalesce(p_user_id, auth.uid()) and t2.payment_method='credit' and t2.type='expense'
        and t2.invoice_month in (p_month_start, (p_month_start - interval '1 month')::date, (p_month_start - interval '2 month')::date)
        and (t2.parent_transaction_id is null or coalesce(t2.is_installment,false)=true)
      group by t2.invoice_month
    ) m
    where t.user_id = coalesce(p_user_id, auth.uid()) and t.payment_method='credit' and t.type='expense'
      and t.invoice_month = p_next_month_start
      and (t.parent_transaction_id is null or coalesce(t.is_installment,false)=true)
  )
  select coalesce(jsonb_agg(item), '[]'::jsonb)
  from (
    select * from (
      select jsonb_build_object(
        'id', 'category_spike',
        'severity', case when (curr_total - prev_total) >= 300 then 'critical' else 'warn' end,
        'title', format('Atenção com %s', coalesce(name, 'categoria')),
        'message', format('Gastos subiram %.0f%% (+R$ %s) vs mês anterior.', ((curr_total - prev_total)/nullif(prev_total,0))*100, to_char((curr_total - prev_total), 'FM999G999D00')),
        'metric_value', curr_total,
        'delta_value', (curr_total - prev_total),
        'cta_label', 'Ver transações',
        'cta_route', '/transactions?filter=expense'
      ) as item
      from cat_delta
      where prev_total > 0 and curr_total >= prev_total * 1.25 and (curr_total - prev_total) >= 100
      order by (curr_total - prev_total) desc
      limit 1
    ) s1
    union all
    select * from (
      select jsonb_build_object(
        'id', 'top_category',
        'severity', 'info',
        'title', 'Categoria líder do mês',
        'message', format('%s é sua maior categoria com R$ %s.', coalesce(name, 'Sem categoria'), to_char(total, 'FM999G999D00')),
        'metric_value', total,
        'delta_value', null,
        'cta_label', null,
        'cta_route', null
      ) as item
      from top_cat
    ) s2
    union all
    select * from (
      select jsonb_build_object(
        'id', 'recurring_spend',
        'severity', 'info',
        'title', 'Gasto recorrente detectado',
        'message', format('%s apareceu %s vezes no mês (R$ %s).', merchant, cnt, to_char(total, 'FM999G999D00')),
        'metric_value', total,
        'delta_value', cnt,
        'cta_label', 'Revisar',
        'cta_route', '/transactions'
      ) as item
      from recurring
    ) s3
    union all
    select * from (
      select jsonb_build_object(
        'id', 'category_limit_80',
        'severity', 'warn',
        'title', 'Limite de categoria quase estourando',
        'message', format('%s já consumiu %.0f%% do limite mensal.', name, (spent / nullif(monthly_limit,0)) * 100),
        'metric_value', spent,
        'delta_value', (spent - monthly_limit),
        'cta_label', 'Ajustar meta',
        'cta_route', '/goals'
      ) as item
      from cat_limit
    ) s4
    union all
    select jsonb_build_object(
      'id', 'budget_forecast_risk',
      'severity', 'critical',
      'title', 'Risco de estourar orçamento',
      'message', 'A projeção do mês está acima do orçamento planejado.',
      'metric_value', (f->>'projected_spent')::numeric,
      'delta_value', abs((f->>'projected_remaining_budget')::numeric),
      'cta_label', 'Ver dashboard',
      'cta_route', '/dashboard'
    )
    from forecast
    where (f->>'projected_remaining_budget') is not null and (f->>'projected_remaining_budget')::numeric < 0
    union all
    select jsonb_build_object(
      'id', 'high_invoice',
      'severity', 'warn',
      'title', 'Próxima fatura acima da média',
      'message', 'Sua próxima fatura está significativamente acima da média recente.',
      'metric_value', total,
      'delta_value', (total - avg_total),
      'cta_label', 'Ver cartões',
      'cta_route', '/cards'
    )
    from next_invoice
    where total > avg_total * 1.2 and avg_total > 0
  ) insights;
$$;

grant execute on function public.get_financial_insights(uuid, date, date) to authenticated;

create or replace function public.get_dashboard_summary(
  p_user_id uuid,
  p_month_start date,
  p_next_month_start date,
  p_today date
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with summary as (
    select
      public.get_month_forecast(p_user_id, p_month_start, p_next_month_start, p_today) as forecast,
      public.get_spending_breakdown(p_user_id, p_month_start, p_next_month_start) as spending_breakdown,
      public.get_financial_insights(p_user_id, p_month_start, p_next_month_start) as insights,
      (
        select coalesce(jsonb_agg(row_to_json(g)), '[]'::jsonb)
        from public.get_investment_goals_summary(p_user_id, p_month_start, p_next_month_start) g
      ) as investment_goals,
      (
        select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb)
        from (
          select c.id as category_id, c.name, sum(t.amount)::numeric(12,2) as total
          from public.transactions t
          left join public.categories c on c.id = t.category_id
          where t.user_id = coalesce(p_user_id, auth.uid())
            and t.type = 'expense'
            and t.date >= p_month_start
            and t.date < p_next_month_start
            and (t.parent_transaction_id is null or coalesce(t.is_installment, false) = true)
          group by c.id, c.name
          order by total desc
          limit 8
        ) x
      ) as expenses_by_category,
      (
        select coalesce(jsonb_agg(row_to_json(i)), '[]'::jsonb)
        from (
          select
            cc.id as card_id,
            cc.name as card_name,
            coalesce(sum(case when t.invoice_month = p_month_start then t.amount else 0 end), 0)::numeric(12,2) as current_invoice_total,
            coalesce(sum(case when t.invoice_month = p_next_month_start then t.amount else 0 end), 0)::numeric(12,2) as next_invoice_total
          from public.credit_cards cc
          left join public.transactions t
            on t.credit_card_id = cc.id
            and t.user_id = coalesce(p_user_id, auth.uid())
            and t.type='expense'
            and t.payment_method='credit'
            and (t.parent_transaction_id is null or coalesce(t.is_installment,false)=true)
            and t.invoice_month in (p_month_start, p_next_month_start)
          where cc.user_id = coalesce(p_user_id, auth.uid()) and cc.is_archived = false
          group by cc.id, cc.name
          order by cc.name
        ) i
      ) as invoices_summary
  )
  select jsonb_build_object(
    'forecast', forecast,
    'spending_breakdown', spending_breakdown,
    'insights', coalesce((
      select jsonb_agg(value)
      from (
        select value
        from jsonb_array_elements(insights)
        limit 3
      ) limited
    ), '[]'::jsonb),
    'investment_goals', investment_goals,
    'expenses_by_category', expenses_by_category,
    'invoices_summary', invoices_summary
  )
  from summary;
$$;

grant execute on function public.get_dashboard_summary(uuid, date, date, date) to authenticated;
