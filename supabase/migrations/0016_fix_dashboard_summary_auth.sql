-- Fix robusto de autenticação da RPC do dashboard para user JWT e service_role

-- Limpa overloads que podem causar confusão no schema cache
drop function if exists public.get_dashboard_summary(uuid, date);
drop function if exists public.get_dashboard_summary(date, date, date, uuid);

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

  v_forecast := public.get_month_forecast(p_user_id, p_month_start, p_next_month_start, p_today);
  v_spending_breakdown := public.get_spending_breakdown(p_user_id, p_month_start, p_next_month_start);
  v_insights := public.get_financial_insights(p_user_id, p_month_start, p_next_month_start);

  select coalesce(jsonb_agg(row_to_json(g)), '[]'::jsonb)
    into v_investment_goals
  from public.get_investment_goals_summary(p_user_id, p_month_start, p_next_month_start) g;

  select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb)
    into v_expenses_by_category
  from (
    select
      c.id as category_id,
      c.name,
      sum(t.amount)::numeric(12,2) as total
    from public.transactions t
    left join public.categories c on c.id = t.category_id
    where t.user_id = p_user_id
      and t.type = 'expense'
      and t.date >= p_month_start
      and t.date < p_next_month_start
      and (t.parent_transaction_id is null or coalesce(t.is_installment, false) = true)
    group by c.id, c.name
    order by total desc
    limit 8
  ) x;

  select coalesce(jsonb_agg(row_to_json(i)), '[]'::jsonb)
    into v_invoices_summary
  from (
    select
      cc.id as card_id,
      cc.name as card_name,
      coalesce(sum(case when t.invoice_month = p_month_start then t.amount else 0 end), 0)::numeric(12,2) as current_invoice_total,
      coalesce(sum(case when t.invoice_month = p_next_month_start then t.amount else 0 end), 0)::numeric(12,2) as next_invoice_total
    from public.credit_cards cc
    left join public.transactions t
      on t.credit_card_id = cc.id
      and t.user_id = p_user_id
      and t.type = 'expense'
      and t.payment_method = 'credit'
      and (t.parent_transaction_id is null or coalesce(t.is_installment, false) = true)
      and t.invoice_month in (p_month_start, p_next_month_start)
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

grant execute on function public.get_dashboard_summary(uuid, date, date, date) to authenticated, service_role;
revoke execute on function public.get_dashboard_summary(uuid, date, date, date) from anon;
