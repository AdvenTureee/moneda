create table if not exists public.account_deletion_feedback (
  id uuid primary key default gen_random_uuid(),
  reason_codes text[] not null default array[]::text[],
  other_reason text,
  created_at timestamp with time zone not null default now(),
  constraint account_deletion_feedback_other_reason_check
    check (other_reason is null or length(other_reason) <= 500),
  constraint account_deletion_feedback_reason_codes_check
    check (
      reason_codes <@ array[
        'not_using',
        'hard_to_use',
        'missing_feature',
        'technical_issue',
        'privacy_concern',
        'other'
      ]::text[]
    )
);

comment on table public.account_deletion_feedback is
  'Feedback anonymized from account deletion flow. Does not store user id, email, name, or phone.';

alter table public.account_deletion_feedback enable row level security;

revoke all on table public.account_deletion_feedback from anon;
revoke all on table public.account_deletion_feedback from authenticated;
grant select, insert on table public.account_deletion_feedback to service_role;
