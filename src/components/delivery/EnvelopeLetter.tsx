import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { LetterDocument } from "@/components/letters/LetterDocument";
import { getDesign, type DesignId } from "@/lib/designs";
import type { LetterPage } from "@/lib/pages";
import "./delivery.css";

type Props = {
  mode: "read" | "close";
  designId: DesignId;
  fromName: string;
  toName: string;
  body: string;
  pages?: LetterPage[];
  drawingDataUrl?: string;
  kind?: "text" | "drawing";
  date?: string;
  allowDownload?: boolean;
  shareHref?: string;
  shareText?: string;
  onClosed?: () => void;
};

type EnvelopeHost = HTMLDivElement & { __envelope?: { dispose: () => void } };

export function EnvelopeLetter(props: Props) {
  const slotRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const [pagesEl, setPagesEl] = useState<HTMLElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    const host = document.createElement("div") as EnvelopeHost;
    host.className = "envelope-slot-host";
    slot.appendChild(host);
    let dead = false;
    let dispose = () => {};
    setFailed(false);
    setPagesEl(null);

    void import("./mountEnvelope.js")
      .then(({ mountEnvelope }) => {
        if (dead) return;
        const design = getDesign(propsRef.current.designId);
        const api = mountEnvelope(host, {
          intro: propsRef.current.mode === "close" ? "open-then-close" : "closed",
          title: propsRef.current.mode === "close" ? "O envelope fecha" : "A carta",
          hint: propsRef.current.mode === "close" ? "Toque no selo para ler de novo" : "Toque no selo para abrir",
          designSrc: design.src,
          getGreeting: () => {
            const name = propsRef.current.toName?.trim().replace(/,$/, "") || "Meu amor";
            return `${name},`;
          },
          onClosed: () => propsRef.current.onClosed?.(),
        });
        dispose = () => api.dispose();
        if (host.dataset.envelopeFailed) {
          host.hidden = true;
          setFailed(true);
          return;
        }
        const pages = host.querySelector("#letterPages");
        if (pages instanceof HTMLElement) setPagesEl(pages);
        else setFailed(true);
      })
      .catch(() => {
        if (dead) return;
        setFailed(true);
        propsRef.current.onClosed?.();
      });

    return () => {
      dead = true;
      dispose();
      host.remove();
      setPagesEl(null);
    };
  }, [props.mode, props.designId]);

  const sheet = (
    <LetterDocument
      designId={props.designId}
      fromName={props.fromName}
      toName={props.toName}
      body={props.body}
      pages={props.pages}
      drawingDataUrl={props.drawingDataUrl}
      kind={props.kind}
      date={props.date}
      allowDownload={props.allowDownload}
      shareHref={props.shareHref}
      shareText={props.shareText}
    />
  );

  let fallback: ReactNode = null;
  if (failed) {
    fallback = (
      <div className="envelope-fallback">
        <p>O envelope não abriu neste aparelho. A carta está aqui.</p>
        {sheet}
      </div>
    );
  }

  return (
    <div className="envelope-slot">
      <div ref={slotRef} />
      {!pagesEl && !failed ? <p className="delivery-loading">Preparando o envelope…</p> : null}
      {pagesEl ? createPortal(sheet, pagesEl) : null}
      {fallback}
    </div>
  );
}
