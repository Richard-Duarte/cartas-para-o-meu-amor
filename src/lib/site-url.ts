/**
 * Endereço principal do site. Tudo que vira link público (prévia de link, links de
 * carta, convite de afiliado, avisos por e-mail/WhatsApp, webhook do Mercado Pago)
 * sai daqui. Para trocar: VITE_SITE_URL (cliente e servidor) ou SITE_URL (servidor).
 */
export const DEFAULT_SITE_URL = "https://cartaparaomeuamor.com.br";

/** Endereços antigos/alternativos que apontam para o mesmo site de produção. */
export const LEGACY_SITE_HOSTS = ["cartas-para-o-meu-amor.vercel.app", "www.cartaparaomeuamor.com.br"] as const;

function clean(raw: string | undefined) {
  const v = raw?.trim().replace(/\/+$/, "");
  return v && /^https?:\/\//.test(v) ? v : undefined;
}

const fromProcess =
  typeof process !== "undefined" && process.env ? clean(process.env.SITE_URL) : undefined;

export const SITE_URL =
  clean(import.meta.env.VITE_SITE_URL as string | undefined) ||
  clean(import.meta.env.VITE_SITE_ORIGIN as string | undefined) ||
  fromProcess ||
  DEFAULT_SITE_URL;

/**
 * Origem pública para montar links: o domínio antigo (vercel.app) e o www viram o
 * domínio principal; prévias e localhost continuam como estão (para testes).
 */
export function publicOrigin(origin: string | undefined | null): string {
  if (!origin) return SITE_URL;
  try {
    const u = new URL(origin);
    if ((LEGACY_SITE_HOSTS as readonly string[]).includes(u.hostname)) return SITE_URL;
    return u.origin;
  } catch {
    return SITE_URL;
  }
}
