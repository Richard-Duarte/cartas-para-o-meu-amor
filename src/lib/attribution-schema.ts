import { z } from "zod";

/** Origem do anúncio que o navegador manda no checkout (isomórfico: sem nada de servidor). */
const s = (n: number) => z.string().transform((v) => v.trim().slice(0, n)).optional();
export const attributionSchema = z
  .object({
    utm_source: s(200),
    utm_medium: s(200),
    utm_campaign: s(200),
    utm_content: s(200),
    utm_term: s(200),
    fbclid: s(500),
    ttclid: s(500),
    landing_path: s(200),
    referrer: s(300),
    first_seen_at: z.number().optional(),
    fbp: s(200),
    fbc: s(600),
    ttp: s(200),
  })
  .partial()
  .optional()
  // Atribuição ruim nunca pode recusar um checkout: vira "sem atribuição".
  .catch(undefined);
export type AttributionInput = z.infer<typeof attributionSchema>;

