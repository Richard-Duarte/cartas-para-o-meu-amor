/**
 * Mercado Pago (Checkout Bricks → API de pagamentos), só no servidor.
 *
 * Fluxo: o navegador cria o pagamento (`startPayment`) → guardamos um `payment_intents` com o
 * rascunho da carta → a carta SÓ nasce (placeLetter) quando o Mercado Pago diz "approved", seja pela
 * resposta imediata (cartão), pela consulta de status (PIX) ou pelo webhook. Tudo idempotente: o id
 * da carta é reservado no intent e `placeLetter` usa `on conflict do nothing`.
 *
 * Desligado (modo teste) sem `PAYMENTS_MODE=mercadopago` + `MERCADOPAGO_ACCESS_TOKEN`.
 */
import { getSql } from "@/lib/db";
import { env } from "@/lib/env.server";
import { canBypassPayment, paymentsMode } from "@/lib/payments-mode";
import { safeOrigin } from "@/lib/server/notices";
import { sendServerPurchase } from "@/lib/server/attribution";
import { placeLetter, precheckLetter, resolveCoupon, type CheckoutInput } from "@/lib/server/shop";
import { couponCut } from "@/lib/coupon-rules";
import { ANONYMOUS_FEE_BRL, SCHEDULE_FEE_BRL } from "@/lib/delivery";
import type { PaidResult } from "@/lib/payments-types";

type Sql = Awaited<ReturnType<typeof getSql>>;

const MP_API = "https://api.mercadopago.com";

export async function ensurePaymentTables(sql: Sql) {
  // Igual a migrations/0011_payments.sql (o PGLite/local cria na hora).
  await sql`create table if not exists payment_intents (
    id text primary key, user_id text not null, letter_id text not null,
    provider text not null default 'mercadopago', status text not null default 'created', status_detail text,
    method text, amount_brl numeric not null, credit_brl numeric not null default 0, mp_payment_id text,
    payload_json text not null, client_ip text, client_ua text,
    created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
    approved_at timestamptz, placed_at timestamptz
  )`;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** O valor que o SERVIDOR cobra (o navegador só sugere). Mesmas regras de buildCart (src/lib/cart.ts). */
export async function serverCartTotal(
  sql: Sql,
  userId: string,
  data: Pick<CheckoutInput, "templateId" | "messengerId" | "couponCode" | "anonymous" | "scheduled" | "useCredit" | "cartScheduled">,
) {
  const m = await sql<{ price_brl: number }>`select price_brl from messengers_catalog where id = ${data.messengerId} limit 1`;
  if (!m[0]) throw new Error("Mensageiro indisponível.");
  const t = await sql<{ paid: boolean; price_brl: number }>`select paid, price_brl from templates where id = ${data.templateId} limit 1`;
  let total = Number(m[0].price_brl) + (t[0]?.paid ? Number(t[0].price_brl) : 0);
  const settings = new Map<string, number>();
  try {
    const r = await sql<{ key: string; value: string }>`
      select key, value from app_settings where key in ('anonymous_fee', 'schedule_fee')
    `;
    for (const row of r) {
      const v = Number(row.value);
      if (Number.isFinite(v) && v >= 0) settings.set(row.key, round2(v));
    }
  } catch {
    /* padrão */
  }
  if (data.anonymous) total += settings.get("anonymous_fee") ?? ANONYMOUS_FEE_BRL;
  if (data.cartScheduled ?? data.scheduled) total += settings.get("schedule_fee") ?? SCHEDULE_FEE_BRL;
  total = round2(total);
  if (data.couponCode) {
    // Regras (AMOR: login, 2º envio, 1x por conta) conferidas aqui. Cupom comum inválido = sem desconto.
    const c = await resolveCoupon(sql, userId, data.couponCode);
    if (!c.ok && c.ruleBlocked) throw new Error(c.message);
    if (c.ok) total = couponCut(total, { percent: c.percent, amountBrl: c.amountBrl }).total;
  }
  let creditBrl = 0;
  if (data.useCredit) {
    const p = await sql<{ credit_brl: number }>`select credit_brl from profiles where user_id = ${userId} limit 1`;
    creditBrl = round2(Math.min(Math.max(0, total), Number(p[0]?.credit_brl ?? 0)));
    total = round2(total - creditBrl);
  }
  return { total: round2(Math.max(0, total)), creditBrl: round2(creditBrl) };
}

export type MpPayment = {
  id: number;
  status: string;
  status_detail?: string;
  transaction_amount: number;
  currency_id?: string;
  external_reference?: string;
  payment_method_id?: string;
  point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string } };
  date_of_expiration?: string;
};

export async function mp<T>(path: string, init: RequestInit & { idempotencyKey?: string } = {}): Promise<T> {
  const token = env("MERCADOPAGO_ACCESS_TOKEN");
  if (!token) throw new Error("Mercado Pago sem credencial.");
  const res = await fetch(`${MP_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.idempotencyKey ? { "X-Idempotency-Key": init.idempotencyKey } : {}),
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    console.warn("[mp]", path, res.status, text.slice(0, 300));
    throw new Error(`mp-${res.status}${/Payer email forbidden|"code":\s*4390/.test(text) ? ":payer-email" : ""}`);
  }
  return JSON.parse(text) as T;
}

export type IntentRow = {
  id: string;
  user_id: string;
  letter_id: string;
  status: string;
  method: string | null;
  amount_brl: number;
  credit_brl: number;
  mp_payment_id: string | null;
  payload_json: string;
  client_ip: string | null;
  client_ua: string | null;
  placed_at: string | null;
};


/**
 * Aplica o status do Mercado Pago ao intent. Se aprovado: cria a carta (idempotente), gasta o crédito
 * e manda o Purchase server-side — esses dois só na 1ª vez (`placed_at`).
 */
export async function applyPayment(sql: Sql, intent: IntentRow, pay: MpPayment): Promise<PaidResult | null> {
  await sql`
    update payment_intents set status = ${pay.status}, status_detail = ${pay.status_detail ?? null},
      mp_payment_id = ${String(pay.id)}, updated_at = now()
    where id = ${intent.id}
  `;
  if (pay.status !== "approved") return null;
  // Confere que é ESTE pedido e o valor certo antes de liberar a carta.
  if (pay.external_reference !== intent.id) throw new Error("Pagamento de outro pedido.");
  if ((pay.currency_id && pay.currency_id !== "BRL") || pay.transaction_amount + 0.01 < Number(intent.amount_brl)) {
    await sql`update payment_intents set status = 'amount_mismatch', updated_at = now() where id = ${intent.id}`;
    throw new Error("Valor pago não confere.");
  }
  const payload = JSON.parse(intent.payload_json) as CheckoutInput;
  const placed = await placeLetter(sql, intent.user_id, payload, { letterId: intent.letter_id });
  const first = await sql<{ id: string }>`
    update payment_intents set placed_at = now(), approved_at = coalesce(approved_at, now()), updated_at = now()
    where id = ${intent.id} and placed_at is null
    returning id
  `;
  if (first.length) {
    if (Number(intent.credit_brl) > 0) {
      await sql`update profiles set credit_brl = greatest(credit_brl - ${Number(intent.credit_brl)}, 0) where user_id = ${intent.user_id}`;
    }
    try {
      const authUser = await sql<{ email: string }>`select email from "user" where id = ${intent.user_id} limit 1`;
      const m = await sql<{ name: string }>`select name from messengers_catalog where id = ${payload.messengerId} limit 1`;
      await sendServerPurchase({
        letterId: placed.id,
        messengerId: payload.messengerId,
        messengerName: m[0]?.name ?? payload.messengerId,
        valueBrl: pay.transaction_amount,
        email: authUser[0]?.email || undefined,
        externalId: intent.user_id,
        sourceUrl: payload.origin ? `${safeOrigin(payload.origin)}/pagar` : undefined,
        ip: intent.client_ip ?? undefined,
        userAgent: intent.client_ua ?? undefined,
        attribution: payload.attribution,
      });
    } catch (err) {
      console.warn("[capi] falhou", err instanceof Error ? err.message : err);
    }
  }
  return {
    status: "approved",
    letterId: placed.id,
    paymentId: String(pay.id),
    amountBrl: pay.transaction_amount,
    method: intent.method ?? pay.payment_method_id ?? "mercadopago",
    linkSent: placed.linkSent,
    notice: placed.notice,
    toName: placed.toName,
    departAt: placed.departAt,
    arriveAt: placed.arriveAt,
  };
}

/** Para o webhook: busca o pagamento NA API (nunca confia no corpo da notificação). */
export async function syncPaymentById(paymentId: string) {
  if (paymentsMode() !== "mercadopago") return { ok: true, ignored: "test-mode" };
  const sql = await getSql();
  await ensurePaymentTables(sql);
  let pay: MpPayment;
  try {
    pay = await mp<MpPayment>(`/v1/payments/${encodeURIComponent(paymentId)}`);
  } catch (err) {
    // Id que não existe nesta conta: nada a fazer (não pedir reenvio).
    if (err instanceof Error && err.message.startsWith("mp-404")) return { ok: true, ignored: "not-found" };
    throw err;
  }
  if (!pay.external_reference) return { ok: true, ignored: "no-reference" };
  const rows = await sql<IntentRow>`select * from payment_intents where id = ${pay.external_reference} limit 1`;
  if (!rows[0]) return { ok: true, ignored: "unknown-intent" };
  const r = await applyPayment(sql, rows[0], pay);
  return { ok: true, status: pay.status, letterId: r?.letterId };
}

/** Assinatura do webhook: HMAC-SHA256 de `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`. */
export async function validMercadoPagoSignature(opts: { xSignature: string | null; xRequestId: string | null; dataId: string }) {
  const secret = env("MERCADOPAGO_WEBHOOK_SECRET");
  // Sem a assinatura secreta cadastrada, não dá para validar; o webhook segue seguro porque
  // nunca usa o corpo: reconsulta o pagamento na API do MP com o access token.
  if (!secret) return true;
  if (!opts.xSignature) return false;
  const parts = Object.fromEntries(
    opts.xSignature.split(",").map((kv) => {
      const [k, ...v] = kv.split("=");
      return [k.trim(), v.join("=").trim()];
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;
  const id = /^[a-z0-9]+$/i.test(opts.dataId) ? opts.dataId.toLowerCase() : opts.dataId;
  let manifest = "";
  if (id) manifest += `id:${id};`;
  if (opts.xRequestId) manifest += `request-id:${opts.xRequestId};`;
  manifest += `ts:${ts};`;
  const key = await globalThis.crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await globalThis.crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}

export const paymentEnv = env;
export const precheck = precheckLetter;

/**
 * Atalho "avançar sem pagamento": só para o e-mail em PAYMENT_BYPASS_EMAILS e só se
 * esse e-mail for comprovadamente do dono (verificado ou vindo de login Google/X),
 * para ninguém criar uma conta com e-mail/senha usando o e-mail dele.
 */
export async function bypassAllowed(sql: Awaited<ReturnType<typeof getSql>>, userId: string) {
  const rows = await sql<{ email: string; verified: boolean; social: boolean }>`
    select u.email, coalesce(u."emailVerified", false) as verified,
      exists (select 1 from "account" a where a."userId" = u.id and a."providerId" <> 'credential') as social
    from "user" u where u.id = ${userId} limit 1`;
  const u = rows[0];
  return Boolean(u && (u.verified || u.social) && canBypassPayment(u.email));
}
