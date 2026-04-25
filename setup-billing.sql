-- Stripe billing fields on app_members
alter table if exists public.app_members
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text,
  add column if not exists current_period_end timestamptz,
  add column if not exists plan_interval text check (plan_interval in ('month', 'year'));

create index if not exists app_members_stripe_customer_id_idx
  on public.app_members (stripe_customer_id);

create index if not exists app_members_stripe_subscription_id_idx
  on public.app_members (stripe_subscription_id);
