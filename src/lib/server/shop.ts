import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { PUBLIC_TRACKING } from "@/lib/public-tracking";
import { getSql } from "@/lib/db";
import { paymentsMode } from "@/lib/payments-mode";
import { approachNoticeAt, cleanEmail, formatArrival, planArrival, whatsAppNumber } from "@/lib/delivery";
import { requireAdminSession } from "@/lib/server/admin-auth";
import { attributionSchema } from "@/lib/attribution-schema";
import { saveAttribution } from "@/lib/server/attribution";
import { ensureNoticeTables, recordAnonymousView } from "@/lib/server/notifications";
import {
  dispatchDueNotices,
  dispatchLetterNotice,
  safeOrigin,
  type NoticeState,
} from "@/lib/server/notices";
import type { Geo } from "@/lib/messengers";

function code6() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function ensureProfile(
  sql: Awaited<ReturnType<typeof getSql>>,
  userId: string,
  email?: string | null,
  name?: string | null,
) {
  const existing = await sql<{ user_id: string }>`
    select user_id from profiles where user_id = ${userId}
  `;
  if (existing.length) return;
  await sql`
    insert into profiles (user_id, display_name, email, affiliate_code)
    values (${userId}, ${name ?? ""}, ${email ?? ""}, ${`AMOR${code6()}`})
  `;
}

export const pingVisit = createServerFn({ method: "POST" })
  .validator((path: string) => path.slice(0, 180))
  .handler(async ({ data: path }) => {
    const sql = await getSql();
    await sql`insert into visits (path) values (${path})`;
    try {
      await ensureDeliveryColumns(sql);
      await dispatchDueNotices();
    } catch {
      /* o aviso tenta de novo na próxima visita */
    }
    return { ok: true };
  });

export const listCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const templates = await sql<{
    id: string;
    name: string;
    tagline: string;
    src: string;
    font_family: string;
    ink: string;
    paid: boolean;
    price_brl: number;
    sort_order: number;
  }>`select * from templates order by sort_order, name`;
  const messengers = await sql<{
    id: string;
    name: string;
    tagline: string;
    flavor: string;
    speed_kmh: number;
    price_brl: number;
    photo_src: string;
    preview_src: string;
    map_src: string;
    arrive_src: string;
    token: string;
    sort_order: number;
  }>`select * from messengers_catalog order by sort_order, name`;
  let anonymousFee = 9.9;
  try {
    const feeRows = await sql<{ value: string }>`
      select value from app_settings where key = 'anonymous_fee' limit 1
    `;
    const parsed = Number(feeRows[0]?.value ?? 9.9);
    if (Number.isFinite(parsed)) anonymousFee = parsed;
  } catch {
    /* setting table still applying */
  }
  return { templates, messengers, anonymousFee };
});

export const geocodeAddress = createServerFn({ method: "POST" })
  .validator(
    z.object({
      street: z.string(),
      number: z.string(),
      city: z.string(),
      state: z.string(),
      neighborhood: z.string().optional(),
      cep: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const queries = [
      [data.street, data.number, data.neighborhood, data.cep, data.city, data.state, "Brasil"],
      [data.street, data.number, data.city, data.state, "Brasil"],
      [data.street, data.city, data.state, "Brasil"],
      [data.cep, data.city, data.state, "Brasil"],
      [data.city, data.state, "Brasil"],
    ]
      .map((parts) => parts.map((p) => String(p || "").trim()).filter(Boolean).join(", "))
      .filter((q, i, all) => q.length > 3 && all.indexOf(q) === i);

    for (const q of queries) {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&countrycodes=br&q=${encodeURIComponent(q)}`;
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "carta-para-o-meu-amor/1.0" },
        });
        if (!res.ok) continue;
        const json = (await res.json()) as { lat: string; lon: string }[];
        if (!json[0]) continue;
        const lat = Number(json[0].lat);
        const lng = Number(json[0].lon);
        if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
      } catch {
        /* tenta a próxima consulta */
      }
    }
    return { lat: -23.55, lng: -46.63 };
  });

export const applyCoupon = createServerFn({ method: "POST" })
  .validator((code: string) => code.trim().toUpperCase())
  .handler(async ({ data: code }) => {
    const sql = await getSql();
    const rows = await sql<{ code: string; percent: number; amount_brl: number; active: boolean }>`
      select code, percent, amount_brl, active from coupons where upper(code) = ${code} limit 1
    `;
    const row = rows[0];
    if (!row || !row.active) return { ok: false as const, message: "Cupom inválido" };
    return {
      ok: true as const,
      code: row.code,
      percent: row.percent,
      amountBrl: row.amount_brl,
    };
  });

export const myProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const authUser = await sql<{ name: string; email: string }>`
      select name, email from "user" where id = ${context.userId} limit 1
    `;
    await ensureProfile(sql, context.userId, authUser[0]?.email, authUser[0]?.name);
    const admins = await sql<{ n: number }>`select count(*)::int as n from profiles where is_admin = true`;
    if ((admins[0]?.n ?? 0) === 0) {
      await sql`update profiles set is_admin = true where user_id = ${context.userId}`;
    }
    const rows = await sql<{
      user_id: string;
      display_name: string | null;
      email: string | null;
      is_admin: boolean;
      affiliate_code: string | null;
      credit_brl: number;
      payable_brl: number;
    }>`select user_id, display_name, email, is_admin, affiliate_code, credit_brl, payable_brl from profiles where user_id = ${context.userId}`;
    return rows[0] ?? null;
  });

export const checkoutSchema = z.object({
      fromName: z.string(),
      toName: z.string(),
      pagesJson: z.string(),
      templateId: z.string(),
      messengerId: z.string(),
      fromAddressJson: z.string(),
      toAddressJson: z.string(),
      fromGeoJson: z.string(),
      toGeoJson: z.string(),
      paidBrl: z.number(),
      couponCode: z.string().optional(),
      affiliateCode: z.string().optional(),
      demoDurationMs: z.number(),
      method: z.string(),
      anonymous: z.boolean().optional(),
      scheduled: z.boolean().optional(),
      arriveOn: z.string().optional(),
      recipientPhone: z.string().optional(),
      recipientEmail: z.string().optional(),
      senderPhone: z.string().optional(),
      origin: z.string().optional(),
      /** Resposta: o destino (endereço, conta e contato) vem do servidor, nunca do navegador. */
      replyToLetterId: z.string().max(16).optional(),
      /** Origem do anúncio (UTM/fbclid/ttclid). Opcional: clientes antigos não mandam. */
      attribution: attributionSchema,
      /** Só para conferir o valor no servidor (modo Mercado Pago). Opcionais: clientes antigos não mandam. */
      useCredit: z.boolean().optional(),
      cartScheduled: z.boolean().optional(),
    });
export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** Confere, ANTES de cobrar, o que faria a carta ser recusada depois (resposta e data marcada). */
export async function precheckLetter(sql: Awaited<ReturnType<typeof getSql>>, userId: string, data: CheckoutInput) {
  await ensureReplyColumns(sql);
  const anonymous = Boolean(data.anonymous);
  let fromGeoJson = data.fromGeoJson;
  let toGeoJson = data.toGeoJson;
  if (data.replyToLetterId) {
    const parent = await replyParent(sql, data.replyToLetterId, userId);
    if (!parent) throw new Error("Só quem recebeu a carta pode responder.");
    if (parent.anonymous && !anonymous) throw new Error("Resposta a uma carta anônima é sempre anônima.");
    if (!anonymous) {
      fromGeoJson = parent.to_geo_json;
      toGeoJson = parent.from_geo_json;
    }
  }
  if (anonymous || !data.scheduled) return;
  const plan = planArrival({
    messengerId: data.messengerId,
    from: parseGeo(fromGeoJson) ?? { lat: -23.55, lng: -46.63 },
    to: parseGeo(toGeoJson) ?? { lat: -22.9, lng: -43.17 },
    arriveOn: data.arriveOn || null,
    addressless: false,
  });
  if (!plan.fits) throw new Error("Esse mensageiro não chega na data escolhida.");
}

/**
 * Cria a carta (e o pedido) já paga. Usada pelo checkout de teste e, no modo Mercado Pago, só depois
 * do pagamento aprovado. Com `letterId` é idempotente: a 2ª chamada devolve a mesma carta sem repetir
 * pedido, cupom, comissão ou eventos.
 */
export async function placeLetter(
  sql: Awaited<ReturnType<typeof getSql>>,
  userId: string,
  data: CheckoutInput,
  opts: { letterId?: string } = {},
) {
  await ensureProfile(sql, userId);
  await ensureDeliveryColumns(sql);
  await ensureLetterInbox(sql);
  await ensureReplyColumns(sql);
  const id = opts.letterId ?? crypto.randomUUID().slice(0, 8);
  const anonymous = Boolean(data.anonymous);
  let toName = data.toName;
  let fromAddressJson = data.fromAddressJson;
  let fromGeoJson = data.fromGeoJson;
  let toAddressJson = data.toAddressJson;
  let toGeoJson = data.toGeoJson;
  let replyTo: string | null = null;
  let threadId: string | null = null;
  let recipientUserId: string | null = null;
  let recipientEmail: string | null = null;
  let recipientPhone: string | null = null;
  if (data.replyToLetterId) {
    const parent = await replyParent(sql, data.replyToLetterId, userId);
    if (!parent) throw new Error("Só quem recebeu a carta pode responder.");
    replyTo = parent.id;
    threadId = parent.thread_id || parent.id;
    recipientUserId = parent.user_id;
    recipientEmail = parent.sender_email;
    recipientPhone = parent.sender_phone;
    // Regra: anônima ⇔ sem endereço. Resposta a carta anônima é sempre anônima.
    if (parent.anonymous && !anonymous) throw new Error("Resposta a uma carta anônima é sempre anônima.");
    toName = parent.anonymous ? "Alguém especial" : parent.from_name;
    if (anonymous) {
      toAddressJson = "{}";
      toGeoJson = "";
    } else {
      // Resposta com nome: endereços invertidos da carta original, sempre no servidor.
      // origem da resposta = destino da original (quem responde); destino = origem da original.
      fromAddressJson = parent.to_address_json || "{}";
      fromGeoJson = parseGeo(parent.to_geo_json) ? parent.to_geo_json : "";
      toAddressJson = parent.from_address_json || "{}";
      toGeoJson = parseGeo(parent.from_geo_json) ? parent.from_geo_json : "";
    }
  }
  // Anônima nunca guarda endereço nem coordenada (de origem ou destino) e chega em 2h.
  const addressless = anonymous;
  if (addressless) {
    fromAddressJson = "{}";
    fromGeoJson = "";
    toAddressJson = "{}";
    toGeoJson = "";
  }
  const from = parseGeo(fromGeoJson) ?? { lat: -23.55, lng: -46.63 };
  const to = parseGeo(toGeoJson) ?? { lat: -22.9, lng: -43.17 };
  const plan = planArrival({
    messengerId: data.messengerId,
    from,
    to,
    arriveOn: data.scheduled && !addressless ? data.arriveOn || null : null,
    addressless,
  });
  if (data.scheduled && !plan.fits) {
    throw new Error("Esse mensageiro não chega na data escolhida.");
  }
  await sql`alter table profiles add column if not exists phone text`;
  const authUser = await sql<{ email: string }>`
    select email from "user" where id = ${userId} limit 1
  `;
  const profile = await sql<{ phone: string | null }>`
    select phone from profiles where user_id = ${userId} limit 1
  `;
  const senderEmail = cleanEmail(authUser[0]?.email ?? "") ?? "";
  const senderPhone = whatsAppNumber(profile[0]?.phone ?? "") ?? "";
  const origin = safeOrigin(data.origin);
  const inserted = await sql<{ id: string }>`
    insert into letters (
      id, user_id, from_name, to_name, pages_json, template_id, messenger_id,
      from_address_json, to_address_json, from_geo_json, to_geo_json,
      paid_brl, coupon_code, affiliate_code, demo_duration_ms,
      anonymous, scheduled, recipient_phone, recipient_email, sender_phone, sender_email,
      share_origin, depart_at, arrive_at, recipient_user_id, reply_to_letter_id, thread_id
    ) values (
      ${id}, ${userId}, ${data.fromName}, ${toName}, ${data.pagesJson},
      ${data.templateId}, ${data.messengerId}, ${fromAddressJson}, ${toAddressJson},
      ${fromGeoJson}, ${toGeoJson}, ${data.paidBrl}, ${data.couponCode ?? null},
      ${data.affiliateCode ?? null}, ${data.demoDurationMs},
      ${anonymous}, ${Boolean(data.scheduled) && !addressless}, ${recipientPhone}, ${recipientEmail},
      ${senderPhone || null}, ${senderEmail || null}, ${origin},
      ${plan.departAt.toISOString()}, ${plan.arriveAt.toISOString()},
      ${recipientUserId}, ${replyTo}, ${threadId}
    )
    on conflict (id) do nothing
    returning id
  `;
  if (!inserted.length) {
    // Já criada (ex.: webhook e consulta de status chegando juntos): devolve a mesma, sem repetir efeitos.
    const row = await sql<{ to_name: string; depart_at: string; arrive_at: string }>`
      select to_name, depart_at, arrive_at from letters where id = ${id} limit 1
    `;
    return {
      id,
      linkSent: false,
      notice: (plan.instant ? "instant" : "queued") as NoticeState,
      addressless,
      toName: row[0]?.to_name ?? toName,
      arriveAt: row[0] ? new Date(row[0].arrive_at).getTime() : plan.arriveAt.getTime(),
      departAt: row[0] ? new Date(row[0].depart_at).getTime() : plan.departAt.getTime(),
    };
  }
  if (replyTo && recipientUserId) {
    try {
      await ensureNoticeTables(sql);
      await sql`
        insert into notifications (id, user_id, kind, title, body, href, letter_id)
        values (
          ${`letter-${id}`}, ${recipientUserId}, 'letter',
          ${"Chegou uma resposta para a sua carta"},
          ${anonymous ? "Alguém respondeu sem mostrar o nome." : `${data.fromName.slice(0, 60)} respondeu.`},
          ${`/acompanhar/${id}`}, ${id}
        )
        on conflict (id) do nothing
      `;
    } catch {
      /* o aviso é extra; a carta já foi */
    }
  }
  await sql`
    insert into orders (id, user_id, letter_id, total_brl, method)
    values (${crypto.randomUUID().slice(0, 10)}, ${userId}, ${id}, ${data.paidBrl}, ${data.method})
  `;
  // Anúncios: atribuição (tabela separada); nunca derruba o checkout. O Purchase server-side sai
  // só do pagamento real aprovado (src/lib/server/payments.ts → finalizeIntent).
  await saveAttribution(sql, id, userId, data.attribution);
  if (data.couponCode) {
    await sql`update coupons set uses = uses + 1 where upper(code) = ${data.couponCode.toUpperCase()}`;
  }
  if (data.affiliateCode) {
    const ref = await sql<{ user_id: string }>`
      select user_id from profiles where affiliate_code = ${data.affiliateCode} limit 1
    `;
    if (ref[0] && ref[0].user_id !== userId) {
      const setting = await sql<{ value: string }>`
        select value from app_settings where key = 'affiliate_percent' limit 1
      `;
      const percent = Number(setting[0]?.value ?? 10);
      const commission = Math.max(1, Math.round(data.paidBrl * (percent / 100)));
      const credit = Math.max(2, Math.round(data.paidBrl * 0.1));
      await sql`
        update profiles
        set credit_brl = credit_brl + ${credit}, payable_brl = payable_brl + ${commission}
        where user_id = ${ref[0].user_id}
      `;
      await sql`
        insert into affiliate_events (id, referrer_user_id, buyer_user_id, letter_id, credit_brl, commission_brl)
        values (${crypto.randomUUID().slice(0, 10)}, ${ref[0].user_id}, ${userId}, ${id}, ${credit}, ${commission})
      `;
    }
  }
  if (data.paidBrl === 0) {
    await sql`update profiles set credit_brl = greatest(credit_brl - 0, credit_brl) where user_id = ${userId}`;
  }
  const linkSent = false;
  let notice: NoticeState = plan.instant ? "instant" : "queued";
  if (!plan.instant) {
    const at = approachNoticeAt(new Date(), plan.departAt, plan.arriveAt);
    if (at) {
      await sql`update letters set notice_at = ${at.toISOString()} where id = ${id}`;
      if (at.getTime() <= Date.now()) notice = await dispatchLetterNotice(id);
    }
  }
  return { id, linkSent, notice, addressless, toName, arriveAt: plan.arriveAt.getTime(), departAt: plan.departAt.getTime() };
}

export const checkoutLetter = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(checkoutSchema)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    if (paymentsMode() === "mercadopago") {
      // Pagamento real ligado: este atalho só serve para carrinho que sai grátis (cupom/crédito).
      const { serverCartTotal } = await import("@/lib/server/payments.server");
      const { total } = await serverCartTotal(sql, context.userId, data);
      if (total > 0) {
        // Só as contas de PAYMENT_BYPASS_EMAILS (checado aqui, no servidor) enviam sem pagar.
        const { bypassAllowed } = await import("@/lib/server/payments.server");
        if (!(await bypassAllowed(sql, context.userId))) throw new Error("Pagamento necessário.");
        // Envio de teste: sem receita, sem comissão de afiliado e sem Purchase.
        return placeLetter(sql, context.userId, { ...data, paidBrl: 0, method: "bypass", affiliateCode: undefined });
      }
      return placeLetter(sql, context.userId, { ...data, paidBrl: 0 });
    }
    return placeLetter(sql, context.userId, data);
  });

export const adminDashboard = createServerFn({ method: "GET" })
  .handler(async () => {
    const sql = await requireAdminSession();
    const visits = await sql<{ n: number }>`select count(*)::int as n from visits`;
    const users = await sql<{ n: number }>`select count(*)::int as n from profiles`;
    const letters = await sql<{ n: number }>`select count(*)::int as n from letters`;
    const orders = await sql<{ n: number; total: number }>`
      select count(*)::int as n, coalesce(sum(total_brl), 0)::int as total from orders
    `;
    const recent = await sql<{ path: string; n: number }>`
      select path, count(*)::int as n from visits group by path order by n desc limit 6
    `;
    const pay = await sql<{ total: number }>`
      select coalesce(sum(payable_brl), 0)::int as total from profiles
    `;
    return {
      visits: visits[0]?.n ?? 0,
      users: users[0]?.n ?? 0,
      letters: letters[0]?.n ?? 0,
      purchases: orders[0]?.n ?? 0,
      revenue: orders[0]?.total ?? 0,
      affiliateDue: pay[0]?.total ?? 0,
      topPaths: recent,
    };
  });

export const adminUsers = createServerFn({ method: "GET" })
  .handler(async () => {
    const sql = await requireAdminSession();
    return sql<{
      user_id: string;
      display_name: string | null;
      email: string | null;
      is_admin: boolean;
      affiliate_code: string | null;
      credit_brl: number;
      letters: number;
    }>`
      select p.user_id, p.display_name, p.email, p.is_admin, p.affiliate_code, p.credit_brl,
        (select count(*)::int from letters l where l.user_id = p.user_id) as letters
      from profiles p
      order by p.created_at desc
    `;
  });

export const adminUserLetters = createServerFn({ method: "POST" })
  .validator((userId: string) => userId)
  .handler(async ({ data: userId }) => {
    await requireAdminSession();
    const sql = await getSql();
    return sql<{
      id: string;
      from_name: string;
      to_name: string;
      template_id: string;
      messenger_id: string;
      paid_brl: number;
      started_at: string;
    }>`
      select id, from_name, to_name, template_id, messenger_id, paid_brl, started_at::text
      from letters where user_id = ${userId} order by started_at desc
    `;
  });

export const saveTemplate = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      name: z.string(),
      tagline: z.string(),
      src: z.string(),
      fontFamily: z.string(),
      ink: z.enum(["dark", "light"]),
      paid: z.boolean(),
      priceBrl: z.number(),
      sortOrder: z.number(),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await requireAdminSession();
    await sql`
      insert into templates (id, name, tagline, src, font_family, ink, paid, price_brl, sort_order)
      values (${data.id}, ${data.name}, ${data.tagline}, ${data.src}, ${data.fontFamily}, ${data.ink}, ${data.paid}, ${data.priceBrl}, ${data.sortOrder})
      on conflict (id) do update set
        name = excluded.name,
        tagline = excluded.tagline,
        src = excluded.src,
        font_family = excluded.font_family,
        ink = excluded.ink,
        paid = excluded.paid,
        price_brl = excluded.price_brl,
        sort_order = excluded.sort_order
    `;
    return { ok: true };
  });

export const saveMessenger = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      name: z.string(),
      tagline: z.string(),
      flavor: z.string(),
      speedKmh: z.number(),
      priceBrl: z.number(),
      photoSrc: z.string(),
      previewSrc: z.string(),
      mapSrc: z.string(),
      arriveSrc: z.string(),
      token: z.string(),
      sortOrder: z.number(),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await requireAdminSession();
    await sql`
      insert into messengers_catalog (
        id, name, tagline, flavor, speed_kmh, price_brl, photo_src, preview_src, map_src, arrive_src, token, sort_order
      ) values (
        ${data.id}, ${data.name}, ${data.tagline}, ${data.flavor}, ${data.speedKmh}, ${data.priceBrl},
        ${data.photoSrc}, ${data.previewSrc}, ${data.mapSrc}, ${data.arriveSrc}, ${data.token}, ${data.sortOrder}
      )
      on conflict (id) do update set
        name = excluded.name,
        tagline = excluded.tagline,
        flavor = excluded.flavor,
        speed_kmh = excluded.speed_kmh,
        price_brl = excluded.price_brl,
        photo_src = excluded.photo_src,
        preview_src = excluded.preview_src,
        map_src = excluded.map_src,
        arrive_src = excluded.arrive_src,
        token = excluded.token,
        sort_order = excluded.sort_order
    `;
    return { ok: true };
  });

export const saveCoupon = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().optional(),
      code: z.string(),
      percent: z.number(),
      amountBrl: z.number(),
      active: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await requireAdminSession();
    const id = data.id || data.code.toLowerCase();
    await sql`
      insert into coupons (id, code, percent, amount_brl, active)
      values (${id}, ${data.code.toUpperCase()}, ${data.percent}, ${data.amountBrl}, ${data.active})
      on conflict (id) do update set
        code = excluded.code,
        percent = excluded.percent,
        amount_brl = excluded.amount_brl,
        active = excluded.active
    `;
    return { ok: true };
  });

export const listCoupons = createServerFn({ method: "GET" })
  .handler(async () => {
    const sql = await requireAdminSession();
    return sql<{
      id: string;
      code: string;
      percent: number;
      amount_brl: number;
      active: boolean;
      uses: number;
    }>`select id, code, percent, amount_brl, active, uses from coupons order by created_at desc`;
  });

export const listAffiliates = createServerFn({ method: "GET" })
  .handler(async () => {
    const sql = await requireAdminSession();
    return sql<{
      user_id: string;
      display_name: string | null;
      affiliate_code: string | null;
      credit_brl: number;
      payable_brl: number;
      events: number;
    }>`
      select p.user_id, p.display_name, p.affiliate_code, p.credit_brl, p.payable_brl,
        (select count(*)::int from affiliate_events e where e.referrer_user_id = p.user_id) as events
      from profiles p
      where p.affiliate_code is not null
      order by p.payable_brl desc, p.credit_brl desc
    `;
  });

export const spendCredit = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((amount: number) => Math.max(0, Math.round(amount)))
  .handler(async ({ context, data: amount }) => {
    const sql = await getSql();
    await sql`
      update profiles set credit_brl = greatest(credit_brl - ${amount}, 0)
      where user_id = ${context.userId}
    `;
    return { ok: true };
  });

export const MIN_PAYOUT_BRL = 50;

async function ensurePayouts(sql: Awaited<ReturnType<typeof getSql>>) {
  await sql`
    create table if not exists affiliate_payouts (
      id text primary key,
      user_id text not null,
      amount_brl integer not null,
      pix_key text not null,
      pix_kind text not null default 'aleatoria',
      status text not null default 'pending',
      created_at timestamptz not null default now(),
      paid_at timestamptz
    )
  `;
}

export const publicAffiliatePercent = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql<{ value: string }>`select value from app_settings where key = 'affiliate_percent' limit 1`;
  return Number(rows[0]?.value ?? 10);
});

export const myPayouts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensurePayouts(sql);
    return sql<{
      id: string;
      amount_brl: number;
      pix_key: string;
      pix_kind: string;
      status: string;
      created_at: string;
    }>`
      select id, amount_brl, pix_key, pix_kind, status, created_at::text
      from affiliate_payouts
      where user_id = ${context.userId}
      order by created_at desc
    `;
  });

export const requestPayout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      pixKey: z.string().trim().min(5).max(120),
      pixKind: z.enum(["cpf", "cnpj", "email", "celular", "aleatoria"]),
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensurePayouts(sql);
    const pending = await sql<{ id: string }>`
      select id from affiliate_payouts
      where user_id = ${context.userId} and status = 'pending'
      limit 1
    `;
    if (pending.length) {
      return { ok: false as const, error: "Você já tem um saque em andamento." };
    }
    const row = await sql<{ payable_brl: number }>`
      select payable_brl from profiles where user_id = ${context.userId} limit 1
    `;
    const amount = row[0]?.payable_brl ?? 0;
    if (amount < MIN_PAYOUT_BRL) {
      return { ok: false as const, error: `O saque fica disponível a partir de R$ ${MIN_PAYOUT_BRL}.` };
    }
    const id = crypto.randomUUID();
    await sql`
      update profiles set payable_brl = 0 where user_id = ${context.userId}
    `;
    await sql`
      insert into affiliate_payouts (id, user_id, amount_brl, pix_key, pix_kind, status)
      values (${id}, ${context.userId}, ${amount}, ${data.pixKey}, ${data.pixKind}, 'pending')
    `;
    return { ok: true as const, amount };
  });

export const listPayouts = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await requireAdminSession();
  await ensurePayouts(sql);
  return sql<{
    id: string;
    user_id: string;
    display_name: string | null;
    amount_brl: number;
    pix_key: string;
    pix_kind: string;
    status: string;
    created_at: string;
  }>`
    select p.id, p.user_id, pr.display_name, p.amount_brl, p.pix_key, p.pix_kind, p.status, p.created_at::text
    from affiliate_payouts p
    left join profiles pr on pr.user_id = p.user_id
    order by (p.status = 'pending') desc, p.created_at desc
  `;
});

export const markPayoutPaid = createServerFn({ method: "POST" })
  .validator(z.string())
  .handler(async ({ data: id }) => {
    const sql = await requireAdminSession();
    await ensurePayouts(sql);
    await sql`
      update affiliate_payouts set status = 'paid', paid_at = now()
      where id = ${id} and status = 'pending'
    `;
    return { ok: true };
  });

async function ensureLetterInbox(sql: Awaited<ReturnType<typeof getSql>>) {
  await sql`alter table letters add column if not exists recipient_user_id text`;
}

async function ensureDeliveryColumns(sql: Awaited<ReturnType<typeof getSql>>) {
  await sql`alter table letters add column if not exists anonymous boolean not null default false`;
  await sql`alter table letters add column if not exists recipient_phone text`;
  await sql`alter table letters add column if not exists recipient_email text`;
  await sql`alter table letters add column if not exists sender_phone text`;
  await sql`alter table letters add column if not exists sender_email text`;
  await sql`alter table letters add column if not exists share_origin text`;
  await sql`alter table letters add column if not exists scheduled boolean not null default false`;
  await sql`alter table letters add column if not exists depart_at timestamptz`;
  await sql`alter table letters add column if not exists arrive_at timestamptz`;
  await sql`alter table letters add column if not exists notice_at timestamptz`;
  await sql`alter table letters add column if not exists notice_sent_at timestamptz`;
  await sql`alter table letters add column if not exists notice_error text`;
}

function parseGeo(raw: string): Geo | null {
  try {
    const geo = JSON.parse(raw) as Geo;
    if (typeof geo.lat !== "number" || typeof geo.lng !== "number" || Number.isNaN(geo.lat)) return null;
    return geo;
  } catch {
    return null;
  }
}

async function ensureReplyColumns(sql: Awaited<ReturnType<typeof getSql>>) {
  // Aditivo: mesmo conteúdo de migrations/0009_replies.sql (o PGLite/local cria na hora).
  await sql`alter table letters add column if not exists reply_to_letter_id text`;
  await sql`alter table letters add column if not exists thread_id text`;
}

type ParentRow = {
  id: string;
  user_id: string;
  from_name: string;
  anonymous: boolean | null;
  from_address_json: string;
  from_geo_json: string;
  to_address_json: string;
  to_geo_json: string;
  sender_email: string | null;
  sender_phone: string | null;
  thread_id: string | null;
};

/** A carta a responder, só se quem pede é quem recebeu. Fica no servidor. */
async function replyParent(sql: Awaited<ReturnType<typeof getSql>>, letterId: string, userId: string) {
  const rows = await sql<ParentRow & { recipient_user_id: string | null }>`
    select id, user_id, recipient_user_id, from_name, anonymous, from_address_json, from_geo_json,
      to_address_json, to_geo_json, sender_email, sender_phone, thread_id
    from letters where id = ${letterId} limit 1
  `;
  const row = rows[0];
  if (!row || row.recipient_user_id !== userId || row.user_id === userId) return null;
  return row;
}

function ownAddress(raw: string) {
  try {
    const a = JSON.parse(raw || "{}") as Record<string, unknown> | null;
    if (!a || typeof a !== "object") return undefined;
    const pick = (k: string) => (typeof a[k] === "string" ? (a[k] as string).slice(0, 160) : "");
    return {
      cep: pick("cep"),
      street: pick("street"),
      number: pick("number"),
      complement: pick("complement"),
      neighborhood: pick("neighborhood"),
      city: pick("city"),
      state: pick("state"),
    };
  } catch {
    return undefined;
  }
}

/** Nível cidade (~11 km): serve para estimar a viagem e desenhar o mapa sem revelar o endereço. */
function coarseGeoJson(raw: string) {
  const g = parseGeo(raw);
  if (!g) return "";
  return JSON.stringify({ lat: Math.round(g.lat * 10) / 10, lng: Math.round(g.lng * 10) / 10 });
}

function cityOnlyJson(raw: string) {
  try {
    const a = JSON.parse(raw) as { city?: string; state?: string } | null;
    if (!a || typeof a !== "object" || !a.city) return "{}";
    return JSON.stringify({
      cep: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: String(a.city).slice(0, 80),
      state: String(a.state ?? "").slice(0, 4),
    });
  } catch {
    return "{}";
  }
}

export type LetterRole = "sender" | "recipient" | "viewer";

/**
 * O que cada lado pode ver. Quem não é o remetente nunca recebe conta, telefone, e-mail,
 * endereço ou coordenada de quem enviou; anônima também esconde o nome. Sem endereço:
 * nenhuma coordenada sai do servidor.
 */
export function publicLetterRow(row: LetterRow, role: LetterRole): LetterRow & { addressless: boolean } {
  const addressless = Boolean(row.anonymous) || !parseGeo(row.to_geo_json);
  const out: LetterRow & { addressless: boolean } = { ...row, addressless };
  if (addressless) {
    out.from_geo_json = "";
    out.to_geo_json = "";
  }
  if (role === "sender") {
    // Resposta: o destino é o endereço da outra pessoa → só cidade e ponto aproximado.
    if (row.reply_to_letter_id) {
      out.to_address_json = addressless ? "{}" : cityOnlyJson(row.to_address_json);
      if (!addressless) out.to_geo_json = coarseGeoJson(row.to_geo_json);
    }
    out.recipient_user_id = row.recipient_user_id ? "recipient" : null;
    out.recipient_phone = null;
    out.recipient_email = null;
    return out;
  }
  out.user_id = "";
  out.sender_phone = null;
  out.coupon_code = null;
  out.affiliate_code = null;
  if (row.anonymous) out.from_name = "";
  out.from_address_json = addressless ? "{}" : cityOnlyJson(row.from_address_json);
  if (!addressless) out.from_geo_json = coarseGeoJson(row.from_geo_json);
  if (role === "viewer") {
    out.recipient_user_id = row.recipient_user_id ? "recipient" : null;
    out.recipient_phone = null;
    out.recipient_email = null;
    out.to_address_json = addressless ? "{}" : cityOnlyJson(row.to_address_json);
    if (!addressless) out.to_geo_json = coarseGeoJson(row.to_geo_json);
  }
  return out;
}

type LetterRow = {
  id: string;
  user_id: string;
  recipient_user_id: string | null;
  from_name: string;
  to_name: string;
  pages_json: string;
  template_id: string;
  messenger_id: string;
  from_address_json: string;
  to_address_json: string;
  from_geo_json: string;
  to_geo_json: string;
  paid_brl: number;
  coupon_code: string | null;
  affiliate_code: string | null;
  anonymous: boolean | null;
  scheduled: boolean | null;
  recipient_phone: string | null;
  recipient_email: string | null;
  sender_phone: string | null;
  depart_at: string | null;
  arrive_at: string | null;
  started_at: string;
  demo_duration_ms: number;
  reply_to_letter_id?: string | null;
  thread_id?: string | null;
};

export const myMailbox = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureLetterInbox(sql);
    await ensureDeliveryColumns(sql);
    await ensureReplyColumns(sql);
    const sent = await sql<LetterRow>`
      select id, user_id, recipient_user_id, from_name, to_name, pages_json, template_id, messenger_id,
        from_address_json, to_address_json, from_geo_json, to_geo_json, paid_brl, coupon_code,
        affiliate_code, anonymous, scheduled, recipient_phone, recipient_email, sender_phone,
        depart_at::text, arrive_at::text, started_at::text, demo_duration_ms,
        reply_to_letter_id, thread_id
      from letters where user_id = ${context.userId}
      order by started_at desc
    `;
    const received = await sql<LetterRow>`
      select id, user_id, recipient_user_id, from_name, to_name, pages_json, template_id, messenger_id,
        from_address_json, to_address_json, from_geo_json, to_geo_json, paid_brl, coupon_code,
        affiliate_code, anonymous, scheduled, recipient_phone, recipient_email, sender_phone,
        depart_at::text, arrive_at::text, started_at::text, demo_duration_ms,
        reply_to_letter_id, thread_id
      from letters where recipient_user_id = ${context.userId}
      order by started_at desc
    `;
    return {
      sent: sent.map((r) => publicLetterRow(r, "sender")),
      received: received.map((r) => publicLetterRow(r, r.user_id === context.userId ? "sender" : "recipient")),
    };
  });

export const openSharedLetter = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id.slice(0, 16))
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await ensureLetterInbox(sql);
    await ensureDeliveryColumns(sql);
    await ensureReplyColumns(sql);
    const rows = await sql<LetterRow>`
      select id, user_id, recipient_user_id, from_name, to_name, pages_json, template_id, messenger_id,
        from_address_json, to_address_json, from_geo_json, to_geo_json, paid_brl, coupon_code,
        affiliate_code, anonymous, scheduled, recipient_phone, recipient_email, sender_phone,
        depart_at::text, arrive_at::text, started_at::text, demo_duration_ms,
        reply_to_letter_id, thread_id
      from letters where id = ${id} limit 1
    `;
    const row = rows[0];
    if (!row) return { letter: null as LetterRow | null, role: "none" as const };
    let role: "sender" | "recipient" | "viewer" = "viewer";
    if (row.user_id === context.userId) role = "sender";
    else if (row.recipient_user_id === context.userId) role = "recipient";
    else if (!row.recipient_user_id) {
      await sql`update letters set recipient_user_id = ${context.userId} where id = ${id} and recipient_user_id is null`;
      row.recipient_user_id = context.userId;
      role = "recipient";
    }
    if (role === "recipient" && row.user_id !== context.userId) {
      await sql`alter table profiles add column if not exists phone text`;
      const authUser = await sql<{ email: string }>`
        select email from "user" where id = ${context.userId} limit 1
      `;
      const profile = await sql<{ phone: string | null }>`
        select phone from profiles where user_id = ${context.userId} limit 1
      `;
      const email = cleanEmail(authUser[0]?.email ?? "");
      const phone = whatsAppNumber(profile[0]?.phone ?? "");
      if (email || phone) {
        await sql`
          update letters
          set recipient_email = coalesce(${email}, recipient_email),
              recipient_phone = coalesce(${phone}, recipient_phone)
          where id = ${id} and recipient_user_id = ${context.userId}
        `;
      }
    }
    if (role === "recipient" && row.anonymous && row.user_id !== context.userId) {
      try {
        await recordAnonymousView(id, row.user_id);
      } catch {
        /* a próxima abertura tenta de novo se viewed_at ficou vazio */
      }
    }
    return { letter: publicLetterRow(row, role), role };
  });

/**
 * Acompanhar sem login (fase de testes, `PUBLIC_TRACKING`): quem abre pelo link vê só a
 * visão de "quem visualiza". Não reivindica a carta como destinatário, não grava contato
 * nem marca "vista". Com a chave desligada, recusa (volta a exigir login).
 */
export const openPublicLetter = createServerFn({ method: "POST" })
  .validator((id: string) => String(id).slice(0, 16))
  .handler(async ({ data: id }) => {
    if (!PUBLIC_TRACKING) throw new Error("Entre para acompanhar esta carta.");
    const { assertSameSiteRequest } = await import("@/lib/auth/isolation.server");
    assertSameSiteRequest();
    const sql = await getSql();
    await ensureLetterInbox(sql);
    await ensureDeliveryColumns(sql);
    await ensureReplyColumns(sql);
    const rows = await sql<LetterRow>`
      select id, user_id, recipient_user_id, from_name, to_name, pages_json, template_id, messenger_id,
        from_address_json, to_address_json, from_geo_json, to_geo_json, paid_brl, coupon_code,
        affiliate_code, anonymous, scheduled, recipient_phone, recipient_email, sender_phone,
        depart_at::text, arrive_at::text, started_at::text, demo_duration_ms,
        reply_to_letter_id, thread_id
      from letters where id = ${id} limit 1
    `;
    const row = rows[0];
    if (!row) return { letter: null as LetterRow | null, role: "none" as const };
    return { letter: publicLetterRow(row, "viewer"), role: "viewer" as const };
  });

/** Contexto para "Enviar resposta": só o que quem responde pode ver da outra pessoa. */
export const replyContext = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id.slice(0, 16))
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await ensureLetterInbox(sql);
    await ensureDeliveryColumns(sql);
    await ensureReplyColumns(sql);
    const parent = await replyParent(sql, id, context.userId);
    if (!parent) return { ok: false as const };
    const anonymous = Boolean(parent.anonymous);
    const geo = anonymous ? null : parseGeo(parent.from_geo_json);
    let city = "";
    if (!anonymous) {
      try {
        city = String((JSON.parse(parent.from_address_json) as { city?: string })?.city ?? "");
      } catch {
        city = "";
      }
    }
    const approx = geo ? (JSON.parse(coarseGeoJson(parent.from_geo_json)) as Geo) : undefined;
    return {
      ok: true as const,
      letterId: parent.id,
      toLabel: anonymous ? "Alguém especial" : parent.from_name,
      /** Carta original anônima → a resposta é obrigatoriamente anônima. */
      anonymous,
      /** Origem da resposta = destino da carta original: é o endereço de quem responde. */
      fromAddress: anonymous ? undefined : ownAddress(parent.to_address_json),
      fromGeo: anonymous ? undefined : (parseGeo(parent.to_geo_json) ?? undefined),
      toCity: city,
      hasAddress: Boolean(geo),
      approxGeo: approx,
    };
  });

/** A conversa (cartas e respostas) que quem pede enviou ou recebeu. */
export const letterThread = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id.slice(0, 16))
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await ensureLetterInbox(sql);
    await ensureDeliveryColumns(sql);
    await ensureReplyColumns(sql);
    const base = await sql<{ id: string; thread_id: string | null; user_id: string; recipient_user_id: string | null }>`
      select id, thread_id, user_id, recipient_user_id from letters where id = ${id} limit 1
    `;
    const row = base[0];
    if (!row || (row.user_id !== context.userId && row.recipient_user_id !== context.userId)) return [];
    const root = row.thread_id || row.id;
    const items = await sql<{
      id: string;
      user_id: string;
      from_name: string;
      anonymous: boolean | null;
      started_at: string;
    }>`
      select id, user_id, from_name, anonymous, started_at::text
      from letters
      where (id = ${root} or thread_id = ${root})
        and (user_id = ${context.userId} or recipient_user_id = ${context.userId})
      order by started_at asc
      limit 60
    `;
    return items.map((it) => ({
      id: it.id,
      mine: it.user_id === context.userId,
      label: it.user_id === context.userId ? "Você" : it.anonymous ? "Alguém especial" : it.from_name,
      startedAt: it.started_at,
    }));
  });
