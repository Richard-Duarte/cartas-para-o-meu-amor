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
};

const MESSENGERS: Messenger[] = [
  { id: "pombo", label: "Pombo", note: "asas clássicas", Icon: PomboIcon },
  { id: "cavalo", label: "Cavalo", note: "galope nobre", Icon: CavaloIcon },
  { id: "jegue", label: "Jegue", note: "sem pressa", Icon: JegueIcon },
  {
    id: "instantaneo",
    label: "Instantâneo",
    note: "flash de ouro",
    Icon: InstantaneoIcon,
  },
];

type InterleavingAnimalsProps = {
  className?: string;
  intervalMs?: number;
  word?: string;
};

/** Messenger showcase in QuizHub language: wine card, bold uppercase, pink canvas. */
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
        className,
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="absolute inset-0 rounded-3xl border-2 border-foreground bg-card/80" />

      <p
        className="pointer-events-none absolute inset-x-0 top-1/2 z-0 -translate-y-1/2 text-center text-[clamp(2.8rem,14vw,8.5rem)] leading-none font-black tracking-tighter text-foreground/10 select-none uppercase"
        aria-hidden
      >
        {word}
      </p>

      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={current.id}
          initial={{ opacity: 0, x: 110 * dir, y: 12, rotate: 6 * dir }}
          animate={{ opacity: 1, x: 0, y: 0, rotate: -2 * dir }}
          exit={{ opacity: 0, x: -110 * dir, y: -8, rotate: -8 * dir }}
          transition={{ duration: 0.75, ease: [0.34, 1, 0.64, 1] }}
          className="absolute z-10 flex flex-col items-center gap-3"
        >
          <div className="flex size-36 items-center justify-center rounded-3xl border-2 border-foreground bg-background text-foreground sm:size-44 lg:size-52">
            <current.Icon className="size-[4.5rem] sm:size-24 lg:size-28" />
          </div>
          <div className="text-center">
            <p className="text-xl font-extrabold tracking-tight uppercase sm:text-2xl">
              {current.label}
            </p>
            <p className="mt-1 font-serif text-base text-muted-foreground">
              {current.note}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-5 z-20 flex gap-2 sm:bottom-7">
        {MESSENGERS.map((messenger, i) => (
          <span
            key={messenger.id}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === index ? "w-6 bg-foreground" : "w-1.5 bg-foreground/30",
            )}
          />
        ))}
      </div>
    </div>
  );
}
