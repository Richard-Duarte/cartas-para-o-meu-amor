"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import {
  MESSENGERS,
  formatEta,
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

export function MessengerPicker({ value, onChange, hoursById }: Props) {
  const selected = MESSENGERS.find((m) => m.id === value) ?? MESSENGERS[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="grid gap-3 sm:grid-cols-2">
        {MESSENGERS.map((m) => {
          const active = m.id === value;
          const hours = hoursById?.[m.id];
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange(m.id)}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl border px-3 py-3 text-left transition",
                active
                  ? "border-rose bg-paper shadow-md"
                  : "border-line bg-paper/50 hover:border-ink/25",
              )}
            >
              <img
                src={messengerPhoto(m.id)}
                alt=""
                className="size-14 shrink-0 rounded-lg object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{m.name}</span>
                <span className="mt-0.5 block text-sm text-muted">{m.tagline}</span>
                <span className="mt-2 block text-xs uppercase tracking-widest text-gold">
                  R$ {m.basePriceBrl}
                  {hours != null ? ` · ${formatEta(hours)}` : ""}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="mx-auto w-full max-w-xs overflow-hidden rounded-xl border border-line bg-[#f6eee6] sm:max-w-none">
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
