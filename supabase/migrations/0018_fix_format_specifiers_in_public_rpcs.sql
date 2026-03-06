-- Corrige definitivamente uso inválido de format() com especificadores float
-- Ex.: %.2f, %0.2f, %.1f, %.0f
-- e recria RPCs prioritárias do schema public.

CREATE OR REPLACE FUNCTION public.get_investment_goals_summary(
  p_user_id uuid,
  p_month_start date,
  p_next_month_start date
)
RETURNS TABLE(
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
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH goals AS (
    SELECT g.*
    FROM public.investment_goals g
    WHERE g.user_id = coalesce(p_user_id, auth.uid())
  ),
  contrib AS (
    SELECT
      c.goal_id,
      coalesce(sum(CASE WHEN c.date < p_next_month_start THEN c.amount ELSE 0 END), 0)::numeric(12,2) AS total_until_month,
      coalesce(sum(CASE WHEN c.date >= p_month_start AND c.date < p_next_month_start THEN c.amount ELSE 0 END), 0)::numeric(12,2) AS this_month
    FROM public.investment_contributions c
    WHERE c.user_id = coalesce(p_user_id, auth.uid())
    GROUP BY c.goal_id
  ),
  base AS (
    SELECT
      g.id AS goal_id,
      g.name,
      g.target_amount,
      (g.current_amount + coalesce(c.total_until_month, 0))::numeric(12,2) AS current_amount,
      coalesce(c.this_month, 0)::numeric(12,2) AS contributed_this_month,
      greatest(g.target_amount - (g.current_amount + coalesce(c.total_until_month, 0)), 0)::numeric(12,2) AS remaining_amount,
      CASE
        WHEN g.target_date IS NULL THEN NULL
        ELSE greatest(
          (
            extract(year FROM age(date_trunc('month', g.target_date), date_trunc('month', current_date)))::int * 12 +
            extract(month FROM age(date_trunc('month', g.target_date), date_trunc('month', current_date)))::int + 1
          ),
          1
        )
      END AS months_to_target
    FROM goals g
    LEFT JOIN contrib c ON c.goal_id = g.id
  )
  SELECT
    b.goal_id,
    b.name,
    b.target_amount,
    b.current_amount,
    b.contributed_this_month,
    b.remaining_amount,
    b.months_to_target,
    CASE WHEN b.months_to_target IS NULL THEN NULL ELSE round((b.remaining_amount / b.months_to_target)::numeric, 2) END AS required_monthly_contribution,
    CASE
      WHEN b.remaining_amount <= 0 THEN 'ahead'
      WHEN b.months_to_target IS NULL THEN CASE WHEN b.contributed_this_month > 0 THEN 'on_track' ELSE 'behind' END
      WHEN b.contributed_this_month >= round((b.remaining_amount / b.months_to_target)::numeric, 2) THEN 'on_track'
      ELSE 'behind'
    END AS status
  FROM base b
  ORDER BY
    CASE
      WHEN b.remaining_amount <= 0 THEN 3
      WHEN b.months_to_target IS NOT NULL AND b.contributed_this_month < round((b.remaining_amount / b.months_to_target)::numeric, 2) THEN 1
      ELSE 2
    END,
    b.remaining_amount DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_month_forecast(
  p_user_id uuid,
  p_month_start date,
  p_next_month_start date,
  p_today date
)
RETURNS TABLE (
  spent_so_far numeric,
  days_elapsed int,
  days_in_month int,
  daily_avg numeric,
  projected_spent numeric,
  projected_remaining_budget numeric,
  projected_savings numeric,
  confidence text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH period AS (
    SELECT
      date_trunc('month', p_month_start)::date AS month_start,
      date_trunc('month', p_next_month_start)::date AS next_month_start,
      LEAST(
        GREATEST(coalesce(p_today, current_date), date_trunc('month', p_month_start)::date),
        (date_trunc('month', p_next_month_start)::date - 1)
      )::date AS effective_today
  ),
  month_meta AS (
    SELECT
      p.month_start,
      p.next_month_start,
      p.effective_today,
      EXTRACT(day FROM (p.next_month_start - interval '1 day'))::int AS days_in_month,
      GREATEST(LEAST((p.effective_today - p.month_start + 1)::int, EXTRACT(day FROM (p.next_month_start - interval '1 day'))::int), 1) AS days_elapsed
    FROM period p
  ),
  totals AS (
    SELECT
      COALESCE(SUM(CASE WHEN t.type = 'expense' AND t.date <= m.effective_today THEN t.amount ELSE 0 END), 0)::numeric AS spent_so_far,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0)::numeric AS total_income_month
    FROM public.transactions t
    CROSS JOIN month_meta m
    WHERE t.user_id = p_user_id
      AND t.date >= m.month_start
      AND t.date < m.next_month_start
      AND (t.parent_transaction_id IS NULL OR COALESCE(t.is_installment, false) = true)
  ),
  budget AS (
    SELECT NULLIF(COALESCE(SUM(g.monthly_limit), 0), 0)::numeric AS monthly_budget
    FROM public.goals g
    CROSS JOIN month_meta m
    WHERE g.user_id = p_user_id
      AND g.type = 'SPEND_LIMIT'
      AND g.month = m.month_start
  ),
  calc AS (
    SELECT
      t.spent_so_far,
      m.days_elapsed,
      m.days_in_month,
      CASE WHEN m.days_elapsed > 0 THEN (t.spent_so_far / m.days_elapsed) ELSE 0 END::numeric AS daily_avg,
      t.total_income_month,
      b.monthly_budget
    FROM totals t
    CROSS JOIN month_meta m
    CROSS JOIN budget b
  )
  SELECT
    c.spent_so_far,
    c.days_elapsed,
    c.days_in_month,
    ROUND(c.daily_avg, 2)::numeric,
    ROUND((c.daily_avg * c.days_in_month)::numeric, 2)::numeric AS projected_spent,
    CASE
      WHEN c.monthly_budget IS NULL THEN NULL
      ELSE ROUND((c.monthly_budget - (c.daily_avg * c.days_in_month))::numeric, 2)::numeric
    END AS projected_remaining_budget,
    ROUND((c.total_income_month - (c.daily_avg * c.days_in_month))::numeric, 2)::numeric AS projected_savings,
    CASE
      WHEN c.days_elapsed < 7 THEN 'low'
      WHEN c.days_elapsed <= 14 THEN 'medium'
      ELSE 'high'
    END AS confidence
  FROM calc c;
$$;

CREATE OR REPLACE FUNCTION public.get_spending_breakdown(
  p_user_id uuid,
  p_month_start date,
  p_next_month_start date
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH tx AS (
    SELECT t.*
    FROM public.transactions t
    WHERE t.user_id = coalesce(p_user_id, auth.uid())
      AND t.date >= p_month_start
      AND t.date < p_next_month_start
      AND (t.parent_transaction_id IS NULL OR coalesce(t.is_installment, false) = true)
  ),
  totals AS (
    SELECT
      coalesce(sum(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)::numeric(12,2) AS total_expenses,
      coalesce(sum(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)::numeric(12,2) AS total_income
    FROM tx
  ),
  by_cat AS (
    SELECT
      c.id AS category_id,
      coalesce(c.name, 'Sem categoria') AS category_name,
      coalesce(sum(t.amount), 0)::numeric(12,2) AS total
    FROM tx t
    LEFT JOIN public.categories c ON c.id = t.category_id
    WHERE t.type = 'expense'
    GROUP BY c.id, c.name
  ),
  by_payment AS (
    SELECT coalesce(payment_method, 'unknown') AS payment_type, coalesce(sum(amount),0)::numeric(12,2) AS total
    FROM tx
    WHERE type = 'expense'
    GROUP BY coalesce(payment_method, 'unknown')
  ),
  essentials AS (
    SELECT
      coalesce(sum(CASE WHEN c.is_essential THEN t.amount ELSE 0 END), 0)::numeric(12,2) AS essentials_total,
      coalesce(sum(CASE WHEN NOT c.is_essential THEN t.amount ELSE 0 END), 0)::numeric(12,2) AS non_essentials_total
    FROM tx t
    LEFT JOIN public.categories c ON c.id = t.category_id
    WHERE t.type = 'expense'
  )
  SELECT jsonb_build_object(
    'total_expenses', totals.total_expenses,
    'total_income', totals.total_income,
    'net', (totals.total_income - totals.total_expenses),
    'categories', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'category_id', b.category_id,
        'category_name', b.category_name,
        'total', b.total,
        'percentage', CASE WHEN totals.total_expenses = 0 THEN 0 ELSE round((b.total / totals.total_expenses * 100)::numeric, 2) END
      ) ORDER BY b.total DESC)
      FROM by_cat b
    ), '[]'::jsonb),
    'essentials_total', e.essentials_total,
    'non_essentials_total', e.non_essentials_total,
    'payment_mix', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'payment_type', p.payment_type,
        'total', p.total,
        'percentage', CASE WHEN totals.total_expenses = 0 THEN 0 ELSE round((p.total / totals.total_expenses * 100)::numeric, 2) END
      ) ORDER BY p.total DESC)
      FROM by_payment p
    ), '[]'::jsonb),
    'credit_cards_total', coalesce((SELECT sum(amount) FROM tx WHERE type='expense' AND payment_method='credit'), 0)::numeric(12,2),
    'accounts_total', coalesce((SELECT sum(amount) FROM tx WHERE type='expense' AND coalesce(payment_method,'') <> 'credit'), 0)::numeric(12,2)
  )
  FROM totals CROSS JOIN essentials e;
$$;

CREATE OR REPLACE FUNCTION public.get_financial_insights(
  p_user_id uuid,
  p_month_start date,
  p_next_month_start date
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH curr AS (
    SELECT * FROM public.transactions t
    WHERE t.user_id = coalesce(p_user_id, auth.uid())
      AND t.date >= p_month_start
      AND t.date < p_next_month_start
      AND (t.parent_transaction_id IS NULL OR coalesce(t.is_installment, false) = true)
  ),
  prev AS (
    SELECT * FROM public.transactions t
    WHERE t.user_id = coalesce(p_user_id, auth.uid())
      AND t.date >= (p_month_start - interval '1 month')::date
      AND t.date < p_month_start
      AND (t.parent_transaction_id IS NULL OR coalesce(t.is_installment, false) = true)
  ),
  cat_delta AS (
    SELECT c.name,
      coalesce(sum(CASE WHEN src='curr' THEN amount ELSE 0 END),0)::numeric AS curr_total,
      coalesce(sum(CASE WHEN src='prev' THEN amount ELSE 0 END),0)::numeric AS prev_total
    FROM (
      SELECT 'curr'::text AS src, t.category_id, t.amount FROM curr t WHERE t.type='expense'
      UNION ALL
      SELECT 'prev'::text AS src, t.category_id, t.amount FROM prev t WHERE t.type='expense'
    ) x
    LEFT JOIN public.categories c ON c.id = x.category_id
    GROUP BY c.name
  ),
  top_cat AS (
    SELECT c.name, sum(t.amount)::numeric AS total
    FROM curr t
    LEFT JOIN public.categories c ON c.id = t.category_id
    WHERE t.type='expense'
    GROUP BY c.name
    ORDER BY total DESC
    LIMIT 1
  ),
  recurring AS (
    SELECT coalesce(nullif(trim(description), ''), 'Sem descrição') AS merchant, count(*) AS cnt, sum(amount)::numeric AS total
    FROM curr
    WHERE type='expense'
    GROUP BY 1
    HAVING count(*) >= 2
    ORDER BY total DESC
    LIMIT 1
  ),
  cat_limit AS (
    SELECT c.name, g.monthly_limit, sum(t.amount)::numeric AS spent
    FROM public.goals g
    JOIN public.categories c ON c.id = g.category_id
    LEFT JOIN curr t ON t.category_id = g.category_id AND t.type='expense'
    WHERE g.user_id = coalesce(p_user_id, auth.uid())
      AND g.type = 'SPEND_LIMIT'
      AND g.month = p_month_start
    GROUP BY c.name, g.monthly_limit
    HAVING sum(t.amount) >= g.monthly_limit * 0.8
    ORDER BY (sum(t.amount) / nullif(g.monthly_limit,0)) DESC
    LIMIT 1
  ),
  forecast AS (
    SELECT * FROM public.get_month_forecast(p_user_id, p_month_start, p_next_month_start, current_date)
  ),
  next_invoice AS (
    SELECT coalesce(sum(t.amount),0)::numeric AS total,
      coalesce(avg(month_total),0)::numeric AS avg_total
    FROM public.transactions t
    CROSS JOIN LATERAL (
      SELECT coalesce(sum(t2.amount),0)::numeric AS month_total
      FROM public.transactions t2
      WHERE t2.user_id = coalesce(p_user_id, auth.uid())
        AND t2.payment_method='credit'
        AND t2.type='expense'
        AND t2.invoice_month in (p_month_start, (p_month_start - interval '1 month')::date, (p_month_start - interval '2 month')::date)
        AND (t2.parent_transaction_id IS NULL OR coalesce(t2.is_installment,false)=true)
      GROUP BY t2.invoice_month
    ) m
    WHERE t.user_id = coalesce(p_user_id, auth.uid())
      AND t.payment_method='credit'
      AND t.type='expense'
      AND t.invoice_month = p_next_month_start
      AND (t.parent_transaction_id IS NULL OR coalesce(t.is_installment,false)=true)
  )
  SELECT coalesce(jsonb_agg(item), '[]'::jsonb)
  FROM (
    SELECT * FROM (
      SELECT jsonb_build_object(
        'id', 'category_spike',
        'severity', CASE WHEN (curr_total - prev_total) >= 300 THEN 'critical' ELSE 'warn' END,
        'title', format('Atenção com %s', coalesce(name, 'categoria')),
        'message', format(
          'Gastos subiram %s%% (+R$ %s) vs mês anterior.',
          to_char(round(((curr_total - prev_total) / nullif(prev_total,0) * 100)::numeric, 0), 'FM999999990'),
          to_char(round((curr_total - prev_total)::numeric, 2), 'FM999999990.00')
        ),
        'metric_value', curr_total,
        'delta_value', (curr_total - prev_total),
        'cta_label', 'Ver transações',
        'cta_route', '/transactions?filter=expense'
      ) AS item
      FROM cat_delta
      WHERE prev_total > 0 AND curr_total >= prev_total * 1.25 AND (curr_total - prev_total) >= 100
      ORDER BY (curr_total - prev_total) DESC
      LIMIT 1
    ) s1
    UNION ALL
    SELECT * FROM (
      SELECT jsonb_build_object(
        'id', 'top_category',
        'severity', 'info',
        'title', 'Categoria líder do mês',
        'message', format('%s é sua maior categoria com R$ %s.', coalesce(name, 'Sem categoria'), to_char(round(total::numeric, 2), 'FM999999990.00')),
        'metric_value', total,
        'delta_value', null,
        'cta_label', null,
        'cta_route', null
      ) AS item
      FROM top_cat
    ) s2
    UNION ALL
    SELECT * FROM (
      SELECT jsonb_build_object(
        'id', 'recurring_spend',
        'severity', 'info',
        'title', 'Gasto recorrente detectado',
        'message', format('%s apareceu %s vezes no mês (R$ %s).', merchant, cnt, to_char(round(total::numeric, 2), 'FM999999990.00')),
        'metric_value', total,
        'delta_value', cnt,
        'cta_label', 'Revisar',
        'cta_route', '/transactions'
      ) AS item
      FROM recurring
    ) s3
    UNION ALL
    SELECT * FROM (
      SELECT jsonb_build_object(
        'id', 'category_limit_80',
        'severity', 'warn',
        'title', 'Limite de categoria quase estourando',
        'message', format(
          '%s já consumiu %s%% do limite mensal.',
          name,
          to_char(round((spent / nullif(monthly_limit,0) * 100)::numeric, 0), 'FM999999990')
        ),
        'metric_value', spent,
        'delta_value', (spent - monthly_limit),
        'cta_label', 'Ajustar meta',
        'cta_route', '/goals'
      ) AS item
      FROM cat_limit
    ) s4
    UNION ALL
    SELECT jsonb_build_object(
      'id', 'budget_forecast_risk',
      'severity', 'critical',
      'title', 'Risco de estourar orçamento',
      'message', 'A projeção do mês está acima do orçamento planejado.',
      'metric_value', projected_spent,
      'delta_value', abs(projected_remaining_budget),
      'cta_label', 'Ver dashboard',
      'cta_route', '/dashboard'
    )
    FROM forecast
    WHERE projected_remaining_budget IS NOT NULL AND projected_remaining_budget < 0
    UNION ALL
    SELECT jsonb_build_object(
      'id', 'high_invoice',
      'severity', 'warn',
      'title', 'Próxima fatura acima da média',
      'message', 'Sua próxima fatura está significativamente acima da média recente.',
      'metric_value', total,
      'delta_value', (total - avg_total),
      'cta_label', 'Ver cartões',
      'cta_route', '/cards'
    )
    FROM next_invoice
    WHERE total > avg_total * 1.2 AND avg_total > 0
  ) insights;
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_summary(
  p_user_id uuid,
  p_month_start date,
  p_next_month_start date,
  p_today date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_claim text := coalesce(current_setting('request.jwt.claim.role', true), '');
  role_auth text := coalesce(auth.role(), '');
  is_service boolean := (role_auth = 'service_role') or (role_claim = 'service_role') or (current_user = 'service_role');
  v_forecast jsonb := '{}'::jsonb;
  v_spending_breakdown jsonb := '{}'::jsonb;
  v_insights jsonb := '[]'::jsonb;
  v_investment_goals jsonb := '[]'::jsonb;
  v_expenses_by_category jsonb := '[]'::jsonb;
  v_invoices_summary jsonb := '[]'::jsonb;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Parâmetro p_user_id é obrigatório';
  END IF;

  IF p_month_start IS NULL OR p_next_month_start IS NULL OR p_today IS NULL THEN
    RAISE EXCEPTION 'Parâmetros de período são obrigatórios';
  END IF;

  IF p_month_start >= p_next_month_start THEN
    RAISE EXCEPTION 'Período inválido: p_month_start deve ser menor que p_next_month_start';
  END IF;

  IF NOT is_service THEN
    IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
      RAISE EXCEPTION 'Acesso negado para o usuário informado';
    END IF;
  END IF;

  SELECT to_jsonb(f) INTO v_forecast
  FROM public.get_month_forecast(p_user_id, p_month_start, p_next_month_start, p_today) f;

  v_spending_breakdown := public.get_spending_breakdown(p_user_id, p_month_start, p_next_month_start);
  v_insights := public.get_financial_insights(p_user_id, p_month_start, p_next_month_start);

  SELECT coalesce(jsonb_agg(row_to_json(g)), '[]'::jsonb)
    INTO v_investment_goals
  FROM public.get_investment_goals_summary(p_user_id, p_month_start, p_next_month_start) g;

  SELECT coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb)
    INTO v_expenses_by_category
  FROM (
    SELECT
      c.id AS category_id,
      c.name,
      sum(t.amount)::numeric(12,2) AS total
    FROM public.transactions t
    LEFT JOIN public.categories c ON c.id = t.category_id
    WHERE t.user_id = p_user_id
      AND t.type = 'expense'
      AND t.date >= p_month_start
      AND t.date < p_next_month_start
      AND (t.parent_transaction_id IS NULL OR coalesce(t.is_installment, false) = true)
    GROUP BY c.id, c.name
    ORDER BY total DESC
    LIMIT 8
  ) x;

  SELECT coalesce(jsonb_agg(row_to_json(i)), '[]'::jsonb)
    INTO v_invoices_summary
  FROM (
    SELECT
      cc.id AS card_id,
      cc.name AS card_name,
      coalesce(sum(CASE WHEN t.invoice_month = p_month_start THEN t.amount ELSE 0 END), 0)::numeric(12,2) AS current_invoice_total,
      coalesce(sum(CASE WHEN t.invoice_month = p_next_month_start THEN t.amount ELSE 0 END), 0)::numeric(12,2) AS next_invoice_total
    FROM public.credit_cards cc
    LEFT JOIN public.transactions t
      ON t.credit_card_id = cc.id
      AND t.user_id = p_user_id
      AND t.type = 'expense'
      AND t.payment_method = 'credit'
      AND (t.parent_transaction_id IS NULL OR coalesce(t.is_installment, false) = true)
      AND t.invoice_month IN (p_month_start, p_next_month_start)
    WHERE cc.user_id = p_user_id
      AND cc.is_archived = false
    GROUP BY cc.id, cc.name
    ORDER BY cc.name
  ) i;

  RETURN jsonb_build_object(
    'forecast', coalesce(v_forecast, '{}'::jsonb),
    'spending_breakdown', coalesce(v_spending_breakdown, '{}'::jsonb),
    'insights', coalesce((
      SELECT jsonb_agg(value)
      FROM (
        SELECT value
        FROM jsonb_array_elements(coalesce(v_insights, '[]'::jsonb))
        LIMIT 3
      ) limited
    ), '[]'::jsonb),
    'investment_goals', coalesce(v_investment_goals, '[]'::jsonb),
    'expenses_by_category', coalesce(v_expenses_by_category, '[]'::jsonb),
    'invoices_summary', coalesce(v_invoices_summary, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_summary(uuid, date, date, date) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_summary(uuid, date, date, date) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_month_forecast(uuid, date, date, date) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.get_month_forecast(uuid, date, date, date) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_spending_breakdown(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_financial_insights(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_investment_goals_summary(uuid, date, date) TO authenticated;
