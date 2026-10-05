"use client";

import { MagneticButton } from "@/components/ui/MagneticButton";

export function CinematicHero() {
  return (
    <div className="cinematic-hero">
      <video
        className="cinematic-hero-video"
        autoPlay
        muted
        loop
        playsInline
        poster="/media/fundo-poster.jpg"
        aria-hidden="true"
      >
        <source src="/media/fundo.mp4" type="video/mp4" />
      </video>
      <div className="cinematic-hero-shade" />
      <div className="cinematic-hero-grain" />
      <div className="cinematic-hero-copy">
        <p className="cinematic-kicker">O correio mais lento. O recado mais certo.</p>
        <h1 className="env-title cinematic-title">Carta para o meu amor</h1>
        <p className="cinematic-lede">
          Há quem mande mensagem. Você manda alguém — pombo, jegue, tartaruga ou avião —
          até o endereço do coração.
        </p>
        <div className="cinematic-actions">
          <MagneticButton to="/escrever">Escrever uma carta</MagneticButton>
          <MagneticButton to="/acompanhar" variant="paper">
            Acompanhar no mapa
          </MagneticButton>
        </div>
      </div>
    </div>
  );
}
