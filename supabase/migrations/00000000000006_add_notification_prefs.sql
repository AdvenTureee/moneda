-- 00000000000006_add_notification_prefs.sql
-- Adiciona coluna `notification_prefs` (jsonb) em `profiles` com defaults.
-- Idempotente: ADD COLUMN IF NOT EXISTS permite re-rodar.
--
-- Chaves esperadas no JSON:
--   email_summary_weekly: bool  — resumo semanal por email
--   email_budget_alert:   bool  — alerta quando orçamento estourar
--   push_budget_alert:    bool  — push (futuro) quando orçamento estourar
--
-- Dependências: 00000000000002_init_core_tables.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT
    '{"email_summary_weekly": true, "email_budget_alert": true, "push_budget_alert": false}'::jsonb;
