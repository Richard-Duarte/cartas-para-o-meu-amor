"use client";

import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CavaloIcon,
  InstantaneoIcon,
  JegueIcon,
  PomboIcon,
} from "@/components/messenger-icons";
import { cn } from "@/lib/utils";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type Messenger = {
  id: string;
  label: string;
  note: string;
  Icon: IconComponent;
  /** Soft blush accent only — romantic secondary, not primary chrome */
  tint: string;
};

const MESSENGERS: Messenger[] = [
  {
    id: "pombo",
    label: "Pombo",
    note: "← asas clássicas →",
    Icon: PomboIcon,
    tint: "text-pink/80",
  },
  {
    id: "cavalo",
    label: "Cavalo",
    note: "← galope nobre →",
    Icon: CavaloIcon,
    tint: "text-ink/70",
  },
  {
    id: "jegue",
    label: "Jegue",
    note: "← sem pressa →",
    Icon: JegueIcon,
    tint: "text-pink/70",
  },
  {
    id: "instantaneo",
    label: "Instantâneo",
    note: "← flash de ouro →",
    Icon: InstantaneoIcon,
    tint: "text-ink/75",
  },
];

type InterleavingAnimalsProps = {
  className?: string;
  intervalMs?: number;
  /** Giant background word — Ocha SPECIALS energy */
  word?: string;
};

/**
 * Ocha SPECIALS pattern: giant background type with floating animal
 * cutouts crossing through the letters via AnimatePresence sync slide.
 */
export function InterleavingAnimals({
  className,
  intervalMs = 3200,
  word = "MENSAGEIROS",
}: InterleavingAnimalsProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % MESSENGERS.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  const current = MESSENGERS[index];
  const dir = index % 2 === 0 ? 1 : -1;

  return (
    <div
      className={cn(
        "relative mx-auto flex h-[280px] w-full max-w-4xl items-center justify-center overflow-hidden sm:h-[360px] lg:h-[420px]",
        className
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Cream framed craft panel */}
      <div className="absolute inset-0 rounded-[1.5rem] border border-[#E8DDD0] bg-paper/80 paper-shadow" />
      <div className="absolute inset-3 rounded-[1.1rem] border border-[#E8DDD0]/70 bg-cream/40 sm:inset-4" />

      {/* Giant background word */}
      <p
        className="pointer-events-none absolute inset-x-0 top-1/2 z-0 -translate-y-1/2 text-center font-display text-[clamp(2.8rem,14vw,8.5rem)] leading-none font-semibold tracking-[-0.04em] text-ink/[0.07] select-none uppercase"
        aria-hidden
      >
        {word}
      </p>

      {/* Floating animal cutout — crosses the type */}
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={current.id}
          initial={{ opacity: 0, x: 110 * dir, y: 12, rotate: 6 * dir }}
          animate={{ opacity: 1, x: 0, y: 0, rotate: -2 * dir }}
          exit={{ opacity: 0, x: -110 * dir, y: -8, rotate: -8 * dir }}
          transition={{
            duration: 0.75,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="absolute z-10 flex flex-col items-center gap-3"
        >
          <div className="flex size-36 items-center justify-center rounded-[2rem] border border-[#E8DDD0]/90 bg-cream shadow-[0_18px_50px_-28px_rgba(32,31,29,0.35)] sm:size-44 lg:size-52">
            <current.Icon
              className={cn("size-[4.5rem] sm:size-24 lg:size-28", current.tint)}
            />
          </div>
          <div className="text-center">
            <p className="font-display text-xl tracking-[-0.02em] text-ink sm:text-2xl">
              {current.label}
            </p>
            <p className="font-hand mt-1 rotate-[-3deg] text-lg text-ink/55">
              {current.note}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dots */}
      <div className="absolute bottom-5 z-20 flex gap-2 sm:bottom-7">
        {MESSENGERS.map((messenger, i) => (
          <span
            key={messenger.id}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === index ? "w-6 bg-ink" : "w-1.5 bg-ink/20"
            )}
          />
        ))}
      </div>
    </div>
  );
}
