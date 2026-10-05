"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";

type Props = {
  children: ReactNode;
};

export function EnvelopeOpen({ children }: Props) {
  const stage = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = stage.current;
    if (!root) return;
    document.body.classList.remove("env-locked");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.classList.add("is-open");
      return;
    }

    const mobile = window.matchMedia("(max-width: 768px)").matches;
    const flap = root.querySelector<HTMLElement>(".env-flap");
    const seal = root.querySelector<HTMLElement>(".env-seal");
    const letter = root.querySelector<HTMLElement>(".env-letter");
    const chrome = root.querySelectorAll(".env-flap, .env-seal, .env-pocket-face");
    if (!flap || !seal || !letter) return;

    gsap.set(flap, {
      transformPerspective: 1200,
      transformOrigin: "top center",
      rotationX: 0,
    });
    gsap.set(letter, { yPercent: 58 });

    const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
    tl.to(seal, { scale: 0, autoAlpha: 0, duration: 0.12 }, 0)
      .to(flap, { rotationX: mobile ? -125 : -160, duration: 0.3 }, 0.04)
      .to(letter, { yPercent: 0, duration: 0.5 }, 0.16)
      .to(chrome, { autoAlpha: 0, duration: 0.16 }, 0.5)
      .to({}, { duration: 0.22 });

    const tick = () => {
      const total = Math.max(1, root.offsetHeight - window.innerHeight);
      const p = Math.min(1, Math.max(0, -root.getBoundingClientRect().top / total));
      tl.progress(p);
      root.classList.toggle("is-open", p >= 0.6);
    };

    tick();
    gsap.ticker.add(tick);
    document.addEventListener("scroll", tick, true);
    window.addEventListener("resize", tick);
    return () => {
      gsap.ticker.remove(tick);
      document.removeEventListener("scroll", tick, true);
      window.removeEventListener("resize", tick);
      tl.kill();
    };
  }, []);

  return (
    <div ref={stage} className="env-stage">
      <div className="env-scene">
        <div className="env-shell">
          <div className="env-pocket">
            <div className="env-pocket-face" aria-hidden="true" />
            <section className="env-letter" id="secao-1">
              {children}
            </section>
          </div>
          <div className="env-flap" aria-hidden="true" />
          <div className="env-seal" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true">
              <path d="M12 20S3.5 14.6 3.5 8.9C3.5 6 5.7 4 8.4 4c1.6 0 3 .8 3.6 2.1C12.6 4.8 14 4 15.6 4 18.3 4 20.5 6 20.5 8.9 20.5 14.6 12 20 12 20z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
