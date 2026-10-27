-- Painel admin: origem dos usuários, moderação (bloqueio + pedidos de desbloqueio) e registro de auditoria.
-- SÓ ADITIVO: tabelas novas e colunas novas (nulas). Não altera, não apaga e não trava cartas existentes.

-- Origem (primeiro toque) e plataforma de cada conta nova. Contas antigas não têm linha = "desconhecido".
create table if not exists user_attribution (
  user_id text primary key,
  channel text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  fbclid text,
  ttclid text,
  gclid text,
  referrer text,
  landing_path text,
  first_seen_at timestamptz,
  platform text,
  os text,
  browser text,
  device text,
  display_mode text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists user_attribution_channel_idx on user_attribution (channel);
create index if not exists user_attribution_campaign_idx on user_attribution (utm_campaign);

-- Último toque da compra (tabela já existente): só ganha o gclid.
alter table letter_attribution add column if not exists gclid text;

-- Estado atual do bloqueio (o histórico completo fica em user_blocks).
alter table profiles add column if not exists blocked_at timestamptz;
alter table profiles add column if not exists blocked_by text;
alter table profiles add column if not exists block_reason text;

create table if not exists user_blocks (
  id text primary key,
  user_id text not null,
  action text not null,
  reason text,
  admin_label text,
  created_at timestamptz not null default now()
);
create index if not exists user_blocks_user_idx on user_blocks (user_id, created_at desc);

create table if not exists unblock_requests (
  id text primary key,
  user_id text not null,
  message text not null,
  status text not null default 'pending',
  admin_note text,
  resolved_by text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists unblock_requests_user_idx on unblock_requests (user_id, created_at desc);
create index if not exists unblock_requests_status_idx on unblock_requests (status);

-- Toda leitura/baixa de carta e toda ação de moderação feita no painel.
create table if not exists admin_audit_log (
  id text primary key,
  admin_label text not null,
  action text not null,
  target_user_id text,
  letter_id text,
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_log_user_idx on admin_audit_log (target_user_id, created_at desc);
create index if not exists admin_audit_log_created_idx on admin_audit_log (created_at desc);
