"use client";

import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { EnvelopeLetter } from "@/components/delivery/EnvelopeLetter";
import { letterOverlay } from "@/components/delivery/journey";
import { shareUrl, shownFromName, type Letter } from "@/lib/letters";
import { pagesPlainText } from "@/lib/pages";

type Props = {
  letter: Letter;
  /** Bloco extra no fim do cartão (ex.: lembrete do cupom AMOR). */
  extra?: ReactNode;
};

export function SendCeremony({ letter, extra }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = shareUrl(letter.id);
  const wa = `https://wa.me/?text=${encodeURIComponent(`Uma carta está a caminho. Abra o envelope: ${url}`)}`;
  const overlay = letterOverlay(letter);

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
      <EnvelopeLetter
        mode="close"
        designId={letter.designId ?? "classico"}
        fromName={shownFromName(letter, "public")}
        toName={letter.toName}
        body={letter.body || pagesPlainText(letter.pages ?? [])}
        pages={letter.pages}
        kind={letter.kind}
        drawingDataUrl={letter.drawingDataUrl}
        date={overlay.date}
        shareHref={url}
        shareText="Uma carta está a caminho. Abra o envelope:"
        onClosed={() => setRevealed(true)}
      />

      <div className={revealed ? "send-copy is-in" : "send-copy"}>
        <p className="section-kicker">A caminho</p>
        <h1 id="send-title">O envelope fechou. O link é o correio.</h1>
        <p>Quem abrir entra na conta e a carta fica na caixa de recebidos.</p>
        <div className="send-modal-card">
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
          {extra}
        </div>
      </div>
    </div>
  );
}
