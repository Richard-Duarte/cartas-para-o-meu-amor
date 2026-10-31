/**
 * Pixels de anúncio (Meta + TikTok), 100% por variável de ambiente.
 *
 * - Sem `VITE_META_PIXEL_ID` / `VITE_TIKTOK_PIXEL_ID`: nenhum script carrega e `track()` não faz nada.
 * - Nunca mandamos conteúdo da carta, nomes ou endereços: só mensageiro, valor e ids.
 * - UTMs e fbclid/ttclid ficam guardados no navegador (primeiro toque + último toque) e vão junto
 *   do checkout para o servidor (tabela aditiva `letter_attribution`).
 * Ver docs/tracking.md.
 */

const META_ID = String(import.meta.env.VITE_META_PIXEL_ID ?? "").trim();
const TIKTOK_ID = String(import.meta.env.VITE_TIKTOK_PIXEL_ID ?? "").trim();

export const TRACKING_ENABLED = Boolean(META_ID || TIKTOK_ID);

type Params = Record<string, unknown>;
type W = Window & {
  fbq?: ((...a: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };
  _fbq?: unknown;
  ttq?: {
    load: (id: string) => void;
    page: () => void;
    track: (e: string, p?: Params, o?: Params) => void;
    [k: string]: unknown;
  };
  TiktokAnalyticsObject?: string;
};

const ATTR_KEY = "trk:attr";
const PENDING_KEY = "trk:pending";
const FIRST_KEY = "trk:first";
const ATTR_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "ttclid", "gclid"] as const;
export type Attribution = Partial<Record<(typeof ATTR_FIELDS)[number], string>> & {
  landing_path?: string;
  referrer?: string;
  first_seen_at?: number;
  fbp?: string;
  fbc?: string;
  ttp?: string;
};

let booted = false;

function safeStorage(kind: "local" | "session"): Storage | null {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function cookie(name: string) {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : undefined;
  } catch {
    return undefined;
  }
}

/** Guarda UTMs / click ids da URL de entrada. Último toque vence; o 1º caminho/referrer fica. */
export function captureAttribution() {
  if (typeof window === "undefined") return;
  const store = safeStorage("local");
  if (!store) return;
  const q = new URLSearchParams(window.location.search);
  const found: Attribution = {};
  for (const k of ATTR_FIELDS) {
    const v = q.get(k)?.trim();
    if (v) found[k] = v.slice(0, 200);
  }
  let prev: Attribution = {};
  try {
    prev = JSON.parse(store.getItem(ATTR_KEY) || "{}") as Attribution;
  } catch {
    prev = {};
  }
  const hasNew = Object.keys(found).length > 0;
  // Primeiro toque: gravado uma única vez (vai para a conta no cadastro; o painel mostra "de onde veio").
  if (!store.getItem(FIRST_KEY)) {
    try {
      store.setItem(
        FIRST_KEY,
        JSON.stringify({
          ...found,
          landing_path: window.location.pathname.slice(0, 200),
          referrer: document.referrer.slice(0, 300),
          first_seen_at: Date.now(),
        }),
      );
    } catch {
      /* cheio / bloqueado */
    }
  }
  if (!hasNew && prev.first_seen_at) return;
  const next: Attribution = hasNew
    ? { ...found, landing_path: window.location.pathname.slice(0, 200), referrer: document.referrer.slice(0, 300), first_seen_at: Date.now() }
    : { landing_path: window.location.pathname.slice(0, 200), referrer: document.referrer.slice(0, 300), first_seen_at: Date.now() };
  if (found.fbclid) next.fbc = `fb.1.${Date.now()}.${found.fbclid}`;
  try {
    store.setItem(ATTR_KEY, JSON.stringify(next));
  } catch {
    /* cheio / bloqueado */
  }
}

/** Primeiro toque guardado neste navegador (UTMs, click ids, referrer e página de entrada). */
export function readFirstTouch(): Attribution | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = safeStorage("local")?.getItem(FIRST_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : undefined;
  } catch {
    return undefined;
  }
}

/** Atribuição guardada + cookies dos pixels (_fbp, _fbc, _ttp) para o servidor deduplicar. */
export function readAttribution(): Attribution | undefined {
  if (typeof window === "undefined") return undefined;
  let a: Attribution = {};
  try {
    a = JSON.parse(safeStorage("local")?.getItem(ATTR_KEY) || "{}") as Attribution;
  } catch {
    a = {};
  }
  const fbp = cookie("_fbp");
  const fbc = cookie("_fbc") || a.fbc;
  const ttp = cookie("_ttp");
  const out: Attribution = { ...a, ...(fbp ? { fbp } : {}), ...(fbc ? { fbc } : {}), ...(ttp ? { ttp } : {}) };
  return Object.keys(out).length ? out : undefined;
}

const SAFE_ID = /^[A-Za-z0-9_-]{4,40}$/;

function inline(code: string) {
  const s = document.createElement("script");
  s.textContent = code;
  document.head.appendChild(s);
}

function loadMeta(w: W) {
  if (!META_ID || w.fbq || !SAFE_ID.test(META_ID)) return;
  /* Snippet oficial do Meta Pixel (sem o PageView: ele sai em trackPageView, a cada rota). */
  inline(
    `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');` +
      `fbq('init',${JSON.stringify(META_ID)});`,
  );
}

function loadTikTok(w: W) {
  if (!TIKTOK_ID || w.ttq || !SAFE_ID.test(TIKTOK_ID)) return;
  /* Snippet oficial do TikTok Pixel (sem o ttq.page(): sai em trackPageView). */
  inline(
    `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=d.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=d.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};` +
      `ttq.load(${JSON.stringify(TIKTOK_ID)});}(window,document,'ttq');`,
  );
}

/** Chamado uma vez no boot do app (no navegador). */
export function bootTracking() {
  if (typeof window === "undefined" || booted) return;
  booted = true;
  captureAttribution();
  if (!TRACKING_ENABLED) return;
  const w = window as W;
  try {
    loadMeta(w);
    loadTikTok(w);
  } catch {
    /* pixel nunca derruba o site */
  }
  flushPending();
}

/** PageView: a cada troca de rota (TanStack Router). */
function newEventId(prefix: string) {
  try {
    return `${prefix}-${crypto.randomUUID()}`;
  } catch {
    return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  }
}

/** Mesmo evento pela Conversions API (servidor), com o mesmo event_id do pixel. Nunca bloqueia. */
function serverCopy(event: "PageView" | "InitiateCheckout", eventId: string, product?: Product) {
  if (!META_ID) return;
  void import("@/lib/server/capi")
    .then(({ sendBrowserEvent }) =>
      sendBrowserEvent({
        data: {
          event,
          eventId,
          url: window.location.href.split("#")[0].slice(0, 500),
          ...(product
            ? { value: Math.max(0, Math.round(product.value * 100) / 100), contentId: product.id.slice(0, 60), contentName: product.name.slice(0, 80) }
            : {}),
          fbp: cookie("_fbp"),
          fbc: cookie("_fbc"),
        },
      }),
    )
    .catch(() => {});
}

export function trackPageView() {
  if (!TRACKING_ENABLED || typeof window === "undefined") return;
  const w = window as W;
  try {
    const eventId = newEventId("pv");
    if (w.fbq) w.fbq("track", "PageView", {}, { eventID: eventId });
    serverCopy("PageView", eventId);
    w.ttq?.page();
  } catch {
    /* ignore */
  }
}

/** Nomes do TikTok para os eventos padrão do Meta. */
const TIKTOK_NAME: Record<string, string> = {
  ViewContent: "ViewContent",
  InitiateCheckout: "InitiateCheckout",
  AddPaymentInfo: "AddPaymentInfo",
  Purchase: "CompletePayment",
  CompleteRegistration: "CompleteRegistration",
  Lead: "SubmitForm",
};

export type Product = { id: string; name: string; value: number };

function productParams(p: Product, extra?: Params) {
  const value = Math.max(0, Math.round(p.value * 100) / 100);
  return {
    meta: { content_ids: [p.id], content_name: p.name, content_type: "product", value, currency: "BRL", ...extra },
    tiktok: {
      contents: [{ content_id: p.id, content_name: p.name, content_type: "product", quantity: 1, price: value }],
      content_type: "product",
      value,
      currency: "BRL",
    },
  };
}

export function track(event: keyof typeof TIKTOK_NAME, product?: Product, opts?: { eventId?: string; extra?: Params }) {
  if (!TRACKING_ENABLED || typeof window === "undefined") return;
  const w = window as W;
  const p = product ? productParams(product, opts?.extra) : { meta: { ...opts?.extra }, tiktok: {} };
  // InitiateCheckout também vai pelo servidor (CAPI) com o mesmo event_id.
  if (event === "InitiateCheckout" && !opts?.eventId) {
    opts = { ...opts, eventId: newEventId("ic") };
    serverCopy("InitiateCheckout", opts.eventId!, product);
  }
  try {
    if (w.fbq) {
      if (opts?.eventId) w.fbq("track", event, p.meta, { eventID: opts.eventId });
      else w.fbq("track", event, p.meta);
    }
    if (w.ttq) w.ttq.track(TIKTOK_NAME[event] ?? event, p.tiktok, opts?.eventId ? { event_id: opts.eventId } : undefined);
  } catch {
    /* ignore */
  }
}

/** ViewContent no máximo 1x por mensageiro por sessão. */
export function trackViewMessenger(product: Product) {
  const s = safeStorage("session");
  const key = `trk:vc:${product.id}`;
  if (s?.getItem(key)) return;
  s?.setItem(key, "1");
  track("ViewContent", product);
}

/** Purchase deduplicado: o mesmo event_id do servidor (CAPI) e nunca 2x no mesmo navegador. */
export function purchaseEventId(letterId: string) {
  return `purchase-${letterId}`;
}
/** Só com pagamento REAL aprovado (Mercado Pago). O checkout de teste nunca dispara Purchase. */
export function trackPurchase(letterId: string, product: Product, proof: { approvedPaymentId: string }) {
  if (!proof?.approvedPaymentId) return;
  const s = safeStorage("local");
  const key = `trk:purchase:${letterId}`;
  if (s?.getItem(key)) return;
  s?.setItem(key, String(Date.now()));
  track("Purchase", product, { eventId: purchaseEventId(letterId) });
}

/** Evento para mandar depois de um redirect (ex.: cadastro → volta para o app). */
export function queueEvent(event: keyof typeof TIKTOK_NAME, extra?: Params) {
  if (!TRACKING_ENABLED) return;
  try {
    safeStorage("session")?.setItem(PENDING_KEY, JSON.stringify({ event, extra, at: Date.now() }));
  } catch {
    /* ignore */
  }
}
function flushPending() {
  const s = safeStorage("session");
  const raw = s?.getItem(PENDING_KEY);
  if (!raw) return;
  s?.removeItem(PENDING_KEY);
  try {
    const { event, extra, at } = JSON.parse(raw) as { event: keyof typeof TIKTOK_NAME; extra?: Params; at: number };
    if (Date.now() - at < 10 * 60 * 1000) track(event, undefined, { extra });
  } catch {
    /* ignore */
  }
}
