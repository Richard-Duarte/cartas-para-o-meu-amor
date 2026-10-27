-- Respostas de cartas (conversa infinita). Só adiciona colunas/índices: não apaga nem muda nada.
alter table letters add column if not exists reply_to_letter_id text;
alter table letters add column if not exists thread_id text;
create index if not exists letters_reply_to_idx on letters (reply_to_letter_id);
create index if not exists letters_thread_idx on letters (thread_id);
