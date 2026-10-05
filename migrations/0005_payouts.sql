create table if not exists affiliate_payouts (
  id text primary key,
  user_id text not null,
  amount_brl integer not null,
  pix_key text not null,
  pix_kind text not null default 'aleatoria',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists affiliate_payouts_user_idx on affiliate_payouts (user_id);
create index if not exists affiliate_payouts_status_idx on affiliate_payouts (status);
