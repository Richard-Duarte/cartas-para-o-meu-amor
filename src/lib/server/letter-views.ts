/**
 * Animação de entrega por pessoa (não por carta).
 *
 * A chegada do mensageiro e a abertura do envelope são da pessoa que RECEBE: na primeira
 * vez que ELA abre a carta já entregue, a viagem termina na frente dela e o envelope chega.
 * Só a conta destinatária grava aqui (`letter_views`). Quem enviou, o admin e quem só
 * visualiza nunca gravam nada, então nada do que eles fazem muda a experiência de quem recebe.
 */
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

type Sql = Awaited<ReturnType<typeof getSql>>;

async function ensureLetterViews(sql: Sql) {
  await sql`
    create table if not exists letter_views (
      letter_id text not null,
      user_id text not null,
      first_view_at timestamptz not null default now(),
      arrival_seen_at timestamptz,
      primary key (letter_id, user_id)
    )
  `;
}

/** A conta logada é a destinatária (e não quem enviou) desta carta? */
async function isRecipient(sql: Sql, letterId: string, userId: string) {
  const rows = await sql<{ ok: boolean }>`
    select true as ok from letters
    where id = ${letterId} and recipient_user_id = ${userId} and user_id <> ${userId}
    limit 1
  `;
  return rows.length > 0;
}

/** `firstArrival: true` = a destinatária ainda não viu a chegada desta carta. */
export const letterArrivalState = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => String(id).slice(0, 16))
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    if (!(await isRecipient(sql, id, context.userId))) return { firstArrival: false };
    await ensureLetterViews(sql);
    await sql`
      insert into letter_views (letter_id, user_id) values (${id}, ${context.userId})
      on conflict (letter_id, user_id) do nothing
    `;
    const rows = await sql<{ seen: boolean }>`
      select (arrival_seen_at is not null) as seen from letter_views
      where letter_id = ${id} and user_id = ${context.userId} limit 1
    `;
    return { firstArrival: !rows[0]?.seen };
  });

/** A destinatária abriu o envelope: a primeira chegada foi vista (só a conta dela). */
export const markArrivalSeen = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => String(id).slice(0, 16))
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    if (!(await isRecipient(sql, id, context.userId))) return { ok: false };
    await ensureLetterViews(sql);
    await sql`
      insert into letter_views (letter_id, user_id, arrival_seen_at) values (${id}, ${context.userId}, now())
      on conflict (letter_id, user_id) do update set arrival_seen_at = coalesce(letter_views.arrival_seen_at, now())
    `;
    return { ok: true };
  });
