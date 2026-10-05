"use client";

import { Link } from "@tanstack/react-router";
import { useRef } from "react";
import { MESSENGERS, messengerPhoto } from "@/lib/messengers";

function TiltCard({
  name,
  tagline,
  flavor,
  price,
  speed,
  src,
}: {
  name: string;
  tagline: string;
  flavor: string;
  price: number;
  speed: number;
  src: string;
}) {
  const ref = useRef<HTMLAnchorElement>(null);

  function onMove(e: React.MouseEvent<HTMLAnchorElement>) {
    const el = ref.current;
    if (!el || window.matchMedia("(pointer: coarse)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 8}deg) translateY(-4px)`;
  }

  function onLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "rotateY(0) rotateX(0) translateY(0)";
  }

  return (
    <Link
      ref={ref}
      to="/escrever"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="messenger-tilt"
    >
      <img src={src} alt="" className="messenger-tilt-photo" />
      <div className="messenger-tilt-body">
        <p className="messenger-tilt-name">{name}</p>
        <p className="messenger-tilt-tag">{tagline}</p>
        <p className="messenger-tilt-flavor">{flavor}</p>
        <p className="messenger-tilt-meta">
          {speed} km/h · R$ {price}
        </p>
      </div>
    </Link>
  );
}

export function MessengerShowcase() {
  return (
    <section className="messenger-showcase">
      <div className="messenger-showcase-head">
        <p className="section-kicker">Os sete</p>
        <h2>Escolha quem leva o que você não consegue dizer em voz alta.</h2>
      </div>
      <div className="messenger-showcase-grid">
        {MESSENGERS.map((m) => (
          <TiltCard
            key={m.id}
            name={m.name}
            tagline={m.tagline}
            flavor={m.flavor}
            price={m.basePriceBrl}
            speed={m.speedKmh}
            src={messengerPhoto(m.id)}
          />
        ))}
      </div>
    </section>
  );
}
