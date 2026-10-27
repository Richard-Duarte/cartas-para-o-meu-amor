"use client";

import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MESSENGERS, maxSpeedLabel, messengerPhoto } from "@/lib/messengers";

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
  speed: string;
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
      draggable={false}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="messenger-tilt"
    >
      <img src={src} alt="" className="messenger-tilt-photo" draggable={false} loading="lazy" />
      <div className="messenger-tilt-body">
        <p className="messenger-tilt-name">{name}</p>
        <p className="messenger-tilt-tag">{tagline}</p>
        <p className="messenger-tilt-flavor">{flavor}</p>
        <p className="messenger-tilt-meta">
          Velocidade: {speed} · R$ {price}
        </p>
      </div>
    </Link>
  );
}

const AUTOPLAY_MS = 3000;
/** Cópias de cada ponta para o giro infinito (cobre até 3 cartões por vez). */
const CLONES = 3;

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduce(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);
  return reduce;
}

export function MessengerShowcase() {
  const n = MESSENGERS.length;
  const slides = useMemo(
    () => [
      ...MESSENGERS.slice(-CLONES).map((m) => ({ m, clone: true })),
      ...MESSENGERS.map((m) => ({ m, clone: false })),
      ...MESSENGERS.slice(0, CLONES).map((m) => ({ m, clone: true })),
    ],
    [],
  );
  const [pos, setPos] = useState(CLONES);
  const [animate, setAnimate] = useState(true);
  const [hold, setHold] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const [resumeKey, setResumeKey] = useState(0);
  const [dx, setDx] = useState(0);
  const reduce = usePrefersReducedMotion();
  const rootRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; id: number; moved: boolean; axis: "x" | "y" | null } | null>(null);
  const suppressClick = useRef(false);
  const hovering = useRef(false);

  const active = (((pos - CLONES) % n) + n) % n;

  const goTo = useCallback((next: number) => {
    setAnimate(true);
    setPos(next);
  }, []);

  // Fora da tela ou com a aba escondida, o carrossel para.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver !== "function") {
      setOnScreen(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const sync = () => setTabVisible(document.visibilityState !== "hidden");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  // Um passo a cada 3 s. Recomeça a contagem depois de cada toque (resumeKey).
  useEffect(() => {
    if (reduce || hold || !onScreen || !tabVisible) return;
    const timer = window.setInterval(() => {
      setAnimate(true);
      setPos((p) => p + 1);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [reduce, hold, onScreen, tabVisible, resumeKey]);

  // Chegou numa cópia: pula sem animação para o cartão real equivalente.
  function onTransitionEnd(e: React.TransitionEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget || e.propertyName !== "transform") return;
    if (pos >= n + CLONES) {
      setAnimate(false);
      setPos(pos - n);
    } else if (pos < CLONES) {
      setAnimate(false);
      setPos(pos + n);
    }
  }
  // Sem animação (movimento reduzido), o transitionend não vem: normaliza na hora.
  useEffect(() => {
    if (!reduce) return;
    if (pos >= n + CLONES) setPos(pos - n);
    else if (pos < CLONES) setPos(pos + n);
  }, [reduce, pos, n]);
  useEffect(() => {
    if (animate) return;
    const frame = window.requestAnimationFrame(() => window.requestAnimationFrame(() => setAnimate(true)));
    return () => window.cancelAnimationFrame(frame);
  }, [animate]);

  function release() {
    if (hovering.current) return;
    setHold(false);
    setResumeKey((k) => k + 1);
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false, axis: null };
    setHold(true);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const mx = e.clientX - d.x;
    const my = e.clientY - d.y;
    if (!d.axis && (Math.abs(mx) > 6 || Math.abs(my) > 6)) {
      d.axis = Math.abs(mx) > Math.abs(my) ? "x" : "y";
      if (d.axis === "x") {
        try {
          viewportRef.current?.setPointerCapture?.(e.pointerId);
        } catch {
          // Ponteiro já solto: segue sem captura.
        }
      }
    }
    if (d.axis !== "x") return;
    d.moved = true;
    setAnimate(false);
    setDx(mx);
  }
  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const mx = d.axis === "x" ? e.clientX - d.x : 0;
    const width = viewportRef.current?.firstElementChild?.firstElementChild?.getBoundingClientRect().width ?? 300;
    setDx(0);
    setAnimate(true);
    if (d.moved) {
      suppressClick.current = true;
      window.setTimeout(() => (suppressClick.current = false), 0);
      const steps = Math.abs(mx) > Math.min(60, width * 0.18) ? Math.max(1, Math.round(Math.abs(mx) / width)) : 0;
      if (steps) setPos((p) => p + (mx < 0 ? steps : -steps));
    }
    release();
  }

  return (
    <section
      ref={rootRef}
      className="messenger-showcase"
      aria-roledescription="carrossel"
      aria-label="Os sete mensageiros"
    >
      <div className="messenger-showcase-head">
        <p className="section-kicker">Os sete</p>
        <h2>Escolha quem leva o que você não consegue dizer em voz alta.</h2>
      </div>
      <div
        ref={viewportRef}
        className="messenger-carousel"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerEnter={(e) => {
          if (e.pointerType !== "mouse") return;
          hovering.current = true;
          setHold(true);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType !== "mouse") return;
          hovering.current = false;
          if (!drag.current) release();
        }}
        onFocusCapture={() => setHold(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) release();
        }}
        onClickCapture={(e) => {
          if (suppressClick.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onDragStart={(e) => e.preventDefault()}
      >
        <div
          className={animate && !reduce ? "messenger-carousel-track is-animated" : "messenger-carousel-track"}
          style={{ "--pos": pos, "--dx": `${dx}px` } as React.CSSProperties}
          onTransitionEnd={onTransitionEnd}
          aria-live={hold ? "polite" : "off"}
        >
          {slides.map(({ m, clone }, i) => (
            <div
              key={`${clone ? "c" : "r"}-${m.id}-${i}`}
              className="messenger-carousel-slide"
              role={clone ? undefined : "group"}
              aria-roledescription={clone ? undefined : "slide"}
              aria-label={clone ? undefined : `${i - CLONES + 1} de ${n}: ${m.name}`}
              aria-hidden={clone || undefined}
              inert={clone || undefined}
            >
              <TiltCard
                name={m.name}
                tagline={m.tagline}
                flavor={m.flavor}
                price={m.basePriceBrl}
                speed={maxSpeedLabel(m.id)}
                src={messengerPhoto(m.id)}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="messenger-carousel-dots" role="tablist" aria-label="Escolher mensageiro">
        {MESSENGERS.map((m, j) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={j === active}
            aria-label={`Ver ${m.name}`}
            className={j === active ? "is-on" : undefined}
            onClick={() => {
              goTo(CLONES + j);
              setResumeKey((k) => k + 1);
            }}
          />
        ))}
      </div>
    </section>
  );
}
