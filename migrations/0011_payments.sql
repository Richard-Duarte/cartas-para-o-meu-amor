-- Pagamentos reais (Mercado Pago). Tabela NOVA e separada: não altera, não apaga e não trava
-- `letters` nem `orders`. A carta só é criada (em `letters`) depois do pagamento aprovado.
create table if not exists payment_intents (
  id text primary key,
  user_id text not null,
  letter_id text not null,
  provider text not null default 'mercadopago',
  status text not null default 'created',
  status_detail text,
  method text,
  amount_brl numeric not null,
  credit_brl numeric not null default 0,
  mp_payment_id text,
  payload_json text not null,
  client_ip text,
  client_ua text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  placed_at timestamptz
);
create index if not exists payment_intents_mp_idx on payment_intents (mp_payment_id);
create index if not exists payment_intents_user_idx on payment_intents (user_id);
