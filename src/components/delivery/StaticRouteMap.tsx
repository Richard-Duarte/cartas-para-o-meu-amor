import { useEffect, useRef, useState } from "react";
import { unwrapTo } from "@/lib/geo-wrap";
import type { Geo } from "@/lib/messengers";

type Point = Geo & { label: string };

type Props = {
  from: Point;
  to: Point;
};

const TILE = 256;
const TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile";

/** Web Mercator em pixels do mundo para o zoom `z`. */
function project(lat: number, lng: number, z: number) {
  const scale = TILE * 2 ** z;
  const phi = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180;
  return {
    x: ((lng + 180) / 360) * scale,
    y: ((1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2) * scale,
  };
}

/** Mesma curva do mapa 3D: pins no endereço exato, rota levemente arqueada. */
export function routeCurve(from: Geo, rawTo: Geo, steps = 80): [number, number][] {
  const to = unwrapTo(from, rawTo);
  const a: [number, number] = [from.lat, from.lng];
  let b: [number, number] = [to.lat, to.lng];
  if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.00005) b = [b[0] + 0.0004, b[1] + 0.0004];
  const span = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const bow = span * 0.18;
  const ctrl: [number, number] = [
    (a[0] + b[0]) / 2 + (-(b[1] - a[1]) / span) * bow,
    (a[1] + b[1]) / 2 + ((b[0] - a[0]) / span) * bow,
  ];
  return Array.from({ length: steps }, (_, i) => {
    const t = i / (steps - 1);
    return [
      (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * ctrl[0] + t * t * b[0],
      (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * ctrl[1] + t * t * b[1],
    ] as [number, number];
  });
}

/**
 * Mapa sem Leaflet e sem WebGL: só <img> de tiles + SVG da rota.
 * Último recurso quando nem a biblioteca do mapa carregou no aparelho.
 */
export function StaticRouteMap({ from, to }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => setSize({ w: host.clientWidth, h: host.clientHeight });
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  const { w, h } = size;
  let content = null;
  if (w > 10 && h > 10) {
    const route = routeCurve(from, to);
    const pad = Math.min(72, Math.max(36, Math.min(w, h) * 0.18));
    const all = [[from.lat, from.lng] as [number, number], [to.lat, unwrapTo(from, to).lng] as [number, number], ...route];
    let z = 14;
    for (; z > 2; z--) {
      const pts = all.map(([lat, lng]) => project(lat, lng, z));
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      if (Math.max(...xs) - Math.min(...xs) <= w - pad * 2 && Math.max(...ys) - Math.min(...ys) <= h - pad * 2) break;
    }
    const pts = all.map(([lat, lng]) => project(lat, lng, z));
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const ox = (Math.min(...xs) + Math.max(...xs)) / 2 - w / 2;
    const oy = (Math.min(...ys) + Math.max(...ys)) / 2 - h / 2;
    const n = 2 ** z;
    const tiles: { key: string; src: string; left: number; top: number }[] = [];
    for (let ty = Math.floor(oy / TILE); ty <= Math.floor((oy + h) / TILE); ty++) {
      if (ty < 0 || ty >= n) continue;
      for (let tx = Math.floor(ox / TILE); tx <= Math.floor((ox + w) / TILE); tx++) {
        const wx = ((tx % n) + n) % n;
        tiles.push({
          key: `${z}-${tx}-${ty}`,
          src: `${TILE_URL}/${z}/${ty}/${wx}`,
          left: tx * TILE - ox,
          top: ty * TILE - oy,
        });
      }
    }
    const local = (lat: number, lng: number) => {
      const p = project(lat, lng, z);
      return { x: p.x - ox, y: p.y - oy };
    };
    const line = route
      .map(([lat, lng]) => {
        const p = local(lat, lng);
        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      })
      .join(" ");
    const pins = [from, unwrapTo(from, to)].map((pin, i) => ({ ...local(pin.lat, pin.lng), label: pin.label, key: i }));
    content = (
      <>
        <div className="static-map-tiles" aria-hidden="true">
          {tiles.map((t) => (
            <img
              key={t.key}
              src={t.src}
              alt=""
              width={TILE}
              height={TILE}
              loading="eager"
              decoding="async"
              draggable={false}
              style={{ left: t.left, top: t.top }}
            />
          ))}
        </div>
        <svg className="static-map-route" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
          <polyline points={line} fill="none" stroke="#e85a7a" strokeWidth={3} strokeDasharray="6 9" strokeOpacity={0.8} />
        </svg>
        {pins.map((p) => (
          <span key={p.key} className="delivery-pin-wrap static-map-pin" style={{ left: p.x, top: p.y }}>
            <span className="delivery-pin">
              <span className="delivery-pin-name">{p.label}</span>
              <span className="delivery-pin-dot" aria-hidden="true" />
            </span>
          </span>
        ))}
        <span className="static-map-attr">Tiles © Esri — Esri, HERE, Garmin, © OpenStreetMap</span>
      </>
    );
  }

  return (
    <div ref={hostRef} className="static-map" role="img" aria-label={`Rota de ${from.label} até ${to.label}`}>
      {content}
    </div>
  );
}
