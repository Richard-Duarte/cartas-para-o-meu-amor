"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker, Polyline, TileLayer } from "leaflet";
import {
  FLIES,
  formatEta,
  getCity,
  getMessenger,
  messengerGif,
  messengerArrivalGif,
  type Geo,
} from "@/lib/messengers";
import { letterProgress, type Letter } from "@/lib/letters";
import { addressLine } from "@/lib/address";
import { cn } from "@/lib/utils";
import "leaflet/dist/leaflet.css";

type MapLook = "gray" | "map" | "real";

const LOOKS: { id: MapLook; label: string; swatch: string }[] = [
  { id: "gray", label: "Cinza", swatch: "bg-muted" },
  { id: "map", label: "Mapa", swatch: "bg-turtle" },
  { id: "real", label: "Real", swatch: "bg-horse" },
];

const TILES: Record<MapLook, { url: string; attribution: string; subdomains?: string }> = {
  gray: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap &copy; CARTO",
    subdomains: "abcd",
  },
  map: {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap &copy; CARTO",
    subdomains: "abcd",
  },
  real: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
  },
};

const LOOK_KEY = "cartas-para-o-meu-amor:map-look";

type Props = {
  letter: Letter;
  onArrived?: () => void;
};

export function JourneyMap({ letter, onArrived }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [celebrated, setCelebrated] = useState(false);
  const [look, setLook] = useState<MapLook>("gray");

  useEffect(() => {
    const saved = window.localStorage.getItem(LOOK_KEY);
    if (saved === "gray" || saved === "map" || saved === "real") setLook(saved);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  function chooseLook(next: MapLook) {
    setLook(next);
    window.localStorage.setItem(LOOK_KEY, next);
  }

  const stats = useMemo(() => letterProgress(letter, now), [letter, now]);
  const m = getMessenger(letter.messengerId);
  const fromCity = getCity(letter.fromCityId);
  const toCity = getCity(letter.toCityId);
  const from = { ...fromCity, geo: letter.fromGeo ?? fromCity.geo };
  const to = { ...toCity, geo: letter.toGeo ?? toCity.geo };
  const arrived = stats.arrived;
  const flying = FLIES[letter.messengerId];
  const current = positionOnRoute(from.geo, to.geo, stats.progress, flying);
  const faceRight = facingRight(from.geo, to.geo, stats.progress, flying);
  const fromLabel = letter.fromAddress?.street ? addressLine(letter.fromAddress) : letter.fromName;
  const toLabel = letter.toAddress?.street ? addressLine(letter.toAddress) : letter.toName;

  useEffect(() => {
    if (arrived && !celebrated) {
      setCelebrated(true);
      onArrived?.();
    }
  }, [arrived, celebrated, onArrived]);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-cream">
      <div className="relative">
        <StreetMap
          from={from}
          to={to}
          fromLabel={fromLabel}
          toLabel={toLabel}
          current={current}
          progress={stats.progress}
          gif={
            arrived
              ? messengerArrivalGif(letter.messengerId)
              : messengerGif(letter.messengerId)
          }
          name={m.name}
          flying={flying}
          arrived={arrived}
          faceRight={faceRight}
          look={look}
          pane="overview"
          className="h-64 md:h-80"
        />
        <div className="map-look-switch" role="radiogroup" aria-label="Estilo do mapa">
          {LOOKS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={look === item.id}
              aria-label={item.label}
              title={item.label}
              onClick={() => chooseLook(item.id)}
              className="grid size-11 place-items-center"
            >
              <span
                className={cn(
                  "size-3 rounded-full transition",
                  item.swatch,
                  look === item.id ? "ring-2 ring-rose ring-offset-2 ring-offset-paper" : "opacity-70",
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-[220px_1fr]">
        <div className="relative overflow-hidden rounded-xl border border-line">
          <p className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-paper/90 px-2.5 py-1 text-xs uppercase tracking-widest text-muted">
            Zoom
          </p>
          <StreetMap
            from={from}
            to={to}
            fromLabel={letter.fromName}
            toLabel={letter.toName}
            current={current}
            progress={stats.progress}
            gif={
            arrived
              ? messengerArrivalGif(letter.messengerId)
              : messengerGif(letter.messengerId)
          }
            name={m.name}
            flying={flying}
            arrived={arrived}
            faceRight={faceRight}
            look={look}
            pane="follow"
            className="h-52"
          />
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-xs uppercase tracking-widest text-rose">
            {arrived ? "Chegou" : "Em trânsito"}
          </p>
          <h2 className="mt-1 font-display text-3xl">{m.name}</h2>
          <p className="mt-2 text-sm text-muted">{m.flavor}</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink/10">
            <div
              className="h-full rounded-full bg-rose transition-[width] duration-500"
              style={{ width: `${Math.round(stats.progress * 100)}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs uppercase tracking-widest text-muted tabular-nums">
            <span>{stats.km.toFixed(0)} km</span>
            <span>
              {arrived ? "no destino" : `preview ${Math.ceil(stats.remainingDemoMs / 1000)}s`}
            </span>
            <span>real {formatEta(stats.hours)}</span>
          </div>
          {arrived && (
            <p className="mt-4 rounded-xl bg-paper px-4 py-3 text-sm">{m.arrivalCopy}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function positionOnRoute(from: Geo, to: Geo, t: number, flying: boolean): Geo {
  const arc = flying ? 0.45 : 0.06;
  return {
    lat: lerp(from.lat, to.lat, t) + Math.sin(Math.PI * t) * arc,
    lng: lerp(from.lng, to.lng, t),
  };
}

function facingRight(from: Geo, to: Geo, t: number, flying: boolean) {
  const a = positionOnRoute(from, to, Math.max(0, t - 0.02), flying);
  const b = positionOnRoute(from, to, Math.min(1, t + 0.02), flying);
  if (b.lng === a.lng) return to.lng >= from.lng;
  return b.lng > a.lng;
}

function routeLatLngs(from: Geo, to: Geo, flying: boolean, steps = 40): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const p = positionOnRoute(from, to, i / steps, flying);
    pts.push([p.lat, p.lng]);
  }
  return pts;
}

type City = { name: string; geo: Geo };

function StreetMap({
  from,
  to,
  fromLabel,
  toLabel,
  current,
  progress,
  gif,
  name,
  flying,
  arrived,
  faceRight,
  look,
  pane,
  className,
}: {
  from: City;
  to: City;
  fromLabel: string;
  toLabel: string;
  current: Geo;
  progress: number;
  gif: string;
  name: string;
  flying: boolean;
  arrived: boolean;
  faceRight: boolean;
  look: MapLook;
  pane: "overview" | "follow";
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const traveledRef = useRef<Polyline | null>(null);
  const tilesRef = useRef<Partial<Record<MapLook, TileLayer>>>({});
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const lookRef = useRef(look);
  lookRef.current = look;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cancelled = false;

    void import("leaflet").then((mod) => {
      if (cancelled || !host.current || mapRef.current) return;
      const L =
        (mod as { default?: typeof import("leaflet") }).default ??
        (mod as typeof import("leaflet"));
      leafletRef.current = L;

      const map = L.map(host.current, {
        zoomControl: pane === "overview",
        attributionControl: pane === "overview",
        scrollWheelZoom: pane === "overview",
        dragging: pane === "overview",
        doubleClickZoom: pane === "overview",
        boxZoom: false,
        zoomAnimation: false,
        markerZoomAnimation: false,
        fadeAnimation: true,
        inertia: false,
      });

      applyLook(map, L, lookRef.current, tilesRef);

      const full = routeLatLngs(from.geo, to.geo, flying);
      L.polyline(full, {
        color: "#1a1410",
        weight: 2,
        opacity: 0.18,
        dashArray: "6 8",
      }).addTo(map);

      const traveled = L.polyline([full[0]], {
        color: "#e85a7a",
        weight: 4,
        opacity: 0.95,
      }).addTo(map);
      traveledRef.current = traveled;

      if (pane === "overview") {
        const pin = (label: string) =>
          L.divIcon({
            className: "person-pin-wrap",
            html: `<span class="person-pin">${escapeHtml(label)}</span>`,
            iconSize: [0, 0],
            iconAnchor: [0, 18],
          });
        L.marker([from.geo.lat, from.geo.lng], { icon: pin(fromLabel), interactive: false }).addTo(
          map,
        );
        L.marker([to.geo.lat, to.geo.lng], { icon: pin(toLabel), interactive: false }).addTo(map);
        map.fitBounds(L.latLngBounds(full), { padding: [36, 36] });
      } else {
        map.setView([current.lat, current.lng], arrived ? 13 : FOLLOW_ZOOM);
      }

      const size = pane === "follow" ? 116 : 88;
      const marker = L.marker([current.lat, current.lng], {
        icon: gifIcon(L, gif, name, size, arrived, faceRight),
        interactive: false,
        zIndexOffset: 600,
      }).addTo(map);
      markerRef.current = marker;
      mapRef.current = map;
      map.invalidateSize();
      const hostEl = host.current;
      const ro = new ResizeObserver(() => {
        map.invalidateSize({ animate: false });
      });
      if (hostEl) ro.observe(hostEl);
      window.setTimeout(() => map.invalidateSize({ animate: false }), 250);
      (map as LeafletMap & { _cartasRo?: ResizeObserver })._cartasRo = ro;
    });

    return () => {
      cancelled = true;
      const map = mapRef.current as (LeafletMap & { _cartasRo?: ResizeObserver }) | null;
      map?._cartasRo?.disconnect();
      map?.remove();
      mapRef.current = null;
      markerRef.current = null;
      traveledRef.current = null;
      tilesRef.current = {};
    };
    // Mount once per letter/pane
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from.geo.lat, from.geo.lng, to.geo.lat, to.geo.lng, pane, flying, fromLabel, toLabel]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;
    applyLook(map, L, look, tilesRef);
    map.invalidateSize({ animate: false });
  }, [look]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    marker.setLatLng([current.lat, current.lng]);
    const full = routeLatLngs(from.geo, to.geo, flying);
    const n = Math.max(2, Math.round(full.length * progress));
    traveledRef.current?.setLatLngs(full.slice(0, n));
    applyClip(marker, gif, arrived, faceRight);

    if (pane === "follow") {
      followCamera(map, current, arrived);
    }
  }, [current.lat, current.lng, progress, pane, arrived, from.geo, to.geo, flying, faceRight, gif]);

  return (
    <div className={cn("street-map relative w-full", `map-look-${look}`, className)}>
      <div ref={host} className="h-full w-full" />
    </div>
  );
}

const LOOK_IDS: MapLook[] = ["gray", "map", "real"];
const FOLLOW_ZOOM = 11;

function followCamera(map: LeafletMap, current: Geo, arrived: boolean) {
  const want = arrived ? 13 : FOLLOW_ZOOM;
  if (Math.abs(map.getZoom() - want) > 0.2) {
    map.setView([current.lat, current.lng], want, { animate: false });
    return;
  }
  map.panTo([current.lat, current.lng], { animate: false, noMoveStart: true });
}


function applyLook(
  map: LeafletMap,
  L: typeof import("leaflet"),
  look: MapLook,
  tilesRef: { current: Partial<Record<MapLook, TileLayer>> },
) {
  let next = tilesRef.current[look];
  if (!next) {
    const spec = TILES[look];
    next = L.tileLayer(spec.url, {
      attribution: spec.attribution,
      subdomains: spec.subdomains ?? "abc",
      maxZoom: 20,
    });
    tilesRef.current[look] = next;
  }
  if (!map.hasLayer(next)) next.addTo(map);
  next.redraw();

  for (const id of LOOK_IDS) {
    if (id === look) continue;
    const layer = tilesRef.current[id];
    if (layer && map.hasLayer(layer)) map.removeLayer(layer);
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function applyClip(
  marker: LeafletMarker,
  src: string,
  arrived: boolean,
  faceRight: boolean,
) {
  const root = marker.getElement();
  if (!root) return;
  const faceEl = root.querySelector(".messenger-face");
  const img = root.querySelector(".messenger-gif");
  const bubble = root.querySelector(".messenger-bubble");
  if (img instanceof HTMLImageElement && img.getAttribute("src") !== src) {
    img.src = src;
  }
  bubble?.classList.toggle("is-arrived", arrived);
  if (faceEl) {
    faceEl.classList.toggle("face-right", faceRight);
    faceEl.classList.toggle("face-left", !faceRight);
  }
}

function gifIcon(
  L: typeof import("leaflet"),
  gif: string,
  name: string,
  size: number,
  arrived: boolean,
  faceRight: boolean,
) {
  const face = faceRight ? "face-right" : "face-left";
  return L.divIcon({
    className: "messenger-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div class="messenger-bubble${arrived ? " is-arrived" : ""}"><span class="messenger-fit"><span class="messenger-face ${face}"><img src="${gif}" alt="${name}" class="messenger-gif" /></span></span></div>`,
  });
}
