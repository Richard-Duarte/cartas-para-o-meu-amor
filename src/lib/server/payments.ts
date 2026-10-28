/**
 * Server functions do Mercado Pago (chamadas pelo navegador). A lógica fica em payments.server.ts.
 * Desligado (modo teste) sem `PAYMENTS_MODE=mercadopago` + `MERCADOPAGO_ACCESS_TOKEN`.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { paymentsMode } from "@/lib/payments-mode";
import { SITE_URL } from "@/lib/site-url";
import type { StartResult } from "@/lib/payments-types";
import { checkoutSchema } from "@/lib/server/shop";
import {
  applyPayment,
  ensurePaymentTables,
  mp,
  paymentEnv,
  precheck,
  serverCartTotal,
  type IntentRow,
  type MpPayment,
} from "@/lib/server/payments.server";

export type { PaidResult, StartResult } from "@/lib/payments-types";

/** Modo de pagamento + se ESTA conta pode avançar sem pagar (a regra de verdade fica no checkoutLetter). */
// O endereço antigo (vercel.app) continua respondendo ao webhook (fora do redirect), para
// pagamentos criados antes da troca de domínio.
const PROD_WEBHOOK_URL = `${SITE_URL}/api/mercadopago/webhook`;

export const paymentsConfig = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const mode = paymentsMode();
    if (mode !== "mercadopago") return { mode, bypass: true };
    const sql = await getSql();
    const { bypassAllowed } = await import("@/lib/server/payments.server");
    return { mode, bypass: await bypassAllowed(sql, context.userId) };
  });

const paymentInput = z.object({
  method: z.enum(["pix", "card"]),
  token: z.string().max(200).optional(),
  paymentMethodId: z.string().max(40),
  issuerId: z.union([z.string(), z.number()]).optional(),
  installments: z.number().int().min(1).max(12).optional(),
  payer: z
    .object({
      email: z.string().max(200).optional(),
      identification: z.object({ type: z.string().max(10), number: z.string().max(20) }).optional(),
      first_name: z.string().max(80).optional(),
      last_name: z.string().max(80).optional(),
    })
    .optional(),
});


export const startPayment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ checkout: checkoutSchema, payment: paymentInput }))
  .handler(async ({ context, data }): Promise<StartResult> => {
    if (paymentsMode() !== "mercadopago") throw new Error("Pagamento real desligado.");
    const sql = await getSql();
    const { assertNotBlocked } = await import("@/lib/server/moderation.server");
    await assertNotBlocked(sql, context.userId);
    await ensurePaymentTables(sql);
    const { checkout, payment } = data;
    const { total, creditBrl } = await serverCartTotal(sql, context.userId, checkout);
    if (total <= 0) throw new Error("Carrinho grátis: use o envio sem pagamento.");
    if (Math.abs(total - checkout.paidBrl) > 0.01) throw new Error("O valor mudou. Atualize a página e confira o total.");
    await precheck(sql, context.userId, checkout);

    const intentId = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const letterId = crypto.randomUUID().slice(0, 8);
    const rc = await (await import("@/lib/server/attribution")).requestContext();
    await sql`
      insert into payment_intents (id, user_id, letter_id, method, amount_brl, credit_brl, payload_json, client_ip, client_ua)
      values (${intentId}, ${context.userId}, ${letterId}, ${payment.method}, ${total}, ${creditBrl},
        ${JSON.stringify({ ...checkout, paidBrl: total, method: payment.method })}, ${rc.ip ?? null}, ${rc.userAgent?.slice(0, 300) ?? null})
    `;
    const authUser = await sql<{ email: string }>`select email from "user" where id = ${context.userId} limit 1`;
    const email = (payment.payer?.email || authUser[0]?.email || "").trim();
    // URL fixa de produção (o webhook sempre reconsulta o pagamento na API, então é seguro).
    const notifyUrl = paymentEnv("MERCADOPAGO_NOTIFICATION_URL") || PROD_WEBHOOK_URL;
    const m = await sql<{ name: string }>`select name from messengers_catalog where id = ${checkout.messengerId} limit 1`;
    const body: Record<string, unknown> = {
      transaction_amount: total,
      description: `Carta para o meu amor · ${m[0]?.name ?? "mensageiro"}`,
      payment_method_id: payment.paymentMethodId,
      external_reference: intentId,
      statement_descriptor: "CARTAPARAOMEUAMOR",
      payer: {
        email,
        ...(payment.payer?.identification ? { identification: payment.payer.identification } : {}),
        ...(payment.payer?.first_name ? { first_name: payment.payer.first_name } : {}),
        ...(payment.payer?.last_name ? { last_name: payment.payer.last_name } : {}),
      },
      ...(notifyUrl.startsWith("https://") ? { notification_url: notifyUrl } : {}),
      metadata: { intent_id: intentId, letter_id: letterId },
    };
    if (payment.method === "card") {
      if (!payment.token) throw new Error("Cartão sem token.");
      Object.assign(body, {
        token: payment.token,
        installments: payment.installments ?? 1,
        ...(payment.issuerId ? { issuer_id: Number(payment.issuerId) || payment.issuerId } : {}),
      });
    } else {
      body.payment_method_id = "pix";
      body.date_of_expiration = new Date(Date.now() + 30 * 60 * 1000).toISOString().replace("Z", "-00:00");
    }
    let pay: MpPayment;
    try {
      pay = await mp<MpPayment>("/v1/payments", { method: "POST", body: JSON.stringify(body), idempotencyKey: intentId });
    } catch (err) {
      await sql`update payment_intents set status = 'error', updated_at = now() where id = ${intentId}`;
      if (err instanceof Error && err.message.endsWith(":payer-email"))
        throw new Error("O Mercado Pago não aceitou esse e-mail. Use outro e-mail (por exemplo, Gmail ou Outlook).");
      throw new Error("Não deu para falar com o Mercado Pago agora. Tente de novo.");
    }
    const intent = (await sql<IntentRow>`select * from payment_intents where id = ${intentId} limit 1`)[0];
    const paid = await applyPayment(sql, intent, pay);
    if (paid) return paid;
    if (pay.status === "pending" || pay.status === "in_process" || pay.status === "authorized") {
      const tx = pay.point_of_interaction?.transaction_data;
      return {
        status: "pending",
        intentId,
        qrCode: tx?.qr_code,
        qrCodeBase64: tx?.qr_code_base64,
        ticketUrl: tx?.ticket_url,
        expiresAt: pay.date_of_expiration,
      };
    }
    return { status: "rejected", intentId, detail: pay.status_detail };
  });

/** O navegador pergunta (PIX): consulta o Mercado Pago e, se aprovado, a carta nasce. */
export const paymentStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ intentId: z.string().max(40) }))
  .handler(async ({ context, data }): Promise<StartResult> => {
    if (paymentsMode() !== "mercadopago") throw new Error("Pagamento real desligado.");
    const sql = await getSql();
    await ensurePaymentTables(sql);
    const rows = await sql<IntentRow>`
      select * from payment_intents where id = ${data.intentId} and user_id = ${context.userId} limit 1
    `;
    const intent = rows[0];
    if (!intent) throw new Error("Pagamento não encontrado.");
    if (!intent.mp_payment_id) return { status: "rejected", intentId: intent.id, detail: intent.status };
    const pay = await mp<MpPayment>(`/v1/payments/${encodeURIComponent(intent.mp_payment_id)}`);
    const paid = await applyPayment(sql, intent, pay);
    if (paid) return paid;
    if (["rejected", "cancelled", "refunded", "charged_back"].includes(pay.status)) {
      return { status: "rejected", intentId: intent.id, detail: pay.status_detail ?? pay.status };
    }
    return { status: "pending", intentId: intent.id };
  });

