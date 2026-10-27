"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import {
  canPromptInstall,
  detectPlatform,
  isStandalone,
  justInstalled,
  promptInstall,
  subscribePwa,
  type PwaPlatform,
} from "@/lib/pwa";

/* —— ícones (traço fino, cor da marca) —— */
function Svg({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      {children}
    </svg>
  );
}
const IconShareIos = () => (
  <Svg>
    <path d="M12 3.5v11" />
    <path d="M8 7.2 12 3.5l4 3.7" />
    <path d="M8.5 10H6.8A1.8 1.8 0 0 0 5 11.8v6.9a1.8 1.8 0 0 0 1.8 1.8h10.4a1.8 1.8 0 0 0 1.8-1.8v-6.9A1.8 1.8 0 0 0 17.2 10h-1.7" />
  </Svg>
);
const IconAddSquare = () => (
  <Svg>
    <rect x="4" y="4" width="16" height="16" rx="3.5" />
    <path d="M12 8.5v7M8.5 12h7" />
  </Svg>
);
const IconDots = () => (
  <Svg>
    <circle cx="12" cy="5.5" r="1.4" className="is-fill" />
    <circle cx="12" cy="12" r="1.4" className="is-fill" />
    <circle cx="12" cy="18.5" r="1.4" className="is-fill" />
  </Svg>
);
const IconInstall = () => (
  <Svg>
    <rect x="6.5" y="2.8" width="11" height="18.4" rx="2.6" />
    <path d="M12 8v6.5M9.3 12l2.7 2.7 2.7-2.7" />
  </Svg>
);
const IconCheck = () => (
  <Svg>
    <path d="m5.5 12.5 4.2 4.2 8.8-9.4" />
  </Svg>
);
const IconAndroid = () => (
  <Svg>
    <path d="M6.5 16.5v-5a5.5 5.5 0 0 1 11 0v5z" />
    <path d="m8 7.3-1.4-2.2M16 7.3l1.4-2.2" />
    <circle cx="9.7" cy="11.4" r="0.9" className="is-fill" />
    <circle cx="14.3" cy="11.4" r="0.9" className="is-fill" />
  </Svg>
);
const IconIphone = () => (
  <Svg>
    <rect x="6.5" y="2.8" width="11" height="18.4" rx="2.8" />
    <path d="M10.5 5.2h3" />
  </Svg>
);

type Sheet = "ios" | "android" | null;

function usePwaState() {
  const canPrompt = useSyncExternalStore(subscribePwa, canPromptInstall, () => false);
  const installed = useSyncExternalStore(subscribePwa, justInstalled, () => false);
  return { canPrompt, installed };
}

function Steps({ kind }: { kind: "ios" | "android" }) {
  if (kind === "ios") {
    return (
      <ol className="install-steps">
        <li>
          <span className="install-step-icon"><IconShareIos /></span>
          <span>
            Toque em <b>Compartilhar</b>
            <small>No Safari fica na barra de baixo (ou de cima, no iPad). No Chrome do iPhone (iOS 16.4+), fica na barra de endereço.</small>
          </span>
        </li>
        <li>
          <span className="install-step-icon"><IconAddSquare /></span>
          <span>
            Role e toque em <b>Adicionar à Tela de Início</b>
            <span className="install-chip"><IconAddSquare /> Adicionar à Tela de Início</span>
          </span>
        </li>
        <li>
          <span className="install-step-icon"><IconCheck /></span>
          <span>
            Toque em <b>Adicionar</b>
            <small>Pronto: o envelope com coração aparece na sua tela inicial.</small>
          </span>
        </li>
      </ol>
    );
  }
  return (
    <ol className="install-steps">
      <li>
        <span className="install-step-icon"><IconDots /></span>
        <span>
          Abra o menu <b>⋮</b> do Chrome
          <small>No canto de cima, à direita. No Edge, o menu fica embaixo (…).</small>
        </span>
      </li>
      <li>
        <span className="install-step-icon"><IconInstall /></span>
        <span>
          Toque em <b>Instalar app</b>
          <span className="install-chip"><IconInstall /> Instalar app · Adicionar à tela inicial</span>
        </span>
      </li>
      <li>
        <span className="install-step-icon"><IconCheck /></span>
        <span>
          Confirme em <b>Instalar</b>
          <small>O app abre direto pela tela inicial, sem a barra do navegador.</small>
        </span>
      </li>
    </ol>
  );
}

function InstallSheet({ kind, onClose }: { kind: "ios" | "android"; onClose: () => void }) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="install-sheet-backdrop" onClick={onClose}>
      <div
        ref={ref}
        className="install-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="install-sheet-grip" aria-hidden="true" />
        <div className="install-sheet-head">
          <img src="/icons/icon-192-v2.png" alt="" width={48} height={48} />
          <div>
            <p className="section-kicker">{kind === "ios" ? "iPhone e iPad" : "Android"}</p>
            <h3 id={titleId}>{kind === "ios" ? "Instalar no iPhone" : "Instalar no Android"}</h3>
          </div>
        </div>
        <Steps kind={kind} />
        <p className="install-sheet-note">
          Abriu pelo Instagram, WhatsApp ou Facebook? Toque em “Abrir no navegador” antes
          ({kind === "ios" ? "Safari" : "Chrome"}).
        </p>
        <button type="button" className="install-sheet-close" onClick={onClose}>
          Entendi
        </button>
      </div>
    </div>
  );
}

export function InstallAppSection() {
  const [platform, setPlatform] = useState<PwaPlatform | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const { canPrompt, installed } = usePwaState();

  useEffect(() => {
    setPlatform(detectPlatform());
    const sync = () => setStandalone(isStandalone());
    sync();
    const mq = window.matchMedia?.("(display-mode: standalone)");
    mq?.addEventListener?.("change", sync);
    return () => mq?.removeEventListener?.("change", sync);
  }, []);

  async function onAndroid() {
    if (canPrompt) {
      const r = await promptInstall();
      if (r !== "unavailable") return;
    }
    setSheet("android");
  }

  const done = standalone || installed;

  return (
    <section id="app" className="install-app" aria-labelledby="install-app-title">
      <div className="install-app-inner">
        <img className="install-app-logo" src="/icons/icon-192-v2.png" alt="" width={72} height={72} loading="lazy" />
        <p className="section-kicker">{done ? "Na sua tela inicial" : "No celular"}</p>
        <h2 id="install-app-title">{done ? "App instalado." : "Instale o app"}</h2>
        {done ? (
          <p className="install-app-lead">
            <span className="install-done-badge"><IconCheck /> Você já está no app</span>
          </p>
        ) : (
          <>
            <p className="install-app-lead">
              O envelope fica na tela inicial: abre em tela cheia, sem barra do navegador, e a
              próxima carta fica a um toque. Grátis, sem loja de apps.
            </p>
            <div className="install-app-options">
              <div className={platform === "android" ? "install-option is-suggested" : "install-option"}>
                {platform === "android" ? <span className="install-option-badge">Seu aparelho</span> : null}
                <span className="install-option-icon"><IconAndroid /></span>
                <p className="install-option-title">Android</p>
                <p className="install-option-sub">Chrome, Edge e Samsung Internet</p>
                <button type="button" className="install-option-btn" onClick={() => void onAndroid()}>
                  <IconInstall /> Instalar no Android
                </button>
              </div>
              <div className={platform === "ios" ? "install-option is-suggested" : "install-option"}>
                {platform === "ios" ? <span className="install-option-badge">Seu aparelho</span> : null}
                <span className="install-option-icon"><IconIphone /></span>
                <p className="install-option-title">iPhone e iPad</p>
                <p className="install-option-sub">Safari, e Chrome no iOS 16.4+</p>
                <button type="button" className="install-option-btn" onClick={() => setSheet("ios")}>
                  <IconShareIos /> Instalar no iPhone
                </button>
              </div>
            </div>
            {platform === "desktop" ? (
              <p className="install-app-desktop">
                {canPrompt ? (
                  <button type="button" className="install-app-desktop-btn" onClick={() => void promptInstall()}>
                    <IconInstall /> Instalar neste computador
                  </button>
                ) : (
                  <>No computador: no Chrome ou no Edge, clique no ícone de instalar na barra de endereço.</>
                )}
              </p>
            ) : null}
          </>
        )}
      </div>
      {sheet ? <InstallSheet kind={sheet} onClose={() => setSheet(null)} /> : null}
    </section>
  );
}
