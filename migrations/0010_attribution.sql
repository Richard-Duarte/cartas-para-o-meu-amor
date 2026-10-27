-- Origem do anúncio (UTM / fbclid / ttclid) por carta. Tabela NOVA e separada:
-- não altera, não apaga e não trava `letters` nem `orders`. Cartas antigas simplesmente não têm linha aqui.
create table if not exists letter_attribution (
  letter_id text primary key,
  user_id text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  fbclid text,
  ttclid text,
  landing_path text,
  referrer text,
  first_seen_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists letter_attribution_campaign_idx on letter_attribution (utm_campaign);
