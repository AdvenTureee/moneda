-- RPC que retorna todos os dados da dashboard em uma única chamada.
-- Elimina 6+ round trips HTTP separados ao PostgREST.
-- Chamado por getDashboardMetricsFromDB via supabase.rpc('get_dashboard_page', ...).

CREATE OR REPLACE FUNCTION get_dashboard_page(p_user_id uuid, p_period text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_start date;
  v_end date;
  result jsonb;
BEGIN
  v_start := to_date(p_period || '-01', 'YYYY-MM-DD');
  v_end := (v_start + interval '1 month')::date;

  WITH period_expenses AS (
    SELECT id, amount_cents, category_id, description, occurred_at, source, tags, is_recurring
    FROM expenses
    WHERE user_id = p_user_id
      AND deleted_at IS NULL
      AND occurred_at >= v_start
      AND occurred_at < v_end
  )
  SELECT jsonb_build_object(
    'total_spent',        COALESCE((SELECT SUM(amount_cents) FROM period_expenses), 0),
    'expense_count',      (SELECT COUNT(*) FROM period_expenses),

    'monthly_budget_cents', COALESCE(
      (SELECT monthly_income_cents FROM profiles WHERE id = p_user_id), 0
    ) + COALESCE((
      SELECT SUM(amount_cents) FROM incomes
      WHERE user_id = p_user_id AND deleted_at IS NULL
        AND (is_recurring = true OR (received_at >= v_start AND received_at < v_end))
    ), 0),

    'top_categories', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'category_id', sub.category_id,
        'amount',       sub.amount
      ) ORDER BY sub.amount DESC)
      FROM (
        SELECT pe.category_id, SUM(pe.amount_cents) AS amount
        FROM period_expenses pe
        GROUP BY pe.category_id
      ) sub
    ), '[]'::jsonb),

    'daily_spending', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'date',   sub.date,
        'amount', sub.amount
      ) ORDER BY sub.date)
      FROM (
        SELECT to_char(pe.occurred_at, 'YYYY-MM-DD') AS date,
               SUM(pe.amount_cents) AS amount
        FROM period_expenses pe
        GROUP BY to_char(pe.occurred_at, 'YYYY-MM-DD')
      ) sub
    ), '[]'::jsonb),

    'all_expenses', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id',           pe.id,
        'amount',       pe.amount_cents,
        'category',     pe.category_id,
        'description',  pe.description,
        'occurred_at',  pe.occurred_at,
        'source',       pe.source,
        'tags',         pe.tags,
        'is_recurring', pe.is_recurring
      ) ORDER BY pe.occurred_at DESC)
      FROM period_expenses pe
    ), '[]'::jsonb)

  ) INTO result;

  RETURN result;
END;
$$;
