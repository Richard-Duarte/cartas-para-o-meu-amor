"use client";

import { useEffect } from "react";

const FACTOR = 0.92;

function shouldSkip(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  if (target.closest(".canva-workspace, .canva-page, .canva-full, .leaflet-container, .map, input, textarea, select, [contenteditable='true']")) {
    return true;
  }
  let el: Element | null = target;
  while (el && el !== document.body) {
    const style = window.getComputedStyle(el);
    const oy = style.overflowY;
    if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 2) return true;
    el = el.parentElement;
  }
  return false;
}

export function SlowScroll() {
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.defaultPrevented) return;
      if (shouldSkip(e.target)) return;
      // Trackpad already arrives in pixels and keeps its own inertia.
      if (e.deltaMode === 0) return;
      e.preventDefault();
      const line = e.deltaMode === 1 ? 16 : 1;
      window.scrollBy({ top: e.deltaY * line * FACTOR, left: 0, behavior: "auto" });
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);
  return null;
}
