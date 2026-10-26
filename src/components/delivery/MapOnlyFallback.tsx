"use client";

import { useEffect, useRef, useState } from "react";
import type { Letter } from "@/lib/letters";
import type { Geo } from "@/lib/messengers";
import { letterEndpoints } from "./journey";
import { routeCurve, StaticRouteMap } from "./StaticRouteMap";
import "leaflet/dist/leaflet.css";
import "./delivery.css";

type Props = {
  letter: Letter;
  /** O 3D não carregou por falha de rede/arquivo (não por limite do aparelho). */
  loadFailed?: boolean;
};

const FALLBACK_FROM: Geo = { lat: -23.5505, lng: -46.6333 };
const FALLBACK_TO: Geo = { lat: -22.9068, lng: -43.1729 };

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

/** Mesma regra do engine: coordenada inválida cai no centro da cidade padrão. */
function safeGeo(geo: Partial<Geo> | undefined, fallback: Geo): Geo {
  const lat = Number(geo?.lat);
  const lng = Number(geo?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : fallback;
}

/** Mapa sem WebGL — usado quando o mensageiro 3D falha no aparelho. */
export function MapOnlyFallback({ letter, loadFailed = false }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const ends = letterEndpoints(letter);
  const from = { ...safeGeo(ends.from, FALLBACK_FROM), label: ends.from.label };
  const to = { ...safeGeo(ends.to, FALLBACK_TO), label: ends.to.label };
  // Se nem o Leaflet carregar (rede/arquivo), desenha um mapa estático de tiles.
  const [staticMap, setStaticMap] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let dead = false;
    let map: { remove: () => void } | null = null;
    setStaticMap(false);

    import("leaflet")
      .then((mod) => {
        if (dead || !host) return;
        const L = mod.default ?? (mod as unknown as typeof mod.default);
        const a: [number, number] = [from.lat, from.lng];
        const b: [number, number] = [to.lat, to.lng];
        const route = routeCurve(from, to);
        const m = L.map(host, { zoomControl: false, scrollWheelZoom: false });
        map = m;
        L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
          {
            attribution: "Tiles © Esri — Esri, HERE, Garmin, © OpenStreetMap",
            maxZoom: 16,
          },
        ).addTo(m);
        L.polyline(route, { color: "#e85a7a", weight: 3, dashArray: "6 9", opacity: 0.8 }).addTo(m);
        const pin = (ll: [number, number], label: string) => {
          const icon = L.divIcon({
            className: "delivery-pin-wrap",
            html: `<span class="delivery-pin"><span class="delivery-pin-name">${esc(label)}</span><span class="delivery-pin-dot" aria-hidden="true"></span></span>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          });
          L.marker(ll, { icon, interactive: false, keyboard: false }).addTo(m);
        };
        pin(a, from.label);
        pin(b, to.label);
        const bounds = L.latLngBounds([a, b, ...route]);
        const refresh = () => {
          if (dead) return;
          try {
            m.invalidateSize({ animate: false });
            m.fitBounds(bounds, { padding: [72, 72], maxZoom: 14 });
          } catch {
            /* mapa já removido */
          }
        };
        m.fitBounds(bounds, { padding: [72, 72], maxZoom: 14 });
        requestAnimationFrame(refresh);
        window.setTimeout(refresh, 120);
        window.setTimeout(refresh, 400);
      })
      .catch((err) => {
        console.error("[delivery-map]", err);
        try {
          map?.remove();
        } catch {
          /* ignore */
        }
        map = null;
        if (!dead) setStaticMap(true);
      });

    return () => {
      dead = true;
      try {
        map?.remove();
      } catch {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from.lat, from.lng, to.lat, to.lng, from.label, to.label]);

  return (
    <div className="delivery-preview map-only-fallback">
      <section className="card map-card">
        <div ref={hostRef} id="map" className="map-only-host" hidden={staticMap} />
        {staticMap ? <StaticRouteMap from={from} to={to} /> : null}
        <div className="map-ui">
          <div className="eta">
            <span>
              {loadFailed
                ? "Mapa ativo · o 3D não carregou desta vez"
                : "Mapa ativo · o 3D deste aparelho não abriu"}
            </span>
            <div className="bar">
              <i style={{ width: "100%" }} />
            </div>
            <button type="button" className="map-retry" onClick={() => window.location.reload()}>
              Tentar abrir o 3D de novo
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
