/**
 * Moderação (só servidor): bloqueio de contas, pedidos de desbloqueio e registro de auditoria.
 * Igual a migrations/0012_admin_moderacao.sql — o "create if not exists" aqui só cobre o banco
 * local (PGLite) ou um deploy cuja migração ainda não rodou. Tudo aditivo.
 */
import type { getSql } from "@/lib/db";

type Sql = Awaited<ReturnType<typeof getSql>>;

const g = globalThis as typeof globalThis & { __moderationReady__?: boolean };

export async function ensureModerationTables(sql: Sql) {
  if (g.__moderationReady__) return;
  await sql`alter table profiles add column if not exists blocked_at timestamptz`;
  await sql`alter table profiles add column if not exists blocked_by text`;
  await sql`alter table profiles add column if not exists block_reason text`;
  await sql`create table if not exists user_blocks (
    id text primary key, user_id text not null, action text not null, reason text, admin_label text,
    created_at timestamptz not null default now())`;
  await sql`create table if not exists unblock_requests (
    id text primary key, user_id text not null, message text not null, status text not null default 'pending',
    admin_note text, resolved_by text, resolved_at timestamptz, created_at timestamptz not null default now())`;
  await sql`create table if not exists admin_audit_log (
    id text primary key, admin_label text not null, action text not null, target_user_id text, letter_id text,
    detail text, created_at timestamptz not null default now())`;
  await sql`create table if not exists user_attribution (
    user_id text primary key, channel text, utm_source text, utm_medium text, utm_campaign text, utm_content text,
    utm_term text, fbclid text, ttclid text, gclid text, referrer text, landing_path text, first_seen_at timestamptz,
    platform text, os text, browser text, device text, display_mode text, user_agent text,
    created_at timestamptz not null default now())`;
  g.__moderationReady__ = true;
}

export type BlockState = { blocked: boolean; reason: string; blockedAt: string | null };

export async function blockState(sql: Sql, userId: string): Promise<BlockState> {
  await ensureModerationTables(sql);
  const rows = await sql<{ blocked_at: string | null; block_reason: string | null }>`
    select blocked_at::text as blocked_at, block_reason from profiles where user_id = ${userId} limit 1
  `;
  const r = rows[0];
  return { blocked: Boolean(r?.blocked_at), reason: r?.block_reason ?? "", blockedAt: r?.blocked_at ?? null };
}

/** Recusa a ação de uma conta bloqueada (criar, enviar, pagar, comentar, sacar…). */
export async function assertNotBlocked(sql: Sql, userId: string) {
  const s = await blockState(sql, userId);
  if (s.blocked) throw new Error("Sua conta está bloqueada. Abra o site para ver o motivo e pedir o desbloqueio.");
}

/** Registro de auditoria: nunca derruba a ação, mas a leitura/baixa de carta só segue se gravar. */
export async function audit(
  sql: Sql,
  entry: { admin: string; action: string; userId?: string | null; letterId?: string | null; detail?: string | null },
) {
  await ensureModerationTables(sql);
  await sql`
    insert into admin_audit_log (id, admin_label, action, target_user_id, letter_id, detail)
    values (${crypto.randomUUID()}, ${entry.admin.slice(0, 200)}, ${entry.action.slice(0, 60)},
      ${entry.userId ?? null}, ${entry.letterId ?? null}, ${entry.detail ? entry.detail.slice(0, 500) : null})
  `;
}

/**
 * Cartas de conta bloqueada saem do ar (pedido do Richard): nada é apagado nem alterado na carta —
 * ela só fica oculta enquanto quem ENVIOU estiver bloqueado. Desbloqueou, volta exatamente como era
 * (o horário de chegada é fixo, então a viagem aparece onde estaria).
 */
export async function senderBlocked(sql: Sql, senderUserId: string | null | undefined) {
  if (!senderUserId) return false;
  return (await blockState(sql, senderUserId)).blocked;
}

/** Ids, dentre `ids`, de cartas cujo remetente está bloqueado. */
export async function hiddenLetterIds(sql: Sql, ids: string[]) {
  if (!ids.length) return new Set<string>();
  await ensureModerationTables(sql);
  const rows = await sql<{ id: string }>`
    select l.id from letters l join profiles p on p.user_id = l.user_id
    where p.blocked_at is not null and l.id = any(${ids})
  `;
  return new Set(rows.map((r) => r.id));
}
