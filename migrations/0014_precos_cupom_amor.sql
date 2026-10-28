-- Preços novos com centavos + cupom AMOR (2º envio grátis).
-- Só adiciona / atualiza catálogo. Nenhuma carta é apagada, tirada do ar ou repreçada:
-- `letters.paid_brl` e `orders.total_brl` só ganham casas decimais (o valor pago fica igual).

-- 1) Valores com centavos (ex.: 4,90). integer -> numeric(10,2) preserva cada valor antigo (14 -> 14.00).
alter table messengers_catalog alter column price_brl type numeric(10,2) using price_brl::numeric(10,2);
alter table templates alter column price_brl type numeric(10,2) using price_brl::numeric(10,2);
alter table letters alter column paid_brl type numeric(10,2) using paid_brl::numeric(10,2);
alter table orders alter column total_brl type numeric(10,2) using total_brl::numeric(10,2);
alter table coupons alter column amount_brl type numeric(10,2) using amount_brl::numeric(10,2);

-- 2) Mensageiros (valem só para cartas novas).
update messengers_catalog set price_brl = 4.90 where id = 'turtle';
update messengers_catalog set price_brl = 5.90 where id = 'donkey';
update messengers_catalog set price_brl = 6.90 where id = 'pigeon';
update messengers_catalog set price_brl = 9.90 where id = 'horse';
update messengers_catalog set price_brl = 12.90 where id = 'stork';
update messengers_catalog set price_brl = 14.90 where id = 'swan';
update messengers_catalog set price_brl = 19.90 where id = 'plane';

-- 3) Papéis. Os do app que ainda não estavam no banco entram agora (o servidor passa a cobrar o
--    preço certo deles). Os grátis continuam grátis.
insert into templates (id, name, tagline, src, font_family, ink, paid, price_brl, sort_order) values
  ('noite', 'Noite', 'Para o que só se diz no escuro.', '/designs/blank-noite.svg', 'Fraunces, serif', 'light', true, 2.90, 4),
  ('jardim', 'Jardim', 'Folha, flor, recado entre as nervuras.', '/designs/blank-jardim.svg', 'Cormorant Garamond, serif', 'dark', true, 3.90, 5),
  ('mapa', 'Mapa', 'A carta já nasce com um caminho.', '/designs/blank-mapa.svg', 'Figtree, sans-serif', 'dark', true, 3.90, 6),
  ('coracoes', 'Corações Pastel', 'Corações de algodão-doce em volta das palavras.', '/designs/blank-coracoes.svg', 'Quicksand, sans-serif', 'dark', false, 0, 7),
  ('nuvens', 'Nuvens', 'Arco-íris e nuvem fofa para dias leves.', '/designs/blank-nuvens.svg', 'Nunito, sans-serif', 'dark', false, 0, 8),
  ('flores', 'Flores', 'Um buquê nas bordas, o recado no meio.', '/designs/blank-flores.svg', 'Dancing Script, cursive', 'dark', true, 1.90, 9),
  ('piquenique', 'Piquenique', 'Toalha xadrez, morango e tarde de domingo.', '/designs/blank-piquenique.svg', 'Satisfy, cursive', 'dark', true, 1.90, 10),
  ('retro', 'Carta Retrô', 'Par avion, selo e saudade carimbada.', '/designs/blank-retro.svg', 'Libre Baskerville, serif', 'dark', true, 2.90, 11),
  ('ursinho', 'Ursinho', 'Um abraço de pelúcia em cada linha.', '/designs/blank-ursinho.svg', 'Comfortaa, sans-serif', 'dark', true, 2.90, 12),
  ('estrelada', 'Noite Estrelada', 'Lua, céu inteiro e só nós dois acordados.', '/designs/blank-estrelada.svg', 'Cormorant Garamond, serif', 'light', true, 2.90, 13),
  ('scrapbook', 'Scrapbook', 'Fita adesiva, polaroid e memória colada.', '/designs/blank-scrapbook.svg', 'Indie Flower, cursive', 'dark', true, 3.90, 14)
on conflict (id) do update set paid = excluded.paid, price_brl = excluded.price_brl;
update templates set paid = false, price_brl = 0 where id in ('classico', 'rosa', 'polaroid', 'coracoes', 'nuvens');

-- 4) Adicionais.
insert into app_settings (key, value) values ('anonymous_fee', '5.9')
on conflict (key) do update set value = excluded.value;
insert into app_settings (key, value) values ('schedule_fee', '1.9')
on conflict (key) do update set value = excluded.value;

-- 5) Cupom AMOR: 100% do 2º envio, 1x por conta, só com login e com 1 carta já enviada.
--    A regra fica em `rule` (o servidor confere tudo; o navegador só mostra).
alter table coupons add column if not exists rule text;
insert into coupons (id, code, percent, amount_brl, active, rule) values
  ('amor-segundo-envio', 'AMOR', 100, 0, true, 'second_send')
on conflict (id) do update set rule = excluded.rule;

-- 6) Usos de cupom e de código de indicação (contador do painel e trava do "1x por conta").
create table if not exists coupon_redemptions (
  id text primary key,
  code text not null,
  kind text not null default 'coupon',
  user_id text not null,
  letter_id text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists coupon_redemptions_letter_idx on coupon_redemptions (code, letter_id);
-- AMOR: uma vez por conta (unique code + user_id).
create unique index if not exists coupon_redemptions_once_idx on coupon_redemptions (code, user_id)
  where code = 'AMOR';
create index if not exists coupon_redemptions_code_idx on coupon_redemptions (code);

-- Histórico: usos que já estavam nas cartas entram no contador (só leitura das cartas).
insert into coupon_redemptions (id, code, kind, user_id, letter_id, created_at)
select 'c-' || id, upper(coupon_code), 'coupon', user_id, id, started_at
from letters where coalesce(coupon_code, '') <> ''
on conflict do nothing;
insert into coupon_redemptions (id, code, kind, user_id, letter_id, created_at)
select 'r-' || id, affiliate_code, 'referral', user_id, id, started_at
from letters where coalesce(affiliate_code, '') <> ''
on conflict do nothing;
