import { useCallback, useEffect, useRef, useState } from "react";

export function useAutoCycle(length: number, intervalMs = 5000) {
  const [active, setActiveState] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const startRef = useRef(Date.now());

  const advance = useCallback(() => {
    setActiveState((prev) => (prev + 1) % length);
    startRef.current = Date.now();
  }, [length]);

  useEffect(() => {
    if (paused) {
      clearInterval(timerRef.current);
      return;
    }
    startRef.current = Date.now();
    timerRef.current = setInterval(advance, intervalMs);
    return () => clearInterval(timerRef.current);
  }, [paused, advance, intervalMs]);

  useEffect(() => {
    if (paused) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      setProgress(Math.min(elapsed / intervalMs, 1));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, active, intervalMs]);

  const setActive = useCallback(
    (idx: number) => {
      setActiveState(idx);
      startRef.current = Date.now();
      setProgress(0);
      clearInterval(timerRef.current);
      if (!paused) {
        timerRef.current = setInterval(advance, intervalMs);
      }
    },
    [paused, advance, intervalMs],
  );

  const togglePause = useCallback(() => setPaused((p) => !p), []);

  return { active, setActive, paused, togglePause, progress };
}
