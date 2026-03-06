-- Dashboard competência mensal: contas por date + cartão por competência de fatura (reference_month)

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
  with month_ref as (
    select date_trunc('month', p_month_start)::date as month_start
  ),
  accounts_expenses as (
    select
      t.id,
      t.category_id,
      t.payment_method,
      t.amount
    from public.transactions t
    where t.user_id = coalesce(p_user_id, auth.uid())
      and t.type = 'expense'
      and coalesce(t.payment_method, '') <> 'credit'
      and t.date >= p_month_start
      and t.date < p_next_month_start
      and (t.parent_transaction_id is null or coalesce(t.is_installment, false) = true)
  ),
  credit_invoice_expenses as (
    select
      t.id,
      t.category_id,
      t.payment_method,
      t.amount
    from public.transactions t
    join public.invoices i on i.id = t.invoice_id
    join public.credit_cards cc on cc.id = i.credit_card_id
    cross join month_ref m
    where t.user_id = coalesce(p_user_id, auth.uid())
      and cc.user_id = coalesce(p_user_id, auth.uid())
      and t.type = 'expense'
      and t.payment_method = 'credit'
      and t.invoice_id is not null
      and i.reference_month = m.month_start
      and (t.parent_transaction_id is null or coalesce(t.is_installment, false) = true)
  ),
  expense_base as (
    select * from accounts_expenses
    union all
    select * from credit_invoice_expenses
  ),
  totals as (
    select
      coalesce((select sum(amount) from accounts_expenses), 0)::numeric(12,2) as accounts_total,
      coalesce((select sum(amount) from credit_invoice_expenses), 0)::numeric(12,2) as credit_cards_total,
      coalesce((select sum(amount) from expense_base), 0)::numeric(12,2) as total_expenses,
      coalesce((
        select sum(t.amount)
        from public.transactions t
        where t.user_id = coalesce(p_user_id, auth.uid())
          and t.type = 'income'
          and t.date >= p_month_start
          and t.date < p_next_month_start
          and (t.parent_transaction_id is null or coalesce(t.is_installment, false) = true)
      ), 0)::numeric(12,2) as total_income
  ),
  by_cat as (
    select
      c.id as category_id,
      coalesce(c.name, 'Sem categoria') as category_name,
      coalesce(sum(e.amount), 0)::numeric(12,2) as total
    from expense_base e
    left join public.categories c on c.id = e.category_id
    group by c.id, c.name
  ),
  by_payment as (
    select coalesce(e.payment_method, 'unknown') as payment_type, coalesce(sum(e.amount),0)::numeric(12,2) as total
    from expense_base e
    group by coalesce(e.payment_method, 'unknown')
  ),
  essentials as (
    select
      coalesce(sum(case when c.is_essential then e.amount else 0 end), 0)::numeric(12,2) as essentials_total,
      coalesce(sum(case when not c.is_essential then e.amount else 0 end), 0)::numeric(12,2) as non_essentials_total
    from expense_base e
    left join public.categories c on c.id = e.category_id
  )
  select jsonb_build_object(
    'total_expenses', t.total_expenses,
    'total_income', t.total_income,
    'accounts_total', t.accounts_total,
    'credit_cards_total', t.credit_cards_total,
    'net', (t.total_income - t.total_expenses),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'category_id', b.category_id,
        'category_name', b.category_name,
        'total', b.total,
        'percentage', case when t.total_expenses = 0 then 0 else round((b.total / t.total_expenses * 100)::numeric, 2) end
      ) order by b.total desc)
      from by_cat b
    ), '[]'::jsonb),
    'essentials_total', e.essentials_total,
    'non_essentials_total', e.non_essentials_total,
    'payment_mix', coalesce((
      select jsonb_agg(jsonb_build_object(
        'payment_type', p.payment_type,
        'total', p.total,
        'percentage', case when t.total_expenses = 0 then 0 else round((p.total / t.total_expenses * 100)::numeric, 2) end
      ) order by p.total desc)
      from by_payment p
    ), '[]'::jsonb)
  )
  from totals t
  cross join essentials e;
$$;

create or replace function public.get_dashboard_summary(
  p_user_id uuid,
  p_month_start date,
  p_next_month_start date,
  p_today date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  role_claim text := coalesce(current_setting('request.jwt.claim.role', true), '');
  role_auth text := coalesce(auth.role(), '');
  is_service boolean := (role_auth = 'service_role') or (role_claim = 'service_role') or (current_user = 'service_role');
  v_forecast jsonb := '{}'::jsonb;
  v_spending_breakdown jsonb := '{}'::jsonb;
  v_insights jsonb := '[]'::jsonb;
  v_investment_goals jsonb := '[]'::jsonb;
  v_expenses_by_category jsonb := '[]'::jsonb;
  v_invoices_summary jsonb := '[]'::jsonb;
begin
  if p_user_id is null then
    raise exception 'Parâmetro p_user_id é obrigatório';
  end if;

  if p_month_start is null or p_next_month_start is null or p_today is null then
    raise exception 'Parâmetros de período são obrigatórios';
  end if;

  if p_month_start >= p_next_month_start then
    raise exception 'Período inválido: p_month_start deve ser menor que p_next_month_start';
  end if;

  if not is_service then
    if auth.uid() is null or auth.uid() <> p_user_id then
      raise exception 'Acesso negado para o usuário informado';
    end if;
  end if;

  select to_jsonb(f) into v_forecast
  from public.get_month_forecast(p_user_id, p_month_start, p_next_month_start, p_today) f;

  v_spending_breakdown := public.get_spending_breakdown(p_user_id, p_month_start, p_next_month_start);
  v_insights := public.get_financial_insights(p_user_id, p_month_start, p_next_month_start);

  select coalesce(jsonb_agg(row_to_json(g)), '[]'::jsonb)
    into v_investment_goals
  from public.get_investment_goals_summary(p_user_id, p_month_start, p_next_month_start) g;

  select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb)
    into v_expenses_by_category
  from (
    select
      e.category_id,
      coalesce(c.name, 'Sem categoria') as name,
      sum(e.amount)::numeric(12,2) as total
    from (
      select t.category_id, t.amount
      from public.transactions t
      where t.user_id = p_user_id
        and t.type = 'expense'
        and coalesce(t.payment_method, '') <> 'credit'
        and t.date >= p_month_start
        and t.date < p_next_month_start
        and (t.parent_transaction_id is null or coalesce(t.is_installment, false) = true)
      union all
      select t.category_id, t.amount
      from public.transactions t
      join public.invoices i on i.id = t.invoice_id
      join public.credit_cards cc on cc.id = i.credit_card_id
      where t.user_id = p_user_id
        and cc.user_id = p_user_id
        and t.type = 'expense'
        and t.payment_method = 'credit'
        and t.invoice_id is not null
        and i.reference_month = date_trunc('month', p_month_start)::date
        and (t.parent_transaction_id is null or coalesce(t.is_installment, false) = true)
    ) e
    left join public.categories c on c.id = e.category_id
    group by e.category_id, c.name
    order by total desc
    limit 8
  ) x;

  select coalesce(jsonb_agg(row_to_json(i)), '[]'::jsonb)
    into v_invoices_summary
  from (
    select
      cc.id as card_id,
      cc.name as card_name,
      coalesce(sum(case when inv.reference_month = p_month_start then t.amount else 0 end), 0)::numeric(12,2) as current_invoice_total,
      coalesce(sum(case when inv.reference_month = p_next_month_start then t.amount else 0 end), 0)::numeric(12,2) as next_invoice_total
    from public.credit_cards cc
    left join public.invoices inv on inv.credit_card_id = cc.id and inv.reference_month in (p_month_start, p_next_month_start)
    left join public.transactions t
      on t.invoice_id = inv.id
      and t.user_id = p_user_id
      and t.type = 'expense'
      and t.payment_method = 'credit'
      and (t.parent_transaction_id is null or coalesce(t.is_installment,false)=true)
    where cc.user_id = p_user_id
      and cc.is_archived = false
    group by cc.id, cc.name
    order by cc.name
  ) i;

  return jsonb_build_object(
    'forecast', coalesce(v_forecast, '{}'::jsonb),
    'spending_breakdown', coalesce(v_spending_breakdown, '{}'::jsonb),
    'insights', coalesce((
      select jsonb_agg(value)
      from (
        select value
        from jsonb_array_elements(coalesce(v_insights, '[]'::jsonb))
        limit 3
      ) limited
    ), '[]'::jsonb),
    'investment_goals', coalesce(v_investment_goals, '[]'::jsonb),
    'expenses_by_category', coalesce(v_expenses_by_category, '[]'::jsonb),
    'invoices_summary', coalesce(v_invoices_summary, '[]'::jsonb)
  );
end;
$$;

grant execute on function public.get_spending_breakdown(uuid, date, date) to authenticated;
grant execute on function public.get_dashboard_summary(uuid, date, date, date) to authenticated, service_role;
revoke execute on function public.get_dashboard_summary(uuid, date, date, date) from anon;
