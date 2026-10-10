create table if not exists notifications (
  id text primary key,
  user_id text not null,
  kind text not null,
  title text not null,
  body text not null default '',
  href text,
  letter_id text,
  source_id text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on notifications (user_id, created_at desc);

create table if not exists letter_replies (
  id text primary key,
  letter_id text not null,
  author_user_id text not null,
  body text not null default '',
  photo_data text,
  created_at timestamptz not null default now()
);

create index if not exists letter_replies_letter_idx on letter_replies (letter_id, created_at);

create table if not exists platform_notices (
  id text primary key,
  title text not null,
  body text not null default '',
  kind text not null default 'platform',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table letters add column if not exists viewed_at timestamptz;
alter table profiles add column if not exists phone text;

insert into platform_notices (id, title, body, kind)
values (
  'casa-1',
  'A casa deixa recados aqui.',
  'Visualizações, respostas e avisos da plataforma caem neste sininho.',
  'platform'
)
on conflict (id) do nothing;
