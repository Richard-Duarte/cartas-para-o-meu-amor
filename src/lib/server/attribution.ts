/**
 * Atribuição de anúncios + Conversions API (Meta) / Events API (TikTok) no servidor.
 * Tudo opcional: sem as variáveis de ambiente nada é enviado, e qualquer erro aqui é engolido —
 * o checkout e a carta nunca dependem disso. Ver docs/tracking.md.
 */
import { env } from "@/lib/env.server";
import { paymentsMode } from "@/lib/payments-mode";
import type { getSql } from "@/lib/db";

type Sql = Awaited<ReturnType<typeof getSql>>;

export { attributionSchema, type AttributionInput } from "@/lib/attribution-schema";
import type { AttributionInput } from "@/lib/attribution-schema";

/** Igual a migrations/0010_attribution.sql (o PGLite/local cria na hora). */
async function ensureAttributionTable(sql: Sql) {
  await sql`create table if not exists letter_attribution (
    letter_id text primary key, user_id text,
    utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
    fbclid text, ttclid text, landing_path text, referrer text, first_seen_at timestamptz,
    created_at timestamptz not null default now()
  )`;
}

export async function saveAttribution(sql: Sql, letterId: string, userId: string, a: AttributionInput) {
  if (!a) return;
  const has = a.utm_source || a.utm_medium || a.utm_campaign || a.utm_content || a.utm_term || a.fbclid || a.ttclid;
  if (!has && !a.landing_path) return;
  try {
    await ensureAttributionTable(sql);
    const first = typeof a.first_seen_at === "number" && Number.isFinite(a.first_seen_at) ? new Date(a.first_seen_at).toISOString() : null;
    await sql`
      insert into letter_attribution (letter_id, user_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
        fbclid, ttclid, landing_path, referrer, first_seen_at)
      values (${letterId}, ${userId}, ${a.utm_source ?? null}, ${a.utm_medium ?? null}, ${a.utm_campaign ?? null},
        ${a.utm_content ?? null}, ${a.utm_term ?? null}, ${a.fbclid ?? null}, ${a.ttclid ?? null},
        ${a.landing_path ?? null}, ${a.referrer ?? null}, ${first})
      on conflict (letter_id) do nothing
    `;
  } catch (err) {
    console.warn("[attribution] não salvou", err instanceof Error ? err.message : err);
  }
}

async function sha256(v: string) {
  const buf = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(v.trim().toLowerCase()));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

type Purchase = {
  letterId: string;
  messengerId: string;
  messengerName: string;
  valueBrl: number;
  email?: string;
  externalId: string;
  sourceUrl?: string;
  ip?: string;
  userAgent?: string;
  attribution?: AttributionInput;
};

async function post(url: string, body: unknown, headers: Record<string, string> = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 2500);
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    if (!r.ok) console.warn("[capi]", url.split("?")[0], r.status, (await r.text()).slice(0, 200));
  } finally {
    clearTimeout(t);
  }
}

/** Purchase server-side (Meta CAPI + TikTok Events API). event_id = o mesmo do pixel → deduplica. */
export async function sendServerPurchase(p: Purchase) {
  // Pagamento de teste (simulado) nunca vira Purchase: só pagamento real aprovado no Mercado Pago.
  if (paymentsMode() !== "mercadopago") return;
  const eventId = `purchase-${p.letterId}`;
  const now = Math.floor(Date.now() / 1000);
  const value = Math.max(0, Math.round(p.valueBrl * 100) / 100);
  const em = p.email ? await sha256(p.email) : undefined;
  const ext = await sha256(p.externalId);
  const jobs: Promise<unknown>[] = [];

  const metaId = env("META_PIXEL_ID") ?? env("VITE_META_PIXEL_ID");
  const metaToken = env("META_CAPI_TOKEN");
  if (metaId && metaToken) {
    const testCode = env("META_TEST_EVENT_CODE");
    jobs.push(
      post(`https://graph.facebook.com/v21.0/${encodeURIComponent(metaId)}/events?access_token=${encodeURIComponent(metaToken)}`, {
        data: [
          {
            event_name: "Purchase",
            event_time: now,
            event_id: eventId,
            action_source: "website",
            event_source_url: p.sourceUrl,
            user_data: {
              ...(em ? { em: [em] } : {}),
              external_id: [ext],
              ...(p.ip ? { client_ip_address: p.ip } : {}),
              ...(p.userAgent ? { client_user_agent: p.userAgent } : {}),
              ...(p.attribution?.fbp ? { fbp: p.attribution.fbp } : {}),
              ...(p.attribution?.fbc ? { fbc: p.attribution.fbc } : {}),
            },
            custom_data: {
              currency: "BRL",
              value,
              content_ids: [p.messengerId],
              content_name: p.messengerName,
              content_type: "product",
              order_id: p.letterId,
            },
          },
        ],
        ...(testCode ? { test_event_code: testCode } : {}),
      }),
    );
  }

  const ttId = env("TIKTOK_PIXEL_ID") ?? env("VITE_TIKTOK_PIXEL_ID");
  const ttToken = env("TIKTOK_EVENTS_TOKEN");
  if (ttId && ttToken) {
    const testCode = env("TIKTOK_TEST_EVENT_CODE");
    jobs.push(
      post(
        "https://business-api.tiktok.com/open_api/v1.3/event/track/",
        {
          event_source: "web",
          event_source_id: ttId,
          ...(testCode ? { test_event_code: testCode } : {}),
          data: [
            {
              event: "CompletePayment",
              event_time: now,
              event_id: eventId,
              user: {
                ...(em ? { email: em } : {}),
                external_id: ext,
                ...(p.ip ? { ip: p.ip } : {}),
                ...(p.userAgent ? { user_agent: p.userAgent } : {}),
                ...(p.attribution?.ttclid ? { ttclid: p.attribution.ttclid } : {}),
                ...(p.attribution?.ttp ? { ttp: p.attribution.ttp } : {}),
              },
              page: p.sourceUrl ? { url: p.sourceUrl } : undefined,
              properties: {
                currency: "BRL",
                value,
                order_id: p.letterId,
                content_type: "product",
                contents: [{ content_id: p.messengerId, content_name: p.messengerName, quantity: 1, price: value }],
              },
            },
          ],
        },
        { "Access-Token": ttToken },
      ),
    );
  }
  if (!jobs.length) return;
  await Promise.allSettled(jobs);
}

/** IP / user agent do pedido atual (para o casamento de eventos do lado do anúncio). */
export async function requestContext() {
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const req = getRequest();
    const h = req?.headers;
    const ip = (h?.get("x-forwarded-for") || h?.get("x-real-ip") || "").split(",")[0].trim() || undefined;
    return { ip, userAgent: h?.get("user-agent") || undefined, referer: h?.get("referer") || undefined };
  } catch {
    return {};
  }
}
