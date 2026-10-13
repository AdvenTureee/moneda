-- ============================================================================
-- Backup das funções — extraído em 2026-08-28
-- Para restaurar: cole cada definição no SQL Editor e rode.
-- ============================================================================

-- 1. get_dashboard_page (SECURITY DEFINER, sem search_path)
CREATE OR REPLACE FUNCTION public.get_dashboard_page(p_user_id uuid, p_period text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_start date;
  v_end date;
  result jsonb;
BEGIN
  v_start := to_date(p_period || '-01', 'YYYY-MM-DD');
  v_end := (v_start + interval '1 month')::date;

  WITH period_expenses AS (
    SELECT
      id,
      amount_cents,
      category_id,
      description,
      occurred_at,
      source,
      tags,
      is_recurring,
      receipt_path,
      receipt_file_name,
      receipt_mime_type,
      receipt_size_bytes,
      receipt_uploaded_at
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
        'id',                     pe.id,
        'amount',                 pe.amount_cents,
        'category',               pe.category_id,
        'description',            pe.description,
        'occurred_at',            pe.occurred_at,
        'source',                 pe.source,
        'tags',                   pe.tags,
        'is_recurring',           pe.is_recurring,
        'receipt_path',           pe.receipt_path,
        'receipt_file_name',      pe.receipt_file_name,
        'receipt_mime_type',      pe.receipt_mime_type,
        'receipt_size_bytes',     pe.receipt_size_bytes,
        'receipt_uploaded_at',    pe.receipt_uploaded_at
      ) ORDER BY pe.occurred_at DESC)
      FROM period_expenses pe
    ), '[]'::jsonb)

  ) INTO result;

  RETURN result;
END;
$function$;

-- 2. handle_new_user (SECURITY DEFINER, search_path = 'public' — já seguro)
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  accepted_terms boolean := coalesce((new.raw_user_meta_data->>'terms_accepted')::boolean, false);
begin
  insert into public.profiles (
    id,
    terms_accepted_at,
    terms_version,
    privacy_accepted_at
  )
  values (
    new.id,
    case
      when accepted_terms then nullif(new.raw_user_meta_data->>'terms_accepted_at', '')::timestamptz
      else null
    end,
    case
      when accepted_terms then nullif(new.raw_user_meta_data->>'terms_version', '')
      else null
    end,
    case
      when accepted_terms then nullif(new.raw_user_meta_data->>'privacy_accepted_at', '')::timestamptz
      else null
    end
  );

  return new;
end;
$function$;

-- 3. set_updated_at (sem SECURITY DEFINER, sem search_path)
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 4. unlink_google_identity (SECURITY DEFINER, search_path = 'auth' — já seguro)
CREATE OR REPLACE FUNCTION public.unlink_google_identity()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'auth'
AS $function$
begin
  if auth.uid() is null then
    raise exception 'Não autorizado';
  end if;

  delete from auth.identities
  where user_id = auth.uid()
    and provider = 'google';
end;
$function$;

-- 5. Índice original (referencia public.gin_trgm_ops)
-- CREATE INDEX "expenses_description_trgm_idx" ON "public"."expenses" USING "gin" ("description" "public"."gin_trgm_ops");

-- 6. Única coluna citext: profiles.email
