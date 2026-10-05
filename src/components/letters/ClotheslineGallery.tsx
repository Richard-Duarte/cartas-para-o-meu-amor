"use client";

import { Link } from "@tanstack/react-router";
import { useEffect, useRef, type CSSProperties } from "react";
import { DESIGNS } from "@/lib/designs";
import { cn } from "@/lib/utils";

export function ClotheslineGallery() {
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let down = false;
    let moved = false;
    let startX = 0;
    let startScroll = 0;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      down = true;
      moved = false;
      startX = e.clientX;
      startScroll = el.scrollLeft;
      el.setPointerCapture(e.pointerId);
      el.classList.add("is-dragging");
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 6) moved = true;
      el.scrollLeft = startScroll - dx;
    };
    const onUp = (e: PointerEvent) => {
      if (!down) return;
      down = false;
      el.releasePointerCapture(e.pointerId);
      el.classList.remove("is-dragging");
      if (moved) el.dataset.skipClick = "1";
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, []);

  function onClickCapture(e: React.MouseEvent) {
    const el = scroller.current;
    if (el?.dataset.skipClick === "1") {
      e.preventDefault();
      e.stopPropagation();
      delete el.dataset.skipClick;
    }
  }

  return (
    <div className="clothesline">
      <div
        ref={scroller}
        className="clothesline-track"
        onClickCapture={onClickCapture}
      >
        <div className="clothesline-inner">
          <div className="clothesline-rail" aria-hidden="true" />
          {DESIGNS.map((d, i) => (
            <article
              key={d.id}
              className="clothesline-item"
              style={
                {
                  "--tilt": `${d.tilt}deg`,
                  "--delay": `${i * 0.35}s`,
                } as CSSProperties
              }
            >
              <span className="clothesline-string" />
              <Clothespin />
              <Link to="/escrever" search={{ papel: d.id }} className="clothesline-card">
                <img src={d.src} alt="" draggable={false} />
                <span className="clothesline-label">{d.name}</span>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function DragArrow() {
  return (
    <svg className="clothesline-arrow" viewBox="0 0 88 28" fill="none">
      <path d="M4 14h72" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
      <path
        d="M64 5.5 82 14 64 22.5"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Clothespin() {
  return (
    <svg
      className="clothesline-pin"
      viewBox="0 0 24 28"
      aria-hidden="true"
      fill="none"
    >
      <path
        d="M7 3h10l-1.2 14H8.2L7 3z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M6 17h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M9.5 17 8 26M14.5 17 16 26" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="10" r="1.4" fill="currentColor" />
    </svg>
  );
}

export function ClotheslineSection({ className }: { className?: string }) {
  return (
    <section className={cn("clothesline-section", className)}>
      <div className="mx-auto max-w-5xl px-5">
        <p className="text-xs uppercase tracking-widest text-rose">O papel</p>
        <h2 className="mt-2 max-w-xl font-display text-4xl leading-tight md:text-5xl">
          O envelope que ela vai guardar.
        </h2>
        <p className="mt-3 max-w-lg text-lg text-muted">
          Seis papéis. Arraste o varal. O que fizer o peito apertar é o certo.
        </p>
        <div className="clothesline-hint" aria-hidden="true">
          <DragArrow />
        </div>
      </div>
      <div className="mt-5">
        <ClotheslineGallery />
      </div>
    </section>
  );
}
