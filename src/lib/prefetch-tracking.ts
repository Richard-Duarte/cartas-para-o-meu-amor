import { messengerModelId, type Geo, type MessengerId } from "@/lib/messengers";

/**
 * Esquenta a tela de acompanhamento enquanto a pessoa paga: chunks (engine = three +
 * leaflet, DeliveryJourney), modelo 3D do mensageiro, decoder draco, HDR e os tiles do
 * mapa da visão inicial. Tudo em tempo ocioso, em baixa prioridade e calado em erro.
 * Save-Data / 2g: só os chunks leves, sem 3D nem tiles.
 */

type Conn = { saveData?: boolean; effectiveType?: string };

function slowNet() {
  const c = (navigator as Navigator & { connection?: Conn }).connection;
  return Boolean(c?.saveData || /(^|-)2g$/.test(c?.effectiveType || ""));
}

function idle(fn: () => void, timeout = 2500) {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(fn, { timeout });
  else window.setTimeout(fn, 600);
}

const done = new Set<string>();
const once = (key: string, fn: () => unknown) => {
  if (done.has(key)) return;
  done.add(key);
  try {
    void Promise.resolve(fn()).catch(() => done.delete(key));
  } catch {
    done.delete(key);
  }
};

/** Mesmo cálculo do Leaflet (fitBounds, padding 72, maxZoom 14) para saber os tiles iniciais. */
export function initialTileUrls(from: Geo, to: Geo, max = 16): string[] {
  const w = Math.min(window.innerWidth, 960);
  const h = window.innerWidth < 700 ? Math.round(window.innerHeight * 0.62) : 520;
  const px = (lat: number, lng: number, z: number) => {
    const s = 256 * 2 ** z;
    const sin = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180);
    return [((lng + 180) / 360) * s, (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * s];
  };
  let z = 14;
  for (; z > 1; z--) {
    const a = px(from.lat, from.lng, z);
    const b = px(to.lat, to.lng, z);
    if (Math.abs(a[0] - b[0]) <= w - 112 && Math.abs(a[1] - b[1]) <= h - 160) break;
  }
  const a = px(from.lat, from.lng, z);
  const b = px(to.lat, to.lng, z);
  const cx = (a[0] + b[0]) / 2;
  const cy = (a[1] + b[1]) / 2;
  const urls: string[] = [];
  const x0 = Math.floor((cx - w / 2) / 256);
  const x1 = Math.floor((cx + w / 2) / 256);
  const y0 = Math.floor((cy - h / 2) / 256);
  const y1 = Math.floor((cy + h / 2) / 256);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (urls.length >= max) return urls;
      urls.push(
        `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/${z}/${y}/${x}`,
      );
    }
  }
  return urls;
}

export function prefetchTracking(opts: { messengerId: MessengerId; from?: Geo; to?: Geo }) {
  if (typeof window === "undefined") return;
  idle(() => {
    // 1) chunks: ficam no cache de módulos (falha aqui é silenciosa; a tela de acompanhar
    //    tem o próprio "recarrega uma vez" se o arquivo sumiu num deploy novo).
    once("chunk:journey", () => import("@/components/delivery/DeliveryJourney"));
    if (slowNet()) return;
    once("chunk:engine", () => import("@/components/delivery/engine.js"));
    // 2) 3D: liga o cache do three e esquenta com o mesmo FileLoader/responseType dos loaders.
    const aid = messengerModelId(opts.messengerId);
    once(`3d:${aid}`, async () => {
      const THREE = await import("three");
      THREE.Cache.enabled = true;
      const load = (url: string, type: "arraybuffer" | "text" | "json") =>
        new Promise<void>((resolve) => {
          const l = new THREE.FileLoader();
          l.setResponseType(type);
          l.load(url, () => resolve(), undefined, () => resolve());
        });
      await load(`/models/${aid}.glb`, "arraybuffer");
      await Promise.all([
        load("/draco/draco_wasm_wrapper.js", "text"),
        load("/draco/draco_decoder.wasm", "arraybuffer"),
        // eyes/gait são lidos com fetch(): basta o cache HTTP.
        fetch(`/models/${aid}_eyes.json`, { priority: "low" } as RequestInit).catch(() => undefined),
        fetch(`/models/${aid}_gait.json`, { priority: "low" } as RequestInit).catch(() => undefined),
      ]);
      await load("/env/sky_1k.hdr", "arraybuffer");
    });
    // 3) tiles da visão inicial (mesmo <img> sem CORS do Leaflet = mesmo cache).
    if (opts.from && opts.to) {
      const urls = initialTileUrls(opts.from, opts.to);
      once(`tiles:${urls[0]}`, () => {
        for (const u of urls) {
          const img = new Image();
          (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = "low";
          img.decoding = "async";
          img.src = u;
        }
      });
    }
  });
}
