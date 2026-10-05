alter table letters add column if not exists recipient_user_id text;
create index if not exists letters_recipient_idx on letters (recipient_user_id);
