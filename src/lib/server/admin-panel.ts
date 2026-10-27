/**
 * Painel admin: indicadores com filtros, usuários com histórico de cartas, leitura/baixa de cartas
 * (sempre com registro de auditoria) e moderação. Tudo no servidor e só para admin.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin, adminEmailList } from "@/lib/server/admin-auth";
import { audit, ensureModerationTables } from "@/lib/server/moderation.server";

/* ------------------------------------------------------------------ indicadores */

const BR_OFFSET_MS = 3 * 3600 * 1000; // Brasília (UTC-3, sem horário de verão desde 2019)

function dayStart(ymd: string) {
  return new Date(`${ymd}T00:00:00-03:00`);
}

const filtersSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  channel: z.string().max(30).optional(),
  platform: z.string().max(30).optional(),
});

type Seg = { user_id: string; created_at: string; channel: string; platform: string; display_mode: string | null; os: string | null; browser: string | null; utm_source: string | null; utm_campaign: string | null };

export const adminAnalytics = createServerFn({ method: "POST" })
  .validator(filtersSchema)
  .handler(async ({ data }) => {
    const { sql } = await requireAdmin();
    await ensureModerationTables(sql);
    const start = dayStart(data.from);
    const end = new Date(dayStart(data.to).getTime() + 24 * 3600 * 1000);
    if (!(end > start)) throw new Error("Período inválido");
    const channel = data.channel || "";
    const platform = data.platform || "";

    // Todas as contas com a origem (1º toque). Sem linha = "desconhecido".
    const all = await sql<Seg>`
      select coalesce(u.id, p.user_id) as user_id,
        coalesce(u."createdAt", p.created_at)::text as created_at,
        coalesce(a.channel, 'desconhecido') as channel,
        coalesce(a.platform, 'desconhecido') as platform,
        a.display_mode, a.os, a.browser, a.utm_source, a.utm_campaign
      from "user" u
      full join profiles p on p.user_id = u.id
      left join user_attribution a on a.user_id = coalesce(u.id, p.user_id)
    `;
    const match = (s: Seg) =>
      (!channel || s.channel === channel) &&
      (!platform || (platform === "pwa" ? s.display_mode === "standalone" : s.platform === platform));
    const segAll = new Map(all.map((s) => [s.user_id, s]));
    const unknownSeg = (id: string): Seg => ({
      user_id: id, created_at: "", channel: "desconhecido", platform: "desconhecido", display_mode: null, os: null, browser: null, utm_source: null, utm_campaign: null,
    });
    const segOf = (id: string) => segAll.get(id) ?? unknownSeg(id);

    const letters = await sql<{ id: string; user_id: string; started_at: string; total: number | null; method: string | null }>`
      select l.id, l.user_id, l.started_at::text as started_at,
        o.total_brl as total, o.method
      from letters l
      left join lateral (select total_brl, method from orders o where o.letter_id = l.id order by created_at limit 1) o on true
      where l.started_at >= ${start.toISOString()} and l.started_at < ${end.toISOString()}
    `;
    const isPaid = (l: { total: number | null; method: string | null }) => Number(l.total ?? 0) > 0 && l.method !== "bypass";

    // Compras de todo o tempo, para a conversão cadastro → compra.
    const payers = new Set(
      (
        await sql<{ user_id: string }>`
          select distinct o.user_id from orders o where o.total_brl > 0 and coalesce(o.method, '') <> 'bypass'
        `
      ).map((r) => r.user_id),
    );

    const inRange = (iso: string) => {
      const t = new Date(iso).getTime();
      return t >= start.getTime() && t < end.getTime();
    };
    const newUsers = all.filter((s) => s.created_at && inRange(s.created_at) && match(s));
    const segLetters = letters.filter((l) => match(segOf(l.user_id)));
    const paid = segLetters.filter(isPaid);
    const revenue = paid.reduce((sum, l) => sum + Number(l.total ?? 0), 0);
    const converted = newUsers.filter((u) => payers.has(u.user_id)).length;

    const visitsRows = await sql<{ n: number }>`
      select count(*)::int as n from visits where created_at >= ${start.toISOString()} and created_at < ${end.toISOString()}
    `;
    const due = await sql<{ total: number }>`select coalesce(sum(payable_brl), 0)::int as total from profiles`;

    // Série diária (dia de Brasília).
    const dayKey = (iso: string) => new Date(new Date(iso).getTime() - BR_OFFSET_MS).toISOString().slice(0, 10);
    const series: { day: string; users: number; letters: number; paid: number; revenue: number }[] = [];
    const idx = new Map<string, number>();
    for (let t = start.getTime(); t < end.getTime() && series.length < 400; t += 24 * 3600 * 1000) {
      const day = dayKey(new Date(t).toISOString());
      idx.set(day, series.length);
      series.push({ day, users: 0, letters: 0, paid: 0, revenue: 0 });
    }
    for (const u of newUsers) {
      const i = idx.get(dayKey(u.created_at));
      if (i != null) series[i].users += 1;
    }
    for (const l of segLetters) {
      const i = idx.get(dayKey(l.started_at));
      if (i == null) continue;
      series[i].letters += 1;
      if (isPaid(l)) {
        series[i].paid += 1;
        series[i].revenue += Number(l.total ?? 0);
      }
    }

    type Row = { key: string; users: number; letters: number; paid: number; revenue: number };
    const group = (keyOf: (s: Seg) => string) => {
      const m = new Map<string, Row>();
      const get = (k: string) => {
        let r = m.get(k);
        if (!r) m.set(k, (r = { key: k, users: 0, letters: 0, paid: 0, revenue: 0 }));
        return r;
      };
      for (const u of newUsers) get(keyOf(u)).users += 1;
      for (const l of segLetters) {
        const r = get(keyOf(segOf(l.user_id)));
        r.letters += 1;
        if (isPaid(l)) {
          r.paid += 1;
          r.revenue += Number(l.total ?? 0);
        }
      }
      return [...m.values()].sort((a, b) => b.users - a.users || b.paid - a.paid);
    };

    const byChannel = group((s) => s.channel);
    const byPlatform = group((s) => s.platform);
    const byMode = group((s) => (s.display_mode === "standalone" ? "pwa" : s.display_mode === "browser" ? "navegador" : "desconhecido"));
    const byOs = group((s) => s.os || "Desconhecido").slice(0, 8);
    const byBrowser = group((s) => s.browser || "Desconhecido").slice(0, 8);
    const campaigns = group((s) => (s.utm_campaign ? `${s.utm_source || "?"} · ${s.utm_campaign}` : ""))
      .filter((r) => r.key)
      .slice(0, 15);

    // Último toque: campanha gravada na própria compra (letter_attribution).
    const lastTouch = await sql<{ campaign: string; source: string | null; n: number }>`
      select la.utm_campaign as campaign, max(la.utm_source) as source, count(*)::int as n
      from letter_attribution la join letters l on l.id = la.letter_id
      where la.utm_campaign is not null and l.started_at >= ${start.toISOString()} and l.started_at < ${end.toISOString()}
      group by la.utm_campaign order by n desc limit 15
    `;

    return {
      kpis: {
        visits: visitsRows[0]?.n ?? 0,
        newUsers: newUsers.length,
        letters: segLetters.length,
        paid: paid.length,
        revenue,
        conversion: newUsers.length ? converted / newUsers.length : 0,
        converted,
        affiliateDue: due[0]?.total ?? 0,
        totalUsers: all.length,
      },
      series,
      byChannel,
      byPlatform,
      byMode,
      byOs,
      byBrowser,
      campaigns,
      lastTouch,
    };
  });

/* ------------------------------------------------------------------ usuários */

export const adminUserList = createServerFn({ method: "GET" }).handler(async () => {
  const { sql } = await requireAdmin();
  await ensureModerationTables(sql);
  return sql<{
    user_id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    created_at: string | null;
    letters: number;
    channel: string;
    platform: string;
    blocked_at: string | null;
    pending_requests: number;
  }>`
    select coalesce(u.id, p.user_id) as user_id,
      coalesce(nullif(p.display_name, ''), u.name) as name,
      coalesce(u.email, nullif(p.email, '')) as email,
      u.image,
      coalesce(u."createdAt", p.created_at)::text as created_at,
      (select count(*)::int from letters l where l.user_id = coalesce(u.id, p.user_id)) as letters,
      coalesce(a.channel, 'desconhecido') as channel,
      coalesce(a.platform, 'desconhecido') as platform,
      p.blocked_at::text as blocked_at,
      (select count(*)::int from unblock_requests r where r.user_id = coalesce(u.id, p.user_id) and r.status = 'pending') as pending_requests
    from "user" u
    full join profiles p on p.user_id = u.id
    left join user_attribution a on a.user_id = coalesce(u.id, p.user_id)
    order by coalesce(u."createdAt", p.created_at) desc nulls last
    limit 2000
  `;
});

type LetterListRow = {
  id: string;
  user_id: string;
  recipient_user_id: string | null;
  from_name: string;
  to_name: string;
  template_id: string;
  messenger_id: string;
  anonymous: boolean | null;
  scheduled: boolean | null;
  started_at: string;
  depart_at: string | null;
  arrive_at: string | null;
  viewed_at: string | null;
  demo_duration_ms: number;
  reply_to_letter_id: string | null;
  order_total: number | null;
  order_method: string | null;
  replies: number;
};

export const adminUserDetail = createServerFn({ method: "POST" })
  .validator(z.string().min(1).max(80))
  .handler(async ({ data: userId }) => {
    const { sql, admin } = await requireAdmin();
    await ensureModerationTables(sql);
    const user = await sql<{
      user_id: string;
      name: string | null;
      email: string | null;
      image: string | null;
      created_at: string | null;
      credit_brl: number | null;
      blocked_at: string | null;
      blocked_by: string | null;
      block_reason: string | null;
    }>`
      select coalesce(u.id, p.user_id) as user_id, coalesce(nullif(p.display_name, ''), u.name) as name,
        coalesce(u.email, nullif(p.email, '')) as email, u.image,
        coalesce(u."createdAt", p.created_at)::text as created_at, p.credit_brl,
        p.blocked_at::text as blocked_at, p.blocked_by, p.block_reason
      from "user" u full join profiles p on p.user_id = u.id
      where coalesce(u.id, p.user_id) = ${userId} limit 1
    `;
    if (!user[0]) throw new Error("Usuário não encontrado");
    const attribution = await sql<Record<string, string | null>>`
      select channel, utm_source, utm_medium, utm_campaign, utm_content, referrer, landing_path, platform, os, browser,
        device, display_mode, first_seen_at::text as first_seen_at
      from user_attribution where user_id = ${userId} limit 1
    `;
    await sql`alter table letters add column if not exists viewed_at timestamptz`;
    const letters = await sql<LetterListRow>`
      select l.id, l.user_id, l.recipient_user_id, l.from_name, l.to_name, l.template_id, l.messenger_id, l.anonymous,
        l.scheduled, l.started_at::text as started_at, l.depart_at::text as depart_at, l.arrive_at::text as arrive_at,
        l.viewed_at::text as viewed_at, l.demo_duration_ms, l.reply_to_letter_id,
        o.total_brl as order_total, o.method as order_method,
        (select count(*)::int from letter_replies r where r.letter_id = l.id) as replies
      from letters l
      left join lateral (select total_brl, method from orders o where o.letter_id = l.id order by created_at limit 1) o on true
      where l.user_id = ${userId} or l.recipient_user_id = ${userId}
      order by l.started_at desc
      limit 500
    `;
    const blocks = await sql<{ id: string; action: string; reason: string | null; admin_label: string | null; created_at: string }>`
      select id, action, reason, admin_label, created_at::text as created_at
      from user_blocks where user_id = ${userId} order by created_at desc limit 50
    `;
    const requests = await sql<{
      id: string; status: string; message: string; admin_note: string | null; resolved_by: string | null;
      resolved_at: string | null; created_at: string;
    }>`
      select id, status, message, admin_note, resolved_by, resolved_at::text as resolved_at, created_at::text as created_at
      from unblock_requests where user_id = ${userId} order by created_at desc limit 30
    `;
    const intents = await sql<{ n: number }>`
      select count(*)::int as n from payment_intents where user_id = ${userId} and placed_at is null
    `.catch(() => [{ n: 0 }]);
    await audit(sql, { admin, action: "ver_usuario", userId });
    const email = (user[0].email || "").toLowerCase();
    return {
      user: user[0],
      protected: Boolean(email && adminEmailList().includes(email)),
      attribution: attribution[0] ?? null,
      letters: letters.map((l) => ({ ...l, direction: l.user_id === userId ? ("enviada" as const) : ("recebida" as const) })),
      blocks,
      requests,
      unplacedPayments: intents[0]?.n ?? 0,
    };
  });

/** Carta completa para o admin (sem nenhum efeito colateral na carta). Grava auditoria antes de devolver. */
export const adminLetterDetail = createServerFn({ method: "POST" })
  .validator(
    z.object({
      letterId: z.string().min(1).max(16),
      purpose: z.enum(["ver", "baixar_json", "baixar_imagem", "baixar_todas"]),
      userId: z.string().max(80).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { sql, admin } = await requireAdmin();
    await ensureModerationTables(sql);
    type Cell = string | number | boolean | null;
    const rows = await sql<Record<string, Cell> & { user_id: string; recipient_user_id: string | null }>`
      select l.*, l.started_at::text as started_at, l.depart_at::text as depart_at, l.arrive_at::text as arrive_at
      from letters l where l.id = ${data.letterId} limit 1
    `;
    const letter = rows[0];
    if (!letter) throw new Error("Carta não encontrada");
    // A auditoria precisa gravar; se falhar, a carta não é mostrada.
    await audit(sql, {
      admin,
      action: `carta_${data.purpose}`,
      userId: data.userId ?? letter.user_id,
      letterId: data.letterId,
    });
    const people = await sql<{ id: string; name: string | null; email: string | null }>`
      select id, name, email from "user" where id = any(${[letter.user_id, letter.recipient_user_id].filter(Boolean)})
    `;
    const replies = await sql<{ id: string; author_user_id: string; body: string; photo_data: string | null; created_at: string }>`
      select id, author_user_id, body, photo_data, created_at::text as created_at
      from letter_replies where letter_id = ${data.letterId} order by created_at limit 100
    `.catch(() => [] as { id: string; author_user_id: string; body: string; photo_data: string | null; created_at: string }[]);
    const order = await sql<{ total_brl: number; method: string | null; created_at: string }>`
      select total_brl, method, created_at::text as created_at from orders where letter_id = ${data.letterId} order by created_at limit 1
    `;
    const attribution = await sql<Record<string, Cell>>`
      select * from letter_attribution where letter_id = ${data.letterId} limit 1
    `.catch(() => [] as Record<string, Cell>[]);
    return {
      letter,
      sender: people.find((p) => p.id === letter.user_id) ?? null,
      recipient: people.find((p) => p.id === letter.recipient_user_id) ?? null,
      replies,
      order: order[0] ?? null,
      attribution: attribution[0] ?? null,
    };
  });

/** "Baixar todas": grava a auditoria do pacote e devolve só os ids (cada carta vem depois, uma a uma). */
export const adminUserExport = createServerFn({ method: "POST" })
  .validator(z.string().min(1).max(80))
  .handler(async ({ data: userId }) => {
    const { sql, admin } = await requireAdmin();
    await ensureModerationTables(sql);
    const ids = await sql<{ id: string }>`
      select id from letters where user_id = ${userId} or recipient_user_id = ${userId} order by started_at
    `;
    await audit(sql, { admin, action: "baixar_todas", userId, detail: `${ids.length} cartas` });
    return ids.map((r) => r.id);
  });

/* ------------------------------------------------------------------ moderação */

async function ensureProfileRow(sql: Awaited<ReturnType<typeof requireAdmin>>["sql"], userId: string) {
  const u = await sql<{ name: string; email: string }>`select name, email from "user" where id = ${userId} limit 1`;
  await sql`
    insert into profiles (user_id, display_name, email, affiliate_code)
    values (${userId}, ${u[0]?.name ?? ""}, ${u[0]?.email ?? ""}, ${`AMOR${Math.random().toString(36).slice(2, 8).toUpperCase()}`})
    on conflict (user_id) do nothing
  `;
  return u[0] ?? null;
}

export const adminBlockUser = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string().min(1).max(80), reason: z.string().trim().min(3).max(500) }))
  .handler(async ({ data }) => {
    const { sql, admin } = await requireAdmin();
    await ensureModerationTables(sql);
    const u = await ensureProfileRow(sql, data.userId);
    const p = await sql<{ email: string | null }>`select email from profiles where user_id = ${data.userId} limit 1`;
    const email = (u?.email || p[0]?.email || "").toLowerCase();
    if (email && adminEmailList().includes(email)) {
      return { ok: false as const, error: "Conta de administrador não pode ser bloqueada." };
    }
    await sql`
      update profiles set blocked_at = now(), blocked_by = ${admin}, block_reason = ${data.reason}
      where user_id = ${data.userId}
    `;
    await sql`
      insert into user_blocks (id, user_id, action, reason, admin_label)
      values (${crypto.randomUUID()}, ${data.userId}, 'bloqueio', ${data.reason}, ${admin})
    `;
    await audit(sql, { admin, action: "bloquear", userId: data.userId, detail: data.reason });
    return { ok: true as const };
  });

async function unblock(sql: Awaited<ReturnType<typeof requireAdmin>>["sql"], admin: string, userId: string, note: string) {
  await sql`update profiles set blocked_at = null, blocked_by = null, block_reason = null where user_id = ${userId}`;
  await sql`
    insert into user_blocks (id, user_id, action, reason, admin_label)
    values (${crypto.randomUUID()}, ${userId}, 'desbloqueio', ${note || null}, ${admin})
  `;
  try {
    const { ensureNoticeTables } = await import("@/lib/server/notifications");
    await ensureNoticeTables(sql);
    await sql`
      insert into notifications (id, user_id, kind, title, body, href)
      values (${`unblock-${crypto.randomUUID().slice(0, 12)}`}, ${userId}, 'platform', 'Seu acesso foi liberado',
        ${(note || "Sua conta voltou a funcionar normalmente.").slice(0, 180)}, '/conta')
    `;
  } catch {
    /* o aviso no sininho é extra */
  }
}

export const adminUnblockUser = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string().min(1).max(80), note: z.string().trim().max(500).optional() }))
  .handler(async ({ data }) => {
    const { sql, admin } = await requireAdmin();
    await ensureModerationTables(sql);
    await unblock(sql, admin, data.userId, data.note ?? "");
    // Pedido pendente desse usuário fica resolvido junto.
    await sql`
      update unblock_requests set status = 'approved', admin_note = ${data.note || null}, resolved_by = ${admin}, resolved_at = now()
      where user_id = ${data.userId} and status = 'pending'
    `;
    await audit(sql, { admin, action: "desbloquear", userId: data.userId, detail: data.note || null });
    return { ok: true as const };
  });

export const adminUnblockRequests = createServerFn({ method: "GET" }).handler(async () => {
  const { sql } = await requireAdmin();
  await ensureModerationTables(sql);
  return sql<{
    id: string; user_id: string; name: string | null; email: string | null; message: string; status: string;
    admin_note: string | null; resolved_by: string | null; resolved_at: string | null; created_at: string;
    block_reason: string | null; blocked_at: string | null;
  }>`
    select r.id, r.user_id, coalesce(nullif(p.display_name, ''), u.name) as name, coalesce(u.email, p.email) as email,
      r.message, r.status, r.admin_note, r.resolved_by, r.resolved_at::text as resolved_at, r.created_at::text as created_at,
      p.block_reason, p.blocked_at::text as blocked_at
    from unblock_requests r
    left join "user" u on u.id = r.user_id
    left join profiles p on p.user_id = r.user_id
    order by (r.status = 'pending') desc, r.created_at desc
    limit 100
  `;
});

export const adminPendingCount = createServerFn({ method: "GET" }).handler(async () => {
  const { sql } = await requireAdmin();
  await ensureModerationTables(sql);
  const r = await sql<{ n: number }>`select count(*)::int as n from unblock_requests where status = 'pending'`;
  return r[0]?.n ?? 0;
});

export const adminResolveUnblock = createServerFn({ method: "POST" })
  .validator(
    z.object({
      requestId: z.string().min(1).max(80),
      decision: z.enum(["desbloquear", "recusar"]),
      note: z.string().trim().max(500).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { sql, admin } = await requireAdmin();
    await ensureModerationTables(sql);
    const rows = await sql<{ user_id: string; status: string }>`
      select user_id, status from unblock_requests where id = ${data.requestId} limit 1
    `;
    const r = rows[0];
    if (!r) return { ok: false as const, error: "Pedido não encontrado." };
    if (r.status !== "pending") return { ok: false as const, error: "Esse pedido já foi respondido." };
    const status = data.decision === "desbloquear" ? "approved" : "refused";
    await sql`
      update unblock_requests set status = ${status}, admin_note = ${data.note || null}, resolved_by = ${admin}, resolved_at = now()
      where id = ${data.requestId}
    `;
    if (data.decision === "desbloquear") await unblock(sql, admin, r.user_id, data.note ?? "");
    await audit(sql, {
      admin,
      action: data.decision === "desbloquear" ? "pedido_aceito" : "pedido_recusado",
      userId: r.user_id,
      detail: data.note || null,
    });
    return { ok: true as const };
  });

export const adminAuditLog = createServerFn({ method: "POST" })
  .validator(z.string().max(80).optional())
  .handler(async ({ data: userId }) => {
    const { sql } = await requireAdmin();
    await ensureModerationTables(sql);
    return userId
      ? sql<{ id: string; admin_label: string; action: string; letter_id: string | null; detail: string | null; created_at: string }>`
          select id, admin_label, action, letter_id, detail, created_at::text as created_at
          from admin_audit_log where target_user_id = ${userId} order by created_at desc limit 100`
      : sql<{ id: string; admin_label: string; action: string; letter_id: string | null; detail: string | null; created_at: string }>`
          select id, admin_label, action, letter_id, detail, created_at::text as created_at
          from admin_audit_log order by created_at desc limit 100`;
  });
