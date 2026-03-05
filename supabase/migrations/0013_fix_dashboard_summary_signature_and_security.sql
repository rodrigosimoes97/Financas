-- Fix definitivo da assinatura RPC get_dashboard_summary para PostgREST schema cache
-- Objetivo: manter apenas a função com assinatura exata esperada no frontend
-- public.get_dashboard_summary(p_user_id uuid, p_month_start date, p_next_month_start date, p_today date)

-- 1) Remover overload legado que pode conflitar no cache
DROP FUNCTION IF EXISTS public.get_dashboard_summary(uuid, date);

-- 2) Recriar função principal com assinatura exata e validação de usuário autenticado
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
  v_auth_user uuid := auth.uid();
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

  -- Segurança obrigatória para chamadas com JWT do usuário
  -- Padrão mais seguro solicitado: auth.uid() = p_user_id
  IF v_auth_user IS NULL OR v_auth_user <> p_user_id THEN
    RAISE EXCEPTION 'Acesso negado para o usuário informado';
  END IF;

  v_forecast := public.get_month_forecast(p_user_id, p_month_start, p_next_month_start, p_today);
  v_spending_breakdown := public.get_spending_breakdown(p_user_id, p_month_start, p_next_month_start);
  v_insights := public.get_financial_insights(p_user_id, p_month_start, p_next_month_start);

  SELECT COALESCE(jsonb_agg(row_to_json(g)), '[]'::jsonb)
    INTO v_investment_goals
  FROM public.get_investment_goals_summary(p_user_id, p_month_start, p_next_month_start) g;

  SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb)
    INTO v_expenses_by_category
  FROM (
    SELECT
      c.id AS category_id,
      c.name,
      SUM(t.amount)::numeric(12,2) AS total
    FROM public.transactions t
    LEFT JOIN public.categories c ON c.id = t.category_id
    WHERE t.user_id = p_user_id
      AND t.type = 'expense'
      AND t.date >= p_month_start
      AND t.date < p_next_month_start
      AND (t.parent_transaction_id IS NULL OR COALESCE(t.is_installment, false) = true)
    GROUP BY c.id, c.name
    ORDER BY total DESC
    LIMIT 8
  ) x;

  SELECT COALESCE(jsonb_agg(row_to_json(i)), '[]'::jsonb)
    INTO v_invoices_summary
  FROM (
    SELECT
      cc.id AS card_id,
      cc.name AS card_name,
      COALESCE(SUM(CASE WHEN t.invoice_month = p_month_start THEN t.amount ELSE 0 END), 0)::numeric(12,2) AS current_invoice_total,
      COALESCE(SUM(CASE WHEN t.invoice_month = p_next_month_start THEN t.amount ELSE 0 END), 0)::numeric(12,2) AS next_invoice_total
    FROM public.credit_cards cc
    LEFT JOIN public.transactions t
      ON t.credit_card_id = cc.id
      AND t.user_id = p_user_id
      AND t.type = 'expense'
      AND t.payment_method = 'credit'
      AND (t.parent_transaction_id IS NULL OR COALESCE(t.is_installment, false) = true)
      AND t.invoice_month IN (p_month_start, p_next_month_start)
    WHERE cc.user_id = p_user_id
      AND cc.is_archived = false
    GROUP BY cc.id, cc.name
    ORDER BY cc.name
  ) i;

  RETURN jsonb_build_object(
    'forecast', COALESCE(v_forecast, '{}'::jsonb),
    'spending_breakdown', COALESCE(v_spending_breakdown, '{}'::jsonb),
    'insights', COALESCE((
      SELECT jsonb_agg(value)
      FROM (
        SELECT value
        FROM jsonb_array_elements(COALESCE(v_insights, '[]'::jsonb))
        LIMIT 3
      ) limited
    ), '[]'::jsonb),
    'investment_goals', COALESCE(v_investment_goals, '[]'::jsonb),
    'expenses_by_category', COALESCE(v_expenses_by_category, '[]'::jsonb),
    'invoices_summary', COALESCE(v_invoices_summary, '[]'::jsonb)
  );
END;
$$;

-- 3) Permissões para PostgREST/authenticated
GRANT EXECUTE ON FUNCTION public.get_dashboard_summary(uuid, date, date, date) TO authenticated;

-- 4) "Touch" para ajudar atualização de cache/catalog
COMMENT ON FUNCTION public.get_dashboard_summary(uuid, date, date, date)
  IS 'Dashboard summary RPC with exact signature for PostgREST schema cache.';
