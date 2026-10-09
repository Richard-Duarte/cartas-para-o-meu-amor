alter table letters add column if not exists anonymous boolean not null default false;
alter table letters add column if not exists recipient_phone text;
alter table letters add column if not exists recipient_email text;
alter table letters add column if not exists sender_phone text;
alter table letters add column if not exists sender_email text;
alter table letters add column if not exists share_origin text;
alter table letters add column if not exists scheduled boolean not null default false;
alter table letters add column if not exists depart_at timestamptz;
alter table letters add column if not exists arrive_at timestamptz;
alter table letters add column if not exists notice_at timestamptz;
alter table letters add column if not exists notice_sent_at timestamptz;
alter table letters add column if not exists notice_error text;

create index if not exists letters_notice_due_idx on letters (notice_at)
  where notice_sent_at is null;
