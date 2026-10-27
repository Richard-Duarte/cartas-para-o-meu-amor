import { createFileRoute } from "@tanstack/react-router";
import { syncPaymentById, validMercadoPagoSignature } from "@/lib/server/payments.server";
import { paymentsMode } from "@/lib/payments-mode";

/**
 * Webhook do Mercado Pago (Notificações → Webhooks, evento "Pagamentos").
 * Valida o x-signature quando MERCADOPAGO_WEBHOOK_SECRET existe. Em qualquer caso, só confia no status
 * que a API do MP devolve para o id (o corpo da notificação nunca é usado).
 * 200 = recebido (inclusive o que ignoramos); 401 = assinatura inválida; 500 = tente de novo.
 */
export const Route = createFileRoute("/api/mercadopago/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (paymentsMode() !== "mercadopago") return Response.json({ ok: true, ignored: "test-mode" });
        const url = new URL(request.url);
        let body: { type?: string; action?: string; data?: { id?: string | number } } = {};
        try {
          body = (await request.json()) as typeof body;
        } catch {
          /* corpo vazio */
        }
        const type = url.searchParams.get("type") || url.searchParams.get("topic") || body.type || "";
        const dataId = String(url.searchParams.get("data.id") || url.searchParams.get("id") || body.data?.id || "");
        if (!/^\d{1,20}$/.test(dataId)) return Response.json({ ok: true, ignored: "no-id" });
        const ok = await validMercadoPagoSignature({
          xSignature: request.headers.get("x-signature"),
          xRequestId: request.headers.get("x-request-id"),
          dataId,
        });
        if (!ok) return Response.json({ ok: false, error: "invalid-signature" }, { status: 401 });
        if (type !== "payment") return Response.json({ ok: true, ignored: type || "unknown" });
        try {
          const r = await syncPaymentById(dataId);
          return Response.json(r);
        } catch (err) {
          console.warn("[mp webhook]", err instanceof Error ? err.message : err);
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});
