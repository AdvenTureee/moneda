-- Comprovantes de gastos: bucket privado + metadados na despesa.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'expense_receipts',
  'expense_receipts',
  false,
  10485760,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

ALTER TABLE public.expenses
  ADD COLUMN receipt_path text,
  ADD COLUMN receipt_file_name text,
  ADD COLUMN receipt_mime_type text,
  ADD COLUMN receipt_size_bytes bigint CHECK (receipt_size_bytes IS NULL OR receipt_size_bytes > 0),
  ADD COLUMN receipt_uploaded_at timestamptz;

COMMENT ON COLUMN public.expenses.receipt_path IS 'Caminho privado no bucket storage expense_receipts.';
COMMENT ON COLUMN public.expenses.receipt_file_name IS 'Nome original do arquivo de comprovante.';
COMMENT ON COLUMN public.expenses.receipt_mime_type IS 'MIME type do comprovante.';
COMMENT ON COLUMN public.expenses.receipt_size_bytes IS 'Tamanho do comprovante em bytes.';
COMMENT ON COLUMN public.expenses.receipt_uploaded_at IS 'Quando o comprovante foi anexado.';

CREATE INDEX expenses_receipt_path_idx
  ON public.expenses (receipt_path)
  WHERE receipt_path IS NOT NULL;

-- Policies defensivas caso o client autenticado acesse Storage diretamente.
-- A aplicação usa Route Handler server-side com service_role para validar a posse
-- da despesa antes de assinar URLs, subir ou remover arquivos.
CREATE POLICY expense_receipts_select_own
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'expense_receipts'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

CREATE POLICY expense_receipts_insert_own
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'expense_receipts'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

CREATE POLICY expense_receipts_update_own
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'expense_receipts'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'expense_receipts'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

CREATE POLICY expense_receipts_delete_own
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'expense_receipts'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

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
$$;
