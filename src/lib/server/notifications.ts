import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { whatsAppNumber } from "@/lib/delivery";
import type { NoticeItem, NoticeKind } from "@/lib/notice-action";
import { requireAdminSession } from "@/lib/server/admin-auth";

type Sql = Awaited<ReturnType<typeof getSql>>;

const KINDS = new Set<NoticeKind>(["view", "reply", "phone", "platform", "update"]);

async function ensureNoticeTables(sql: Sql) {
  await sql`
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
    )
  `;
  await sql`create index if not exists notifications_user_idx on notifications (user_id, created_at desc)`;
  await sql`
    create table if not exists letter_replies (
      id text primary key,
      letter_id text not null,
      author_user_id text not null,
      body text not null default '',
      photo_data text,
      created_at timestamptz not null default now()
    )
  `;
  await sql`create index if not exists letter_replies_letter_idx on letter_replies (letter_id, created_at)`;
  await sql`
    create table if not exists platform_notices (
      id text primary key,
      title text not null,
      body text not null default '',
      kind text not null default 'platform',
      active boolean not null default true,
      created_at timestamptz not null default now()
    )
  `;
  await sql`alter table letters add column if not exists viewed_at timestamptz`;
  await sql`alter table profiles add column if not exists phone text`;
  await sql`
    insert into platform_notices (id, title, body, kind)
    values (
      'casa-1',
      'A casa deixa recados aqui.',
      'Visualizações, respostas e avisos da plataforma caem neste sininho.',
      'platform'
    )
    on conflict (id) do nothing
  `;
}

function asKind(kind: string): NoticeKind {
  return KINDS.has(kind as NoticeKind) ? (kind as NoticeKind) : "platform";
}

async function fanOut(sql: Sql, userId: string) {
  await sql`
    insert into notifications (id, user_id, kind, title, body)
    select ${`phone-${userId}`}, ${userId}, 'phone', 'Cadastre seu número',
      'Sem WhatsApp, os avisos de chegada chegam só por e-mail.'
    where not exists (
      select 1 from profiles
      where user_id = ${userId} and phone is not null and length(trim(phone)) > 0
    )
    on conflict (id) do nothing
  `;
  const notices = await sql<{ id: string; title: string; body: string; kind: string }>`
    select id, title, body, kind from platform_notices where active = true order by created_at
  `;
  for (const notice of notices) {
    const kind = notice.kind === "update" ? "update" : "platform";
    await sql`
      insert into notifications (id, user_id, kind, title, body, source_id)
      values (
        ${`pn-${notice.id}-${userId}`},
        ${userId},
        ${kind},
        ${notice.title},
        ${notice.body},
        ${notice.id}
      )
      on conflict (id) do nothing
    `;
  }
}

export async function recordAnonymousView(letterId: string, senderId: string) {
  const sql = await getSql();
  await ensureNoticeTables(sql);
  const pending = await sql<{ id: string }>`
    select id from letters
    where id = ${letterId} and anonymous = true and viewed_at is null and user_id = ${senderId}
    limit 1
  `;
  if (!pending.length) return;
  await sql`
    insert into notifications (id, user_id, kind, title, body, href, letter_id)
    values (
      ${`view-${letterId}`},
      ${senderId},
      'view',
      'Sua carta anônima foi vista',
      'Quem recebeu entrou no site e abriu o link.',
      ${`/acompanhar/${letterId}`},
      ${letterId}
    )
    on conflict (id) do nothing
  `;
  await sql`
    update letters set viewed_at = now()
    where id = ${letterId} and viewed_at is null
  `;
}

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<NoticeItem[]> => {
    const sql = await getSql();
    await ensureNoticeTables(sql);
    await fanOut(sql, context.userId);
    const rows = await sql<{
      id: string;
      kind: string;
      title: string;
      body: string;
      letter_id: string | null;
      read_at: string | null;
      created_at: string;
    }>`
      select id, kind, title, body, letter_id, read_at::text as read_at, created_at::text as created_at
      from notifications
      where user_id = ${context.userId}
      order by (read_at is null) desc, created_at desc
      limit 40
    `;
    return rows.map((row) => ({
      id: row.id,
      kind: asKind(row.kind),
      title: row.title,
      body: row.body,
      letterId: row.letter_id,
      readAt: row.read_at,
      createdAt: row.created_at,
    }));
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.string().max(120))
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await ensureNoticeTables(sql);
    await sql`
      update notifications set read_at = now()
      where id = ${id} and user_id = ${context.userId} and read_at is null
    `;
    return { ok: true as const };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureNoticeTables(sql);
    await sql`
      update notifications set read_at = now()
      where user_id = ${context.userId} and read_at is null
    `;
    return { ok: true as const };
  });

export const myPhone = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureNoticeTables(sql);
    const rows = await sql<{ phone: string | null }>`
      select phone from profiles where user_id = ${context.userId} limit 1
    `;
    return { phone: rows[0]?.phone ?? null };
  });

export const saveMyPhone = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.string().max(24))
  .handler(async ({ context, data }) => {
    const phone = whatsAppNumber(data);
    if (!phone) return { ok: false as const, error: "Número inválido. Use DDD e o celular." };
    const sql = await getSql();
    await ensureNoticeTables(sql);
    await sql`update profiles set phone = ${phone} where user_id = ${context.userId}`;
    await sql`
      update notifications set read_at = coalesce(read_at, now())
      where user_id = ${context.userId} and kind = 'phone' and read_at is null
    `;
    return { ok: true as const, phone };
  });

export const listLetterReplies = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.string().max(16))
  .handler(async ({ context, data: letterId }) => {
    const sql = await getSql();
    await ensureNoticeTables(sql);
    const letters = await sql<{ user_id: string; recipient_user_id: string | null }>`
      select user_id, recipient_user_id from letters where id = ${letterId} limit 1
    `;
    const letter = letters[0];
    if (!letter) return { replies: [] as ReplyItem[], canReply: false };
    const mine = letter.user_id === context.userId || letter.recipient_user_id === context.userId;
    if (!mine) return { replies: [] as ReplyItem[], canReply: false };
    const rows = await sql<{
      id: string;
      body: string;
      photo_data: string | null;
      created_at: string;
      author_user_id: string;
    }>`
      select id, body, photo_data, created_at::text as created_at, author_user_id
      from letter_replies
      where letter_id = ${letterId}
      order by created_at
      limit 20
    `;
    return {
      canReply: letter.recipient_user_id === context.userId,
      replies: rows.map((row) => ({
        id: row.id,
        body: row.body,
        photo: row.photo_data,
        createdAt: row.created_at,
        mine: row.author_user_id === context.userId,
      })),
    };
  });

type ReplyItem = {
  id: string;
  body: string;
  photo: string | null;
  createdAt: string;
  mine: boolean;
};

export const postLetterReply = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      letterId: z.string().max(16),
      body: z.string().max(800),
      photo: z.string().max(900_000).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const text = data.body.trim();
    const photo = data.photo && data.photo.startsWith("data:image/") ? data.photo : null;
    if (data.photo && !photo) return { ok: false as const, error: "A foto precisa ser uma imagem." };
    if (!text && !photo) return { ok: false as const, error: "Escreva um comentário ou escolha uma foto." };
    const sql = await getSql();
    await ensureNoticeTables(sql);
    const letters = await sql<{
      user_id: string;
      recipient_user_id: string | null;
      anonymous: boolean | null;
      to_name: string;
    }>`
      select user_id, recipient_user_id, anonymous, to_name
      from letters where id = ${data.letterId} limit 1
    `;
    const letter = letters[0];
    if (!letter) return { ok: false as const, error: "Carta não encontrada." };
    if (letter.recipient_user_id !== context.userId) {
      return { ok: false as const, error: "Só quem recebeu a carta pode responder." };
    }
    const id = crypto.randomUUID().slice(0, 12);
    await sql`
      insert into letter_replies (id, letter_id, author_user_id, body, photo_data)
      values (${id}, ${data.letterId}, ${context.userId}, ${text}, ${photo})
    `;
    const title = letter.anonymous ? "Resposta de um envio anônimo" : "Comentário na sua carta";
    const body = text || "Enviou uma foto.";
    await sql`
      insert into notifications (id, user_id, kind, title, body, href, letter_id)
      values (
        ${`reply-${id}`},
        ${letter.user_id},
        'reply',
        ${title},
        ${body.slice(0, 180)},
        ${`/acompanhar/${data.letterId}`},
        ${data.letterId}
      )
    `;
    return { ok: true as const, id };
  });

export const adminListNotices = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await requireAdminSession();
  await ensureNoticeTables(sql);
  return sql<{ id: string; title: string; body: string; kind: string; created_at: string }>`
    select id, title, body, kind, created_at::text as created_at
    from platform_notices
    order by created_at desc
    limit 30
  `;
});

export const adminPublishNotice = createServerFn({ method: "POST" })
  .validator(
    z.object({
      title: z.string().min(2).max(80),
      body: z.string().max(400),
      kind: z.enum(["platform", "update"]),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await requireAdminSession();
    await ensureNoticeTables(sql);
    const id = crypto.randomUUID().slice(0, 10);
    await sql`
      insert into platform_notices (id, title, body, kind)
      values (${id}, ${data.title.trim()}, ${data.body.trim()}, ${data.kind})
    `;
    return { ok: true as const, id };
  });
