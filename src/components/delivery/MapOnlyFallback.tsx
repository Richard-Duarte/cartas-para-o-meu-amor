"use client";

import { useEffect, useRef } from "react";
import type { Letter } from "@/lib/letters";
import { letterEndpoints } from "./journey";
import "leaflet/dist/leaflet.css";
import "./delivery.css";

type Props = {
  letter: Letter;
};

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

/** Mapa Leaflet sem WebGL — usado quando o mensageiro 3D falha no aparelho. */
export function MapOnlyFallback({ letter }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const ends = letterEndpoints(letter);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let dead = false;
    let map: { remove: () => void } | null = null;

    void import("leaflet").then((mod) => {
      if (dead || !host) return;
      const L = mod.default;
      const from: [number, number] = [ends.from.lat, ends.from.lng];
      const to: [number, number] = [ends.to.lat, ends.to.lng];
      let routeTo = to;
      if (Math.hypot(from[0] - to[0], from[1] - to[1]) < 0.01) {
        routeTo = [to[0] + 0.02, to[1] + 0.02];
      }
      const span = Math.hypot(routeTo[0] - from[0], routeTo[1] - from[1]) || 1;
      const bow = Math.max(span * 0.18, 0.08);
      const ctrl: [number, number] = [
        (from[0] + routeTo[0]) / 2 + (-(routeTo[1] - from[1]) / span) * bow,
        (from[1] + routeTo[1]) / 2 + ((routeTo[0] - from[0]) / span) * bow,
      ];
      const bez = (t: number): [number, number] => [
        (1 - t) ** 2 * from[0] + 2 * (1 - t) * t * ctrl[0] + t * t * routeTo[0],
        (1 - t) ** 2 * from[1] + 2 * (1 - t) * t * ctrl[1] + t * t * routeTo[1],
      ];
      const route = Array.from({ length: 80 }, (_, i) => bez(i / 79));
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
      pin(from, ends.from.label);
      pin(to, ends.to.label);
      const bounds = L.latLngBounds([from, to, ...route]);
      const refresh = () => {
        m.invalidateSize({ animate: false });
        m.fitBounds(bounds, { padding: [72, 72], maxZoom: 14 });
      };
      m.fitBounds(bounds, { padding: [72, 72], maxZoom: 14 });
      requestAnimationFrame(refresh);
      window.setTimeout(refresh, 120);
      window.setTimeout(refresh, 400);
    });

    return () => {
      dead = true;
      map?.remove();
    };
  }, [ends.from.lat, ends.from.lng, ends.to.lat, ends.to.lng, ends.from.label, ends.to.label]);

  return (
    <div className="delivery-preview map-only-fallback">
      <section className="card map-card">
        <div ref={hostRef} id="map" className="map-only-host" />
        <div className="map-ui">
          <div className="eta">
            <span>Mapa ativo · o 3D deste aparelho não abriu</span>
            <div className="bar">
              <i style={{ width: "100%" }} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
