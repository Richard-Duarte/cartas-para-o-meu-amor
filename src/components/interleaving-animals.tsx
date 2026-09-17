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
  Icon: IconComponent;
  accent: string;
};

const MESSENGERS: Messenger[] = [
  {
    id: "pombo",
    label: "Pombo",
    Icon: PomboIcon,
    accent: "from-blush/50 to-pink/20",
  },
  {
    id: "cavalo",
    label: "Cavalo",
    Icon: CavaloIcon,
    accent: "from-gold/40 to-blush/20",
  },
  {
    id: "jegue",
    label: "Jegue",
    Icon: JegueIcon,
    accent: "from-pink/30 to-gold/25",
  },
  {
    id: "instantaneo",
    label: "Instantâneo",
    Icon: InstantaneoIcon,
    accent: "from-gold/50 to-pink/30",
  },
];

type InterleavingAnimalsProps = {
  className?: string;
  intervalMs?: number;
};

export function InterleavingAnimals({
  className,
  intervalMs = 2800,
}: InterleavingAnimalsProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % MESSENGERS.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  const current = MESSENGERS[index];

  return (
    <div
      className={cn(
        "relative mx-auto flex h-56 w-full max-w-sm items-center justify-center sm:h-72",
        className
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="absolute inset-6 rounded-[2rem] bg-gradient-to-br from-blush/30 via-cream to-gold/20 blur-sm" />
      <div className="absolute inset-0 rounded-[2.25rem] border border-blush/40 bg-card/70 shadow-[0_20px_60px_-30px_rgba(232,90,122,0.45)] backdrop-blur-sm" />

      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 28, scale: 0.86 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -24, scale: 0.9 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex flex-col items-center gap-4"
        >
          <div
            className={cn(
              "flex size-28 items-center justify-center rounded-full bg-gradient-to-br sm:size-36",
              current.accent
            )}
          >
            <current.Icon className="size-14 text-pink sm:size-16" />
          </div>
          <p className="font-display text-sm tracking-[0.28em] text-ink/80 uppercase">
            {current.label}
          </p>
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-5 flex gap-2">
        {MESSENGERS.map((messenger, i) => (
          <span
            key={messenger.id}
            className={cn(
              "h-1.5 w-1.5 rounded-full transition-all duration-300",
              i === index ? "w-5 bg-pink" : "bg-blush/70"
            )}
          />
        ))}
      </div>
    </div>
  );
}
