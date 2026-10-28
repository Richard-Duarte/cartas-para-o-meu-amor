-- Primeira abertura por pessoa: a animação de entrega (chegada do mensageiro + envelope) é
-- de quem RECEBE. Uma linha por (carta, conta) — o remetente e o admin nunca gravam aqui.
-- SÓ ADITIVO: tabela nova. Não altera, não apaga e não trava cartas existentes.
create table if not exists letter_views (
  letter_id text not null,
  user_id text not null,
  first_view_at timestamptz not null default now(),
  arrival_seen_at timestamptz,
  primary key (letter_id, user_id)
);
