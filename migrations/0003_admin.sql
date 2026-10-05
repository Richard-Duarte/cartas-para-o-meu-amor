create table if not exists admin_users (
  id text primary key,
  username text unique not null,
  password_hash text not null,
  updated_at timestamptz not null default now()
);

create table if not exists admin_sessions (
  token text primary key,
  created_at timestamptz not null default now()
);

create table if not exists app_settings (
  key text primary key,
  value text not null
);

insert into app_settings (key, value) values ('affiliate_percent', '10')
on conflict (key) do nothing;

alter table profiles add column if not exists payable_brl integer not null default 0;
alter table affiliate_events add column if not exists commission_brl integer not null default 0;
