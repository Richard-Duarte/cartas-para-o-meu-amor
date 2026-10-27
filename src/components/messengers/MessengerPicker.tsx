"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { SCHEDULE_FEE_BRL } from "@/lib/delivery";
import {
  MESSENGERS,
  maxSpeedLabel,
  messengerPhoto,
  messengerPoster,
  messengerPreview,
  type MessengerId,
} from "@/lib/messengers";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

type Props = {
  value: MessengerId;
  onChange: (id: MessengerId) => void;
  hoursById?: Partial<Record<MessengerId, number>>;
  arriveLabelById?: Partial<Record<MessengerId, string>>;
  /** A rota ainda é a de exemplo (sem endereço): marca o horário como estimativa. */
  etaApproximate?: boolean;
  disabledIds?: Set<string>;
  scheduled?: boolean;
};

/** Vídeo grande do mensageiro só em tela larga: no celular a lista fica compacta e economiza 4G. */
function useWide(query = "(min-width: 900px)") {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, [query]);
  return wide;
}

function PreviewClip({ id, name }: { id: MessengerId; name: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.currentTime = 0;
    void el.play().catch(() => {});
  }, [id]);

  return (
    <video
      ref={ref}
      autoPlay
      muted
      loop
      playsInline
      poster={messengerPoster(id)}
      aria-label={name}
      className="h-full w-full object-contain"
    >
      <source src={messengerPreview(id)} type="video/mp4" />
    </video>
  );
}

/** Animal animado dentro do cartão escolhido (celular/tablet). Só o escolhido carrega vídeo. */
function InlineLive({ id, name, still }: { id: MessengerId; name: string; still: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    void el.play().catch(() => {});
    // Fora da tela: pausa (economiza bateria/4G); volta a tocar quando aparece.
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) void el.play().catch(() => {});
      else el.pause();
    });
    io.observe(el);
    return () => {
      io.disconnect();
      el.pause();
      el.removeAttribute("src");
      el.load();
    };
  }, [id]);
  return (
    <span className="messenger-picker-live" aria-hidden="true">
      {still ? (
        <img src={messengerPhoto(id)} alt="" className="messenger-picker-live-media" />
      ) : (
        <video
          ref={ref}
          className="messenger-picker-live-media"
          src={messengerPreview(id)}
          poster={messengerPhoto(id)}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-label={name}
        />
      )}
    </span>
  );
}

export function MessengerLivePreview({ id }: { id: MessengerId }) {
  const selected = MESSENGERS.find((m) => m.id === id) ?? MESSENGERS[0];
  return (
    <div className="messenger-live mx-auto w-full max-w-sm overflow-hidden rounded-xl border border-line bg-[#f6eee6]">
      <div className="relative aspect-square">
        <AnimatePresence mode="wait">
          <motion.div
            key={selected.id}
            className="absolute inset-0 overflow-hidden"
            initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
            transition={{ duration: 0.4, ease }}
          >
            <PreviewClip id={selected.id} name={selected.name} />
          </motion.div>
        </AnimatePresence>
      </div>
      <p className="px-4 py-3 font-display text-lg">{selected.name}</p>
    </div>
  );
}

export function MessengerPicker({
  value,
  onChange,
  hoursById: _hoursById,
  arriveLabelById,
  etaApproximate,
  disabledIds,
  scheduled,
}: Props) {
  const selected = MESSENGERS.find((m) => m.id === value) ?? MESSENGERS[0];
  const fee = SCHEDULE_FEE_BRL.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const hasEta = MESSENGERS.some((m) => Boolean(arriveLabelById?.[m.id]));
  const wide = useWide();
  const reduce = useReducedMotion() ?? false;
  const cardRefs = useRef<Partial<Record<MessengerId, HTMLButtonElement | null>>>({});
  const firstValue = useRef(value);

  // Cartão escolhido sempre à vista e acima da barra fixa de baixo.
  useEffect(() => {
    if (wide || value === firstValue.current) return;
    firstValue.current = "" as MessengerId;
    const t = window.setTimeout(() => {
      const el = cardRefs.current[value];
      if (!el) return;
      const r = el.getBoundingClientRect();
      const css = getComputedStyle(document.documentElement).getPropertyValue("--app-bar-space");
      const bar = Number.parseFloat(css) || 96;
      const header = document.querySelector<HTMLElement>(".site-header");
      const top = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
      const vh = window.visualViewport?.height ?? window.innerHeight;
      const overBottom = r.bottom - (vh - bar - 12);
      const overTop = top + 12 - r.top;
      const behavior: ScrollBehavior = reduce ? "auto" : "smooth";
      if (overTop > 0) window.scrollBy({ top: -overTop, behavior });
      else if (overBottom > 0) window.scrollBy({ top: Math.min(overBottom, r.top - top - 12), behavior });
    }, reduce ? 0 : 380);
    return () => window.clearTimeout(t);
  }, [value, wide, reduce]);

  return (
    <div className="messenger-picker">
      <div className="messenger-picker-grid">
        {hasEta && etaApproximate ? (
          <p className="messenger-picker-note">
            Horários estimados numa rota de exemplo (São Paulo → Rio). Com o endereço, no próximo passo, a
            previsão fica exata.
          </p>
        ) : null}
        {MESSENGERS.map((m) => {
          const active = m.id === value;
          const blocked = disabledIds?.has(m.id) ?? false;
          const price = m.basePriceBrl.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          });
          const eta = arriveLabelById?.[m.id];
          const fits = Boolean(eta && eta.startsWith("Chega"));
          return (
            <motion.button
              key={m.id}
              ref={(el: HTMLButtonElement | null) => {
                cardRefs.current[m.id] = el;
              }}
              layout={!wide && !reduce ? "position" : false}
              transition={{ layout: { duration: 0.35, ease } }}
              type="button"
              disabled={blocked}
              aria-pressed={active}
              onClick={() => onChange(m.id)}
              className={cn(
                "messenger-picker-card",
                blocked && "messenger-disabled",
                active && "is-on",
              )}
            >
              <img src={messengerPhoto(m.id)} alt="" className="messenger-picker-photo" />
              <span className="messenger-picker-copy">
                <span className="messenger-picker-name">{m.name}</span>
                <span className="messenger-picker-tag">{m.tagline}</span>
                <span className="messenger-picker-meta">
                  {price}
                  {scheduled ? ` + ${fee}` : ""}
                  {` · ${maxSpeedLabel(m.id)}`}
                </span>
                {eta ? (
                  <span className={cn("messenger-picker-eta", !fits && "is-off")}>
                    {fits && etaApproximate ? `≈ ${eta}` : eta}
                  </span>
                ) : null}
              </span>
              <AnimatePresence initial={false}>
                {active && !wide ? (
                  <motion.span
                    key="live"
                    className="messenger-picker-live-wrap"
                    initial={reduce ? false : { height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                    transition={{ duration: reduce ? 0 : 0.35, ease }}
                  >
                    <InlineLive id={m.id} name={m.name} still={reduce} />
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>
      {wide ? (
      <div className="messenger-picker-preview">
        <div className="relative aspect-square">
          <AnimatePresence mode="wait">
            <motion.div
              key={selected.id}
              className="absolute inset-0 overflow-hidden"
              initial={{ opacity: 0, x: 24, filter: "blur(8px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: -16, filter: "blur(6px)" }}
              transition={{ duration: 0.45, ease }}
            >
              <PreviewClip id={selected.id} name={selected.name} />
            </motion.div>
          </AnimatePresence>
        </div>
        <p className="px-4 py-3 font-display text-lg">{selected.name}</p>
      </div>
      ) : null}
    </div>
  );
}
