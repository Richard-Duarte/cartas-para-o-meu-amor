/**
 * Origem (canal) e plataforma de um acesso. Isomórfico: o navegador manda os dados crus e o
 * servidor classifica de novo com estas mesmas funções (nunca confia no rótulo vindo do cliente).
 */

export const CHANNELS = [
  "instagram",
  "facebook",
  "tiktok",
  "x",
  "google",
  "whatsapp",
  "direto",
  "outro",
  "desconhecido",
] as const;
export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_LABEL: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  x: "X (Twitter)",
  google: "Google",
  whatsapp: "WhatsApp",
  direto: "Direto",
  outro: "Outro",
  desconhecido: "Desconhecido",
};

export const PLATFORMS = ["ios", "android", "desktop", "desconhecido"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABEL: Record<string, string> = {
  ios: "iPhone / iPad",
  android: "Android",
  desktop: "Computador",
  desconhecido: "Desconhecido",
  pwa: "App instalado",
};

function hostOf(url?: string | null) {
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

const OWN_HOSTS = ["cartas-para-o-meu-amor.vercel.app", "cartaparaomeuamor.com.br"];

function fromName(raw: string): Channel | null {
  const s = raw.toLowerCase().trim();
  if (!s) return null;
  if (/(^|[^a-z])(ig|insta|instagram)([^a-z]|$)/.test(s) || s.includes("instagram")) return "instagram";
  if (/(^|[^a-z])(fb|meta)([^a-z]|$)/.test(s) || s.includes("facebook")) return "facebook";
  if (s.includes("tiktok") || /(^|[^a-z])tt([^a-z]|$)/.test(s)) return "tiktok";
  if (s === "x" || s.includes("twitter") || s === "t.co" || s === "x.com") return "x";
  if (s.includes("google") || s === "gads" || s === "adwords") return "google";
  if (s.includes("whatsapp") || s === "wa" || s === "wpp" || s === "zap") return "whatsapp";
  return null;
}

function fromReferrer(ref?: string | null): Channel | null {
  const h = hostOf(ref);
  if (!h) return null;
  if (OWN_HOSTS.some((own) => h === own || h.endsWith(`.${own}`)) || h.endsWith(".vercel.app")) return null;
  if (h.endsWith("instagram.com")) return "instagram";
  if (h.endsWith("facebook.com") || h === "fb.com" || h.endsWith("fb.me") || h === "m.me") return "facebook";
  if (h.endsWith("tiktok.com")) return "tiktok";
  if (h === "t.co" || h.endsWith("twitter.com") || h === "x.com") return "x";
  if (/(^|\.)google\.[a-z.]+$/.test(h) || h.endsWith("googleadservices.com")) return "google";
  if (h.endsWith("whatsapp.com") || h === "wa.me") return "whatsapp";
  return "outro";
}

export type RawAttribution = {
  utm_source?: string | null;
  utm_medium?: string | null;
  fbclid?: string | null;
  ttclid?: string | null;
  gclid?: string | null;
  referrer?: string | null;
};

/** Canal de aquisição: UTM > click id > referrer > direto. */
export function classifyChannel(a: RawAttribution | null | undefined): Channel {
  if (!a) return "desconhecido";
  const byUtm = fromName(a.utm_source ?? "");
  if (byUtm) return byUtm;
  if (a.ttclid) return "tiktok";
  if (a.gclid) return "google";
  const byRef = fromReferrer(a.referrer);
  if (a.fbclid) return byRef === "instagram" ? "instagram" : "facebook";
  if (byRef) return byRef;
  if (a.utm_source) return "outro";
  return "direto";
}

export type ParsedAgent = {
  platform: Platform;
  os: string;
  browser: string;
  device: "mobile" | "tablet" | "desktop";
};

/** Leitura simples do user agent (sem biblioteca): sistema, navegador e tipo de aparelho. */
export function parseUserAgent(ua: string | null | undefined, touchMac = false): ParsedAgent {
  const s = ua || "";
  if (!s) return { platform: "desconhecido", os: "Desconhecido", browser: "Desconhecido", device: "desktop" };
  let os = "Outro";
  let platform: Platform = "desktop";
  let device: ParsedAgent["device"] = "desktop";
  if (/iPhone|iPod/.test(s)) {
    os = "iOS";
    platform = "ios";
    device = "mobile";
  } else if (/iPad/.test(s) || (touchMac && /Macintosh/.test(s))) {
    os = "iPadOS";
    platform = "ios";
    device = "tablet";
  } else if (/Android/.test(s)) {
    os = "Android";
    platform = "android";
    device = /Mobile/.test(s) ? "mobile" : "tablet";
  } else if (/Windows/.test(s)) os = "Windows";
  else if (/Macintosh|Mac OS X/.test(s)) os = "macOS";
  else if (/CrOS/.test(s)) os = "ChromeOS";
  else if (/Linux/.test(s)) os = "Linux";

  let browser = "Outro";
  if (/Instagram/.test(s)) browser = "Instagram (no app)";
  else if (/FBAN|FBAV|FB_IAB/.test(s)) browser = "Facebook (no app)";
  else if (/musical_ly|BytedanceWebview|TikTok/i.test(s)) browser = "TikTok (no app)";
  else if (/WhatsApp/.test(s)) browser = "WhatsApp";
  else if (/EdgiOS|EdgA|Edg\//.test(s)) browser = "Edge";
  else if (/SamsungBrowser/.test(s)) browser = "Samsung Internet";
  else if (/OPR\/|Opera/.test(s)) browser = "Opera";
  else if (/FxiOS|Firefox\//.test(s)) browser = "Firefox";
  else if (/CriOS|Chrome\//.test(s)) browser = "Chrome";
  else if (/Safari\//.test(s)) browser = "Safari";
  return { platform, os, browser, device };
}
