import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LetterDocument } from "@/components/letters/LetterDocument";
import { shareUrl, shownFromName, type Letter } from "@/lib/letters";
import { messengerModelId } from "@/lib/messengers";
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

function geoKey(n: number) {
  return Number.isFinite(n) ? n.toFixed(5) : "x";
}

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
  const animalId = messengerModelId(letter.messengerId);
  const mountKey = [
    letter.id,
    animalId,
    geoKey(ends.from.lat),
    geoKey(ends.from.lng),
    geoKey(ends.to.lat),
    geoKey(ends.to.lng),
  ].join("|");

  useImperativeHandle(ref, () => ({
    openRead() {
      if (openReadRef.current) openReadRef.current();
      else pendingOpen.current = true;
    },
  }));

  useEffect(() => {
    const slotEl = slotRef.current;
    if (!slotEl) return;
    const slot: HTMLDivElement = slotEl;
    const host = document.createElement("div") as DeliveryHost;
    host.className = "delivery-preview";
    slot.appendChild(host);
    let dead = false;
    let dispose = () => {};
    setReady(false);
    setError("");
    setPagesEl(null);

    async function waitLayout() {
      for (let i = 0; i < 12; i++) {
        if (dead) return false;
        if (slot.clientWidth >= 80 && slot.clientHeight >= 80) return true;
        await new Promise((r) => requestAnimationFrame(() => r(undefined)));
      }
      return slot.clientWidth > 0;
    }

    async function boot(attempt: number) {
      const ok = await waitLayout();
      if (dead) return;
      if (!ok && attempt === 0) {
        await new Promise((r) => window.setTimeout(r, 80));
      }
      try {
        const { mountDeliveryPreview } = await import("./engine.js");
        if (dead) return;
        const place = letterEndpoints(letterRef.current);
        const cleanup = await mountDeliveryPreview(host, {
          animalId: messengerModelId(letterRef.current.messengerId),
          from: place.from,
          to: place.to,
          getJourney: () => journeySnapshot(letterRef.current),
          getLetter: () => letterOverlay(letterRef.current),
          onDelivered: () => deliveredRef.current?.(),
          onOpened: () => openedRef.current?.(),
        });
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
      } catch (err) {
        console.error("[delivery]", err);
        if (dead) return;
        try {
          dispose();
        } catch {
          /* ignore */
        }
        dispose = () => {};
        host.replaceChildren();
        if (attempt < 1) {
          await new Promise((r) => window.setTimeout(r, 200));
          if (!dead) await boot(attempt + 1);
          return;
        }
        setError("Não deu para abrir o mensageiro neste aparelho.");
      }
    }

    void boot(0);

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
