"use client";

import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";

const VIDEO = "/media/anonimo.mp4";

export function AnonymousSection() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const leftRef = useRef(false);
  const startedRef = useRef(false);
  const [playing, setPlaying] = useState(false);

  function go() {
    if (leftRef.current) return;
    leftRef.current = true;
    void navigate({ to: "/escrever", search: { anonimo: "1" } });
  }

  function holdFirstFrame(video: HTMLVideoElement) {
    if (startedRef.current) return;
    video.pause();
    if (video.currentTime > 0.05) {
      try {
        video.currentTime = 0;
      } catch {
        /* some browsers reject a seek before metadata */
      }
    }
  }

  function onWrite() {
    const video = videoRef.current;
    if (!video || startedRef.current) return;
    startedRef.current = true;
    setPlaying(true);
    const finish = () => go();
    const timer = window.setTimeout(finish, 8000);
    video.addEventListener(
      "ended",
      () => {
        window.clearTimeout(timer);
        finish();
      },
      { once: true },
    );
    try {
      video.currentTime = 0;
    } catch {
      /* play from wherever the first frame landed */
    }
    video.muted = false;
    void video.play().catch(() => {
      video.muted = true;
      void video.play().catch(() => {
        window.clearTimeout(timer);
        finish();
      });
    });
  }

  return (
    <section className="anon-section" id="anonimo">
      <video
        ref={videoRef}
        className="anon-film"
        src={VIDEO}
        playsInline
        preload="auto"
        muted
        onLoadedData={(event) => holdFirstFrame(event.currentTarget)}
      />
      <div className="anon-copy">
        <p className="section-kicker">Sem nome</p>
        <h2>A carta chega. O nome, não.</h2>
        <p>
          Os mesmos mensageiros, de capuz. Quem recebe acompanha a viagem e abre a carta
          sem saber quem escreveu. O silêncio custa R$&nbsp;10.
        </p>
        <ul>
          <li>O seu nome some do envelope e do WhatsApp.</li>
          <li>
            Se a viagem demora, avisamos você e quem recebe — e-mail e WhatsApp — que está
            chegando.
          </li>
          <li>Se o mensageiro chega na hora, não há aviso. A carta já está lá.</li>
        </ul>
        <button
          type="button"
          className="anon-cta"
          onClick={onWrite}
          disabled={playing}
          aria-busy={playing}
        >
          Escrever carta anônima
        </button>
      </div>
    </section>
  );
}
