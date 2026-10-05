create table if not exists profiles (
  user_id text primary key,
  display_name text,
  email text,
  is_admin boolean not null default false,
  affiliate_code text unique,
  credit_brl integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists templates (
  id text primary key,
  name text not null,
  tagline text not null default '',
  src text not null,
  font_family text not null default 'Fraunces, serif',
  ink text not null default 'dark',
  paid boolean not null default false,
  price_brl integer not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists messengers_catalog (
  id text primary key,
  name text not null,
  tagline text not null default '',
  flavor text not null default '',
  speed_kmh double precision not null default 20,
  price_brl integer not null default 0,
  photo_src text not null default '',
  preview_src text not null default '',
  map_src text not null default '',
  arrive_src text not null default '',
  token text not null default 'pigeon',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists letters (
  id text primary key,
  user_id text not null,
  from_name text not null,
  to_name text not null,
  pages_json text not null default '[]',
  template_id text not null,
  messenger_id text not null,
  from_address_json text not null default '{}',
  to_address_json text not null default '{}',
  from_geo_json text not null default '',
  to_geo_json text not null default '',
  paid_brl integer not null default 0,
  coupon_code text,
  affiliate_code text,
  started_at timestamptz not null default now(),
  demo_duration_ms integer not null default 20000
);

create index if not exists letters_user_id_idx on letters (user_id);

create table if not exists coupons (
  id text primary key,
  code text unique not null,
  percent integer not null default 0,
  amount_brl integer not null default 0,
  active boolean not null default true,
  uses integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists affiliate_events (
  id text primary key,
  referrer_user_id text not null,
  buyer_user_id text,
  letter_id text,
  credit_brl integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists visits (
  id serial primary key,
  path text not null,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id text primary key,
  user_id text,
  letter_id text,
  total_brl integer not null,
  method text,
  created_at timestamptz not null default now()
);

insert into templates (id, name, tagline, src, font_family, ink, paid, price_brl, sort_order) values
  ('classico', 'Clássico', 'Papel de carta, tinta de verdade.', '/designs/blank-classico.svg', 'Fraunces, serif', 'dark', false, 0, 1),
  ('rosa', 'Rosa', 'Blush no envelope, peito apertado.', '/designs/blank-rosa.svg', 'Cormorant Garamond, serif', 'dark', false, 0, 2),
  ('polaroid', 'Polaroid', 'Cabe no bolso. Cabe na memória.', '/designs/blank-polaroid.svg', 'Caveat, cursive', 'dark', false, 0, 3),
  ('noite', 'Noite', 'Para o que só se diz no escuro.', '/designs/blank-noite.svg', 'Fraunces, serif', 'light', true, 8, 4),
  ('jardim', 'Jardim', 'Folha, flor, recado entre as nervuras.', '/designs/blank-jardim.svg', 'Cormorant Garamond, serif', 'dark', true, 12, 5),
  ('mapa', 'Mapa', 'A carta já nasce com um caminho.', '/designs/blank-mapa.svg', 'Figtree, sans-serif', 'dark', true, 14, 6)
on conflict (id) do nothing;

insert into messengers_catalog (id, name, tagline, flavor, speed_kmh, price_brl, photo_src, preview_src, map_src, arrive_src, token, sort_order) values
  ('plane', 'Avião', 'Cruzeiro direto.', 'A carta atravessa o céu em linha quase reta.', 750, 39, '/messengers/previews/plane.jpg', '/messengers/previews/plane.mp4', '/messengers/plane.webp', '/messengers/plane-arrive.webp', 'plane', 1),
  ('pigeon', 'Pombo-correio', 'O clássico alado.', 'Rápido, fiel, um pouco dramático no pouso.', 70, 14, '/messengers/previews/pigeon.jpg', '/messengers/previews/pigeon.mp4', '/messengers/pigeon.webp', '/messengers/pigeon-arrive.webp', 'pigeon', 2),
  ('stork', 'Cegonha', 'Leva com cuidado.', 'Voo alto e cerimonioso. Entrega como um presente.', 45, 22, '/messengers/previews/stork.jpg', '/messengers/previews/stork.mp4', '/messengers/stork.webp', '/messengers/stork-arrive.webp', 'stork', 3),
  ('swan', 'Cisne', 'Elegante demais.', 'Desliza como se o mapa fosse um lago.', 32, 26, '/messengers/previews/swan.jpg', '/messengers/previews/swan.mp4', '/messengers/swan.webp', '/messengers/swan-arrive.webp', 'swan', 4),
  ('horse', 'Cavalo', 'Galope constante.', 'Estrada, poeira dourada, chegada altiva.', 28, 24, '/messengers/previews/horse.jpg', '/messengers/previews/horse.mp4', '/messengers/horse.webp', '/messengers/horse-arrive.webp', 'horse', 5),
  ('donkey', 'Jegue', 'Devagar e teimoso.', 'Não tem pressa. A espera faz parte da carta.', 8, 16, '/messengers/previews/donkey.jpg', '/messengers/previews/donkey.mp4', '/messengers/donkey.webp', '/messengers/donkey-arrive.webp', 'donkey', 6),
  ('turtle', 'Tartaruga', 'A mais lenta. A mais lembrada.', 'Quem escolhe a tartaruga quer que a saudade dure.', 1.2, 11, '/messengers/previews/turtle.jpg', '/messengers/previews/turtle.mp4', '/messengers/turtle.webp', '/messengers/turtle-arrive.webp', 'turtle', 7)
on conflict (id) do nothing;

insert into coupons (id, code, percent, amount_brl, active) values
  ('welcome10', 'AMOR10', 10, 0, true)
on conflict (id) do nothing;
