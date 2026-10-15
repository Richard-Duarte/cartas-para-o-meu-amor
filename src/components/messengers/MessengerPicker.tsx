"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { SCHEDULE_FEE_BRL } from "@/lib/delivery";
import {
  MESSENGERS,
  messengerPhoto,
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
  disabledIds?: Set<string>;
  scheduled?: boolean;
};

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
      poster={messengerPhoto(id)}
      aria-label={name}
      className="h-full w-full object-contain"
    >
      <source src={messengerPreview(id)} type="video/mp4" />
    </video>
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

export function MessengerPicker({ value, onChange, disabledIds, scheduled }: Props) {
  const selected = MESSENGERS.find((m) => m.id === value) ?? MESSENGERS[0];
  const fee = SCHEDULE_FEE_BRL.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="messenger-picker">
      <div className="messenger-picker-grid">
        {MESSENGERS.map((m) => {
          const active = m.id === value;
          const blocked = disabledIds?.has(m.id) ?? false;
          const price = m.basePriceBrl.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          });
          return (
            <button
              key={m.id}
              type="button"
              disabled={blocked}
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
                  {` · ${m.speedKmh} km/h`}
                </span>
              </span>
            </button>
          );
        })}
      </div>
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
    </div>
  );
}
