"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { formatCoords, reverseLookup, type Address } from "@/lib/address";

type Props = {
  /** Onde o mapa abre (endereço já encontrado ou o pino anterior). */
  start?: { lat: number; lng: number };
  onPick: (address: Address) => void;
  onCancel: () => void;
};

const WORLD = { lat: -14, lng: -50 };

/**
 * Mapa para marcar o destino com um pino: toque/clique move o pino, ou arraste-o.
 * Aceita qualquer ponto do planeta (inclusive no meio do oceano). Ao confirmar,
 * o endereço é preenchido por geocodificação reversa.
 */
export function PinPicker({ start, onPick, onCancel }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const [pos, setPos] = useState(start ?? null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let dead = false;
    void import("leaflet").then((mod) => {
      const L = (mod as { default?: typeof import("leaflet") }).default ?? (mod as typeof import("leaflet"));
      if (dead || !boxRef.current || mapRef.current) return;
      const center = start ?? WORLD;
      const map = L.map(boxRef.current, { worldCopyJump: true }).setView(
        [center.lat, center.lng],
        start ? 15 : 3,
      );
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, attribution: "Tiles © Esri" },
      ).addTo(map);
      const icon = L.divIcon({ className: "pin-picker-icon", html: "📍", iconSize: [32, 32], iconAnchor: [16, 30] });
      const place = (lat: number, lng: number) => {
        const p = { lat, lng: ((((lng + 180) % 360) + 360) % 360) - 180 };
        if (!markerRef.current) {
          markerRef.current = L.marker([lat, lng], { draggable: true, icon }).addTo(map);
          markerRef.current.on("dragend", () => {
            const ll = markerRef.current!.getLatLng();
            place(ll.lat, ll.lng);
          });
        } else markerRef.current.setLatLng([lat, lng]);
        setPos(p);
      };
      if (start) place(start.lat, start.lng);
      map.on("click", (e) => place(e.latlng.lat, e.latlng.lng));
      mapRef.current = map;
      window.setTimeout(() => map.invalidateSize(), 50);
    });
    return () => {
      dead = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirm() {
    if (!pos || busy) return;
    setBusy(true);
    try {
      onPick(await reverseLookup(pos.lat, pos.lng));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pin-picker" role="group" aria-label="Marcar no mapa">
      <p className="addr-hint">Toque no mapa para colocar o pino (ou arraste-o). Vale qualquer lugar, até o meio do oceano.</p>
      <div ref={boxRef} className="pin-picker-map" style={{ height: 280, borderRadius: 12, overflow: "hidden" }} />
      <p className="addr-status" aria-live="polite">
        {pos ? `Pino em ${formatCoords(pos.lat, pos.lng)}` : "Nenhum pino ainda"}
      </p>
      <div className="addr-fav">
        <button type="button" className="addr-fav-btn" onClick={onCancel}>
          Cancelar
        </button>
        <button type="button" className="addr-fav-btn is-save" disabled={!pos || busy} onClick={() => void confirm()}>
          {busy ? "Buscando endereço…" : "Usar este ponto"}
        </button>
      </div>
    </div>
  );
}
