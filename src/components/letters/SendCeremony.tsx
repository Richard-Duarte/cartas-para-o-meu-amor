"use client";

import { Link } from "@tanstack/react-router";
import { useEffect, useState, type CSSProperties } from "react";
import { LetterSheet } from "@/components/letters/LetterSheet";
import { shareUrl, type Letter } from "@/lib/letters";
import { pagesPlainText } from "@/lib/pages";
import { cn } from "@/lib/utils";

type Phase = "open" | "slide" | "closed";

type Props = {
  letter: Letter;
};

export function SendCeremony({ letter }: Props) {
  const [phase, setPhase] = useState<Phase>("open");
  const [modal, setModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tilt, setTilt] = useState({ x: 2, y: 0 });
  const url = shareUrl(letter.id);
  const wa = `https://wa.me/?text=${encodeURIComponent(`Uma carta está a caminho. Abra o envelope: ${url}`)}`;
  const pages = letter.pages?.[0] ? [letter.pages[0]] : letter.pages;

  function send() {
    if (phase !== "open") return;
    setPhase("slide");
    window.setTimeout(() => setPhase("closed"), 980);
    window.setTimeout(() => setModal(true), 1900);
  }

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const onMove = (e: PointerEvent) => {
      if (!fine || phase !== "open") return;
      const nx = (e.clientX / window.innerWidth - 0.5) * 16;
      const ny = (e.clientY / window.innerHeight - 0.5) * 10;
      setTilt({ x: 2 - ny * 0.35, y: nx });
    };
    const onOrient = (e: DeviceOrientationEvent) => {
      if (phase !== "open") return;
      const g = e.gamma ?? 0;
      const b = (e.beta ?? 40) - 40;
      setTilt({
        y: Math.max(-14, Math.min(14, g / 4.5)),
        x: 2 + Math.max(-10, Math.min(10, b / 7)),
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("deviceorientation", onOrient);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("deviceorientation", onOrient);
    };
  }, [phase]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Carta para o meu amor",
          text: "Uma carta está a caminho.",
          url,
        });
      } catch {
        /* cancelled */
      }
    }
  }

  return (
    <div className="send-ceremony">
      <p className="section-kicker">Pronto para voar</p>
      <h1>A carta espera no envelope.</h1>
      <p>Ela já está escrita. Envie: o papel desliza, a aba fecha e o lacre sela.</p>

      <div className={cn("ef-scale", `is-${phase}`)}>
        <div
          className={cn("ef", `is-${phase}`)}
          style={
            {
              "--tilt-x": `${tilt.x}deg`,
              "--tilt-y": `${tilt.y}deg`,
            } as CSSProperties
          }
        >
          <img src="/envelope/lid.png" alt="" className="ef-lid-open" />
          <img src="/envelope/back.png" alt="" className="ef-back" />
          <div className="ef-letter">
            <LetterSheet
              designId={letter.designId ?? "classico"}
              fromName={letter.fromName}
              toName={letter.toName}
              body={letter.body || pagesPlainText(letter.pages ?? [])}
              pages={pages}
            />
          </div>
          <img src="/envelope/front.png" alt="" className="ef-front" />
          <img src="/envelope/lid.png" alt="" className="ef-lid-closed" />
          {phase === "closed" ? <img src="/envelope/seal.png" alt="" className="ef-seal" /> : null}
        </div>
      </div>

      {phase === "open" ? (
        <button type="button" className="send-go" onClick={send}>
          Enviar carta
        </button>
      ) : null}

      {modal ? (
        <div className="send-modal" role="dialog" aria-labelledby="send-title">
          <div className="send-modal-card">
            <p className="section-kicker">A caminho</p>
            <h2 id="send-title">O envelope fechou. O link é o correio.</h2>
            <p>Quem abrir entra na conta e a carta fica na caixa de recebidos.</p>
            {letter.anonymous ? (
              <p>
                {letter.linkSent
                  ? "O link foi para o WhatsApp de quem recebe, sem o seu nome."
                  : "A carta ficou salva. O WhatsApp não saiu agora."}
              </p>
            ) : null}
            {letter.notice === "instant" ? <p>A viagem é curta: não enviamos aviso de chegada.</p> : null}
            {letter.notice === "queued" ? (
              <p>Quando estiver perto, avisamos você e quem recebe por e-mail e por WhatsApp.</p>
            ) : null}
            {letter.notice === "sent" ? <p>O aviso de que está chegando já foi para os dois.</p> : null}
            {letter.notice === "unconfigured" ? (
              <p>O aviso de chegada espera o e-mail e o WhatsApp estarem ligados.</p>
            ) : null}
            <code className="send-link">{url}</code>
            <div className="share-bar">
              <button type="button" onClick={() => void copy()}>
                {copied ? "Link copiado" : "Copiar link"}
              </button>
              <a href={wa} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
              {typeof navigator !== "undefined" && "share" in navigator ? (
                <button type="button" onClick={() => void nativeShare()}>
                  Compartilhar
                </button>
              ) : null}
            </div>
            <Link to="/acompanhar/$letterId" params={{ letterId: letter.id }} className="send-track">
              Acompanhar no mapa
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
