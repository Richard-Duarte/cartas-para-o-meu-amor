"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  poster?: string;
  className?: string;
  ariaHidden?: boolean;
};

type NavigatorWithConnection = Navigator & { connection?: { saveData?: boolean } };

/**
 * Vídeo decorativo que só baixa quando chega perto da tela e pausa quando sai.
 * Em "economia de dados" ou com movimento reduzido fica só o pôster.
 */
export function LazyVideo({ src, poster, className, ariaHidden = true }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [load, setLoad] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const saveData = Boolean((navigator as NavigatorWithConnection).connection?.saveData);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (saveData || still) return;
    if (typeof IntersectionObserver !== "function") {
      setLoad(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          setLoad(true);
          void el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { rootMargin: "240px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !load) return;
    el.load();
    void el.play().catch(() => {});
  }, [load]);

  return (
    <video
      ref={ref}
      className={className}
      muted
      loop
      playsInline
      preload="none"
      poster={poster}
      aria-hidden={ariaHidden}
    >
      {load ? <source src={src} type="video/mp4" /> : null}
    </video>
  );
}
