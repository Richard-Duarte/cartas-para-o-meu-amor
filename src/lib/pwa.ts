/**
 * PWA: registro do service worker + o convite de instalação (Android/Chrome/Edge).
 * O `beforeinstallprompt` pode disparar antes da seção "Instale o app" montar,
 * então ele é guardado aqui desde o boot.
 */
declare const __APP_BUILD__: string;

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type PwaPlatform = "ios" | "android" | "desktop";

let deferred: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

export function subscribePwa(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function canPromptInstall() {
  return Boolean(deferred);
}

export function justInstalled() {
  return installed;
}

export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const ev = deferred;
  if (!ev) return "unavailable";
  deferred = null;
  emit();
  await ev.prompt();
  const { outcome } = await ev.userChoice;
  if (outcome === "accepted") {
    installed = true;
    emit();
  }
  return outcome;
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.matchMedia?.("(display-mode: fullscreen)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function detectPlatform(): PwaPlatform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  const iPadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/i.test(ua) || iPadOs) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

function inIframe() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

let booted = false;

/** Chamado uma vez no boot do app (cliente). */
export function bootPwa() {
  if (booted || typeof window === "undefined") return;
  booted = true;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as InstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installed = true;
    emit();
  });
  // Na prévia dentro de iframe (editor) não registra: o SW ficaria preso ao iframe.
  if (!("serviceWorker" in navigator) || inIframe()) return;
  const build = typeof __APP_BUILD__ === "string" ? __APP_BUILD__ : "dev";
  const register = () => {
    void navigator.serviceWorker
      .register(`/sw.js?v=${encodeURIComponent(build)}`, { scope: "/", updateViaCache: "none" })
      .catch(() => {});
  };
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
