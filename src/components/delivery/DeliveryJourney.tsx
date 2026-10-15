import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LetterDocument } from "@/components/letters/LetterDocument";
import { shareUrl, shownFromName, type Letter } from "@/lib/letters";
import { journeySnapshot, letterEndpoints, letterOverlay } from "./journey";
import "./delivery.css";

type Props = {
  letter: Letter;
  allowDownload?: boolean;
  onDelivered?: () => void;
  onOpened?: () => void;
};

export type DeliveryJourneyHandle = {
  openRead: () => void;
};

type DeliveryHost = HTMLDivElement & { __openRead?: () => void };

export const DeliveryJourney = forwardRef<DeliveryJourneyHandle, Props>(function DeliveryJourney(
  { letter, allowDownload = false, onDelivered, onOpened },
  ref,
) {
  const slotRef = useRef<HTMLDivElement>(null);
  const letterRef = useRef(letter);
  const deliveredRef = useRef(onDelivered);
  const openedRef = useRef(onOpened);
  const openReadRef = useRef<() => void>(() => {});
  const pendingOpen = useRef(false);
  letterRef.current = letter;
  deliveredRef.current = onDelivered;
  openedRef.current = onOpened;
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [pagesEl, setPagesEl] = useState<HTMLElement | null>(null);
  const ends = letterEndpoints(letter);
  const mountKey = [
    letter.id,
    letter.messengerId,
    ends.from.lat,
    ends.from.lng,
    ends.to.lat,
    ends.to.lng,
  ].join("|");

  useImperativeHandle(ref, () => ({
    openRead() {
      if (openReadRef.current) openReadRef.current();
      else pendingOpen.current = true;
    },
  }));

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    const host = document.createElement("div") as DeliveryHost;
    host.className = "delivery-preview";
    slot.appendChild(host);
    let dead = false;
    let dispose = () => {};
    setReady(false);
    setError("");
    setPagesEl(null);

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
          onOpened: () => openedRef.current?.(),
        });
      })
      .then((cleanup) => {
        if (typeof cleanup !== "function") return;
        if (dead) {
          cleanup();
          return;
        }
        dispose = cleanup;
        openReadRef.current = () => host.__openRead?.();
        const pages = host.querySelector("#letterPages");
        if (pages instanceof HTMLElement) setPagesEl(pages);
        if (pendingOpen.current) {
          pendingOpen.current = false;
          host.__openRead?.();
        }
        setReady(true);
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
      openReadRef.current = () => {};
      setPagesEl(null);
    };
  }, [mountKey]);

  const overlay = letterOverlay(letter);

  return (
    <div ref={slotRef} className="delivery-slot" aria-label="Viagem do mensageiro">
      {!ready && !error ? <p className="delivery-loading">Preparando o mensageiro…</p> : null}
      {error ? <p className="delivery-error">{error}</p> : null}
      {pagesEl
        ? createPortal(
            <LetterDocument
              designId={letter.designId ?? "classico"}
              fromName={shownFromName(letter, "public")}
              toName={letter.toName}
              body={letter.body}
              pages={letter.pages}
              kind={letter.kind}
              drawingDataUrl={letter.drawingDataUrl}
              date={overlay.date}
              allowDownload={allowDownload}
              shareHref={shareUrl(letter.id)}
              shareText="Uma carta está a caminho. Acompanhe:"
            />,
            pagesEl,
          )
        : null}
    </div>
  );
});
