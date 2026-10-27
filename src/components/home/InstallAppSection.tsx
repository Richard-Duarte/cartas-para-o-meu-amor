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


/* Logos oficiais (Simple Icons, CC0), monocromáticos em currentColor. */
const LogoApple = ({ className = "install-brand" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
  </svg>
);
const LogoAndroid = ({ className = "install-brand" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
    <path d="M18.4395 5.5586c-.675 1.1664-1.352 2.3318-2.0274 3.498-.0366-.0155-.0742-.0286-.1113-.043-1.8249-.6957-3.484-.8-4.42-.787-1.8551.0185-3.3544.4643-4.2597.8203-.084-.1494-1.7526-3.021-2.0215-3.4864a1.1451 1.1451 0 0 0-.1406-.1914c-.3312-.364-.9054-.4859-1.379-.203-.475.282-.7136.9361-.3886 1.5019 1.9466 3.3696-.0966-.2158 1.9473 3.3593.0172.031-.4946.2642-1.3926 1.0177C2.8987 12.176.452 14.772 0 18.9902h24c-.119-1.1108-.3686-2.099-.7461-3.0683-.7438-1.9118-1.8435-3.2928-2.7402-4.1836a12.1048 12.1048 0 0 0-2.1309-1.6875c.6594-1.122 1.312-2.2559 1.9649-3.3848.2077-.3615.1886-.7956-.0079-1.1191a1.1001 1.1001 0 0 0-.8515-.5332c-.5225-.0536-.9392.3128-1.0488.5449zm-.0391 8.461c.3944.5926.324 1.3306-.1563 1.6503-.4799.3197-1.188.0985-1.582-.4941-.3944-.5927-.324-1.3307.1563-1.6504.4727-.315 1.1812-.1086 1.582.4941zM7.207 13.5273c.4803.3197.5506 1.0577.1563 1.6504-.394.5926-1.1038.8138-1.584.4941-.48-.3197-.5503-1.0577-.1563-1.6504.4008-.6021 1.1087-.8106 1.584-.4941z" />
  </svg>
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
            <p className="section-kicker install-sheet-kicker">
              {kind === "ios" ? <LogoApple /> : <LogoAndroid />}
              {kind === "ios" ? "iPhone e iPad" : "Android"}
            </p>
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
                <span className="install-option-icon is-android"><LogoAndroid /></span>
                <p className="install-option-title">Android</p>
                <p className="install-option-sub">Chrome, Edge e Samsung Internet</p>
                <button type="button" className="install-option-btn" onClick={() => void onAndroid()}>
                  <LogoAndroid /> Instalar no Android
                </button>
              </div>
              <div className={platform === "ios" ? "install-option is-suggested" : "install-option"}>
                {platform === "ios" ? <span className="install-option-badge">Seu aparelho</span> : null}
                <span className="install-option-icon is-apple"><LogoApple /></span>
                <p className="install-option-title">iPhone e iPad</p>
                <p className="install-option-sub">Safari, e Chrome no iOS 16.4+</p>
                <button type="button" className="install-option-btn" onClick={() => setSheet("ios")}>
                  <LogoApple /> Instalar no iPhone
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
