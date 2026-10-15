import { useEffect, useRef, useState } from "react";
import type { Letter } from "@/lib/letters";
import { journeySnapshot, letterEndpoints, letterOverlay } from "./journey";
import "./delivery.css";

type Props = {
  letter: Letter;
  onDelivered?: () => void;
};

export function DeliveryJourney({ letter, onDelivered }: Props) {
  const slotRef = useRef<HTMLDivElement>(null);
  const letterRef = useRef(letter);
  const deliveredRef = useRef(onDelivered);
  letterRef.current = letter;
  deliveredRef.current = onDelivered;
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const ends = letterEndpoints(letter);
  const mountKey = [
    letter.id,
    letter.messengerId,
    ends.from.lat,
    ends.from.lng,
    ends.to.lat,
    ends.to.lng,
  ].join("|");

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    const host = document.createElement("div");
    host.className = "delivery-preview";
    slot.appendChild(host);
    let dead = false;
    let dispose = () => {};
    setReady(false);
    setError("");

    void import("./engine.js")
      .then(({ mountDeliveryPreview }) => {
        if (dead) return undefined;
        const place = letterEndpoints(letterRef.current);
        return mountDeliveryPreview(host, {
          animalId: letterRef.current.messengerId,
          from: place.from,
          to: place.to,
          getJourney: () => journeySnapshot(letterRef.current),
          getLetter: () => letterOverlay(letterRef.current),
          onDelivered: () => deliveredRef.current?.(),
        });
      })
      .then((cleanup) => {
        if (typeof cleanup !== "function") return;
        if (dead) cleanup();
        else {
          dispose = cleanup;
          setReady(true);
        }
      })
      .catch(() => {
        if (dead) return;
        host.replaceChildren();
        setError("Não deu para abrir o mensageiro neste aparelho.");
      });

    return () => {
      dead = true;
      dispose();
      host.remove();
    };
  }, [mountKey]);

  return (
    <div ref={slotRef} className="delivery-slot" aria-label="Viagem do mensageiro">
      {!ready && !error ? <p className="delivery-loading">Preparando o mensageiro…</p> : null}
      {error ? <p className="delivery-error">{error}</p> : null}
    </div>
  );
}
