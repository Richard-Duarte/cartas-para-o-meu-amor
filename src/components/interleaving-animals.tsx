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
  intervalMs = 3000,
}: InterleavingAnimalsProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % MESSENGERS.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  const current = MESSENGERS[index];
  // Alternate crossing direction for organic Studio Think motion + Ocha snap
  const dir = index % 2 === 0 ? 1 : -1;

  return (
    <div
      className={cn(
        "relative mx-auto flex h-64 w-full max-w-md items-center justify-center sm:h-80",
        className
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Soft paper craft frame — not glassy SaaS */}
      <div className="absolute inset-4 rounded-[1.75rem] bg-gradient-to-br from-blush/25 via-cream to-gold/15" />
      <div className="paper-shadow absolute inset-0 rounded-[2rem] border border-[#E5D5C4]/80 bg-[#FFF8F0]/90" />

      {/* mode=sync: exit + enter overlap so animals cross */}
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={current.id}
          initial={{ opacity: 0, x: 72 * dir, scale: 0.92 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -72 * dir, scale: 0.92 }}
          transition={{
            duration: 0.7,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5"
        >
          <div
            className={cn(
              "flex size-32 items-center justify-center rounded-full bg-gradient-to-br sm:size-40",
              current.accent
            )}
          >
            <current.Icon className="size-16 text-pink sm:size-[4.5rem]" />
          </div>
          <p className="font-display text-xs tracking-[0.32em] text-ink/75 uppercase">
            {current.label}
          </p>
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-6 z-20 flex gap-2">
        {MESSENGERS.map((messenger, i) => (
          <span
            key={messenger.id}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === index ? "w-6 bg-pink" : "w-1.5 bg-blush/80"
            )}
          />
        ))}
      </div>
    </div>
  );
}
