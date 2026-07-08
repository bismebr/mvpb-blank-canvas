alter table public.subscriptions
  add column stripe_customer_id text,
  add column stripe_subscription_id text,
  add column stripe_price_id text,
  add column cancel_at_period_end boolean not null default false,
  add column last_stripe_event_at timestamptz;

comment on column public.subscriptions.stripe_customer_id is 'Stripe Customer ID (cus_xxx) vinculado à empresa';
comment on column public.subscriptions.stripe_subscription_id is 'Stripe Subscription ID (sub_xxx) — único por empresa ativa';
comment on column public.subscriptions.stripe_price_id is 'Stripe Price ID (price_xxx) do plano selecionado';
comment on column public.subscriptions.cancel_at_period_end is 'Se true, cancelamento ocorre ao fim do período pago';
comment on column public.subscriptions.last_stripe_event_at is 'Timestamp do último evento Stripe processado para idempotência';

create unique index idx_subscriptions_stripe_customer_id
  on public.subscriptions(stripe_customer_id)
  where stripe_customer_id is not null;

create unique index idx_subscriptions_stripe_subscription_id
  on public.subscriptions(stripe_subscription_id)
  where stripe_subscription_id is not null;

create index idx_subscriptions_stripe_price_id
  on public.subscriptions(stripe_price_id);

create index idx_subscriptions_last_stripe_event_at
  on public.subscriptions(last_stripe_event_at);