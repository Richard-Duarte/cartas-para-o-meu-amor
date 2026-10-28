import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LetterDocument, ReplyButton } from "@/components/letters/LetterDocument";
import { letterSheetPainter, paintEnvelopeNames } from "@/lib/letter-raster";
import { shareUrl, shownFromName, type Letter } from "@/lib/letters";
import { reloadOnceForStaleChunks } from "@/lib/chunk-reload";
import { getDesign } from "@/lib/designs";
import { messengerModelId } from "@/lib/messengers";
import { journeyScene, journeySnapshot, letterEndpoints, letterOverlay } from "./journey";
import { MapOnlyFallback } from "./MapOnlyFallback";
import "./delivery.css";

function loseHostWebgl(host: HTMLElement) {
  host.querySelectorAll("canvas").forEach((canvas) => {
    for (const type of ["webgl2", "webgl", "experimental-webgl"] as const) {
      try {
        const gl = canvas.getContext(type) as WebGLRenderingContext | null;
        gl?.getExtension("WEBGL_lose_context")?.loseContext();
      } catch {
        /* ignore */
      }
    }
  });
}

type Props = {
  letter: Letter;
  allowDownload?: boolean;
  onDelivered?: () => void;
  onOpened?: () => void;
  /** Primeira abertura de quem recebe (carta já entregue): toca a chegada completa. */
  firstArrival?: boolean;
  /** Link "Enviar resposta" mostrado na carta aberta (só para quem recebeu). */
  replyHref?: string;
};

export type DeliveryJourneyHandle = {
  openRead: () => void;
};

type DeliveryHost = HTMLDivElement & { __openRead?: () => void };

function geoKey(n: number) {
  return Number.isFinite(n) ? n.toFixed(5) : "x";
}


/**
 * O cartão de progresso (e "Simular chegada") fica dentro do mapa, mas quando o mapa passa por baixo
 * do menu ele desce para ficar logo abaixo do menu (altura real medida, segue o menu quando ele
 * esconde/aparece). Nunca sai do mapa e nunca fica por cima do menu.
 */
function useStickyMapUi(slot: React.RefObject<HTMLDivElement | null>, deps: unknown[]) {
  useEffect(() => {
    const root = slot.current;
    if (!root || typeof window === "undefined") return;
    let raf = 0;
    let onScreen = true;
    let last = -1;
    const probe = document.createElement("div");
    probe.style.cssText = "position:fixed;top:0;left:0;height:env(safe-area-inset-top,0px);width:0;visibility:hidden;pointer-events:none";
    document.body.appendChild(probe);
    const tick = () => {
      raf = 0;
      const card = root.querySelector<HTMLElement>(".map-card");
      const ui = card?.querySelector<HTMLElement>(".map-ui");
      if (card && ui) {
        const header = document.querySelector<HTMLElement>(".site-header");
        let top = probe.offsetHeight;
        if (header) {
          const r = header.getBoundingClientRect();
          const cs = getComputedStyle(header);
          if (cs.visibility !== "hidden" && Number(cs.opacity) > 0.05 && r.height > 0) top = Math.max(top, r.bottom);
        }
        const c = card.getBoundingClientRect();
        const gap = 8;
        const baseTop = ui.offsetTop; // 10px do topo do mapa
        const room = Math.max(0, c.height - baseTop - ui.offsetHeight - 28); // não cobre a atribuição
        const dy = Math.round(Math.min(room, Math.max(0, top + gap - (c.top + baseTop))));
        if (dy !== last) {
          last = dy;
          card.style.setProperty("--map-ui-dy", `${dy}px`);
        }
      }
      if (onScreen) raf = requestAnimationFrame(tick);
    };
    const io =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver((es) => {
            onScreen = es.some((e) => e.isIntersecting);
            if (onScreen && !raf) raf = requestAnimationFrame(tick);
          })
        : null;
    const watch = () => {
      const card = root.querySelector(".map-card");
      if (card && io) io.observe(card);
    };
    watch();
    const mo = new MutationObserver(watch);
    mo.observe(root, { childList: true, subtree: true });
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
      mo.disconnect();
      probe.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export const DeliveryJourney = forwardRef<DeliveryJourneyHandle, Props>(function DeliveryJourney(
  { letter, allowDownload = false, onDelivered, onOpened, replyHref, firstArrival = false },
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
  const [mapOnly, setMapOnly] = useState(false);
  const fallbackRef = useRef<HTMLDivElement>(null);
  useStickyMapUi(slotRef, [ready, mapOnly]);
  useStickyMapUi(fallbackRef, [mapOnly]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [pagesEl, setPagesEl] = useState<HTMLElement | null>(null);
  const [overlayEl, setOverlayEl] = useState<HTMLElement | null>(null);
  const ends = letterEndpoints(letter);
  const animalId = messengerModelId(letter.messengerId);
  const mountKey = [
    letter.id,
    animalId,
    geoKey(ends.from.lat),
    geoKey(ends.from.lng),
    geoKey(ends.to.lat),
    geoKey(ends.to.lng),
    ends.from.label,
    ends.to.label,
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
    setMapOnly(false);
    setLoadFailed(false);
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
      // O import do engine (three + leaflet) falha quando o arquivo some (deploy novo com a aba
      // aberta) ou a rede cai. O navegador guarda essa falha até recarregar, então tentar de novo
      // aqui não adianta: recarrega uma vez; se já recarregou, mostra o mapa sem 3D.
      let mountDeliveryPreview: (typeof import("./engine.js"))["mountDeliveryPreview"] | undefined;
      try {
        ({ mountDeliveryPreview } = await import("./engine.js"));
      } catch (err) {
        mountDeliveryPreview = undefined;
        console.error("[delivery-load]", err);
      }
      if (dead) return;
      if (typeof mountDeliveryPreview !== "function") {
        if (reloadOnceForStaleChunks()) return;
        setLoadFailed(true);
        setMapOnly(true);
        setError("");
        setReady(true);
        return;
      }
      try {
        const place = letterEndpoints(letterRef.current);
        const design = getDesign(letterRef.current.designId);
        const cleanup = await mountDeliveryPreview(host, {
          animalId: messengerModelId(letterRef.current.messengerId),
          from: place.from,
          to: place.to,
          scene: journeyScene(letterRef.current),
          designSrc: design.src,
          paintSheet: letterSheetPainter(letterRef.current.designId ?? "classico", letterRef.current.pages?.[0]),
          paintNames: (c: HTMLCanvasElement) =>
            paintEnvelopeNames(
              c,
              letterRef.current.toName?.trim() || "Meu amor",
              shownFromName(letterRef.current, "public")?.trim() || "",
            ),
          getJourney: () => journeySnapshot(letterRef.current),
          getLetter: () => letterOverlay(letterRef.current),
          onDelivered: () => deliveredRef.current?.(),
          onOpened: () => openedRef.current?.(),
          firstArrival,
          // iOS derrubou o WebGL (memória): sem tela de erro — mostra o mapa/cena estático.
          onContextLost: () => {
            if (dead) return;
            console.warn("[delivery] webgl context lost → mapa estático");
            try {
              dispose();
            } catch {
              /* ignore */
            }
            dispose = () => {};
            loseHostWebgl(host);
            host.replaceChildren();
            setMapOnly(true);
            setError("");
            setReady(true);
          },
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
        const overlay = host.querySelector("#letter");
        if (overlay instanceof HTMLElement) setOverlayEl(overlay);
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
        loseHostWebgl(host);
        host.replaceChildren();
        if (attempt < 2) {
          await new Promise((r) => window.setTimeout(r, 280 + attempt * 220));
          if (!dead) await boot(attempt + 1);
          return;
        }
        // Em vez da tela vermelha: mapa Leaflet com os pins do endereço.
        setMapOnly(true);
        setError("");
        setReady(true);
      }
    }

    void boot(0);

    return () => {
      dead = true;
      dispose();
      host.remove();
      openReadRef.current = () => {};
      setPagesEl(null);
      setOverlayEl(null);
    };
  }, [mountKey]);

  const overlay = letterOverlay(letter);

  if (mapOnly) {
    return (
      <div ref={fallbackRef} className="delivery-slot" aria-label="Viagem do mensageiro">
        <MapOnlyFallback letter={letter} loadFailed={loadFailed} />
      </div>
    );
  }

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
      {/* Tela cheia da carta: botão fixo embaixo (só para quem recebeu). Sai da tela cheia e abre a resposta. */}
      {replyHref && overlayEl
        ? createPortal(
            <ReplyButton
              dock
              href={replyHref}
              onClick={(e) => {
                e.preventDefault();
                overlayEl.querySelector<HTMLButtonElement>("#close")?.click();
                window.setTimeout(() => window.location.assign(replyHref), 260);
              }}
            />,
            overlayEl,
          )
        : null}
    </div>
  );
});
