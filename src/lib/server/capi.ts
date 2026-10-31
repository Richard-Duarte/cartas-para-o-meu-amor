import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Conversions API (Meta) para eventos do navegador: PageView e InitiateCheckout.
 * O pixel manda o MESMO `event_id` (eventID), então o Meta deduplica.
 * Purchase NÃO passa por aqui: sai só do servidor quando o Mercado Pago aprova
 * (payments.server.ts → sendServerPurchase).
 * Sem META_CAPI_TOKEN (ou sem pixel id) não faz nada; qualquer erro é engolido.
 */
const input = z.object({
  event: z.enum(["PageView", "InitiateCheckout"]),
  eventId: z.string().regex(/^[a-z]{2,4}-[A-Za-z0-9-]{8,64}$/),
  url: z.string().max(500).optional(),
  value: z.number().min(0).max(10000).optional(),
  contentId: z.string().max(60).optional(),
  contentName: z.string().max(80).optional(),
  fbp: z.string().max(200).optional(),
  fbc: z.string().max(300).optional(),
});

export const sendBrowserEvent = createServerFn({ method: "POST" })
  .validator(input)
  .handler(async ({ data }) => {
    try {
      const { env } = await import("@/lib/env.server");
      const metaId = env("META_PIXEL_ID") ?? env("VITE_META_PIXEL_ID");
      const token = env("META_CAPI_TOKEN");
      if (!metaId || !token) return { ok: false as const, skipped: "no-config" };
      const { requestContext, postMetaEvents } = await import("@/lib/server/attribution");
      const rc = await requestContext();
      const sourceUrl = data.url && /^https:\/\/(www\.)?cartaparaomeuamor\.com\.br(\/|$)/.test(data.url) ? data.url : undefined;
      await postMetaEvents(metaId, token, [
        {
          event_name: data.event,
          event_time: Math.floor(Date.now() / 1000),
          event_id: data.eventId,
          action_source: "website",
          ...(sourceUrl ? { event_source_url: sourceUrl } : {}),
          user_data: {
            ...(rc.ip ? { client_ip_address: rc.ip } : {}),
            ...(rc.userAgent ? { client_user_agent: rc.userAgent } : {}),
            ...(data.fbp ? { fbp: data.fbp } : {}),
            ...(data.fbc ? { fbc: data.fbc } : {}),
          },
          ...(data.event === "InitiateCheckout"
            ? {
                custom_data: {
                  currency: "BRL",
                  value: Math.round((data.value ?? 0) * 100) / 100,
                  ...(data.contentId ? { content_ids: [data.contentId], content_type: "product" } : {}),
                  ...(data.contentName ? { content_name: data.contentName } : {}),
                  num_items: 1,
                },
              }
            : {}),
        },
      ]);
      return { ok: true as const };
    } catch {
      return { ok: false as const };
    }
  });
