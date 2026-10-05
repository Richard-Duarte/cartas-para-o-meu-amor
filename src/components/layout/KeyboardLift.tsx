"use client";

import { useEffect } from "react";

export function KeyboardLift() {
  useEffect(() => {
    const root = document.documentElement;
    const lift = () => {
      const vv = window.visualViewport;
      if (!vv) {
        root.style.setProperty("--kb", "0px");
        return;
      }
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty("--kb", `${kb}px`);
    };
    const onFocus = (e: Event) => {
      const el = e.target;
      if (!(el instanceof HTMLElement)) return;
      if (!/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if ((el as HTMLInputElement).type === "hidden") return;
      window.setTimeout(() => {
        el.scrollIntoView({ block: "center", behavior: "smooth", inline: "nearest" });
      }, 280);
    };
    window.visualViewport?.addEventListener("resize", lift);
    window.visualViewport?.addEventListener("scroll", lift);
    window.addEventListener("resize", lift);
    document.addEventListener("focusin", onFocus);
    lift();
    return () => {
      window.visualViewport?.removeEventListener("resize", lift);
      window.visualViewport?.removeEventListener("scroll", lift);
      window.removeEventListener("resize", lift);
      document.removeEventListener("focusin", onFocus);
    };
  }, []);
  return null;
}
