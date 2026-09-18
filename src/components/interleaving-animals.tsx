"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
} from "framer-motion";
import { MESSENGERS } from "@/lib/messengers";
import { cn } from "@/lib/utils";

const easeRomantic = [0.22, 1, 0.36, 1] as const;

type InterleavingAnimalsProps = {
  className?: string;
  intervalMs?: number;
};

/** Floating diorama of 3D messenger mascots — hero centerpiece. */
export function InterleavingAnimals({
  className,
  intervalMs = 3800,
}: InterleavingAnimalsProps) {
  const [index, setIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const springX = useSpring(mx, { stiffness: 60, damping: 18 });
  const springY = useSpring(my, { stiffness: 60, damping: 18 });

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % MESSENGERS.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  const current = MESSENGERS[index];
  const dir = index % 2 === 0 ? 1 : -1;

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mx.set(x * 16);
    my.set(y * 10);
  }

  function onPointerLeave() {
    mx.set(0);
    my.set(0);
  }

  return (
    <div
      ref={containerRef}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={cn(
        "relative mx-auto flex h-[300px] w-full max-w-lg items-center justify-center sm:h-[380px] lg:h-[440px]",
        className,
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Soft glow pedestal */}
      <div
        aria-hidden
        className="absolute inset-x-[12%] bottom-[8%] h-[28%] rounded-[100%] opacity-90 transition-colors duration-700"
        style={{
          background: `radial-gradient(ellipse at center, ${current.accentSoft}, transparent 70%)`,
          filter: "blur(8px)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-[8%] rounded-[2.5rem] transition-opacity duration-700"
        style={{
          background: `radial-gradient(circle at 50% 40%, ${current.accentSoft}, transparent 65%)`,
        }}
      />

      <motion.div style={{ x: springX, y: springY }} className="absolute z-10">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 60 * dir, scale: 0.92, rotate: 3 * dir }}
            animate={{ opacity: 1, x: 0, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, x: -60 * dir, scale: 0.92, rotate: -3 * dir }}
            transition={{ duration: 0.85, ease: easeRomantic }}
            className="flex flex-col items-center gap-4"
          >
            <motion.div
              whileHover={{ scale: 1.045, rotate: -1.5 }}
              transition={{ duration: 0.5, ease: easeRomantic }}
              className="relative"
            >
              <div
                className="mascot-bob relative size-[200px] sm:size-[260px] lg:size-[300px]"
                style={{ filter: "drop-shadow(var(--shadow-mascot))" }}
              >
                <Image
                  src={current.image}
                  alt={current.name}
                  fill
                  priority
                  sizes="(max-width: 640px) 200px, (max-width: 1024px) 260px, 300px"
                  className="object-contain select-none"
                  draggable={false}
                />
              </div>
            </motion.div>

            <div className="text-center">
              <p className="font-[family-name:var(--font-fraunces)] text-xl font-medium tracking-tight text-foreground sm:text-2xl">
                {current.name}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {current.note}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <div className="absolute bottom-2 z-20 flex gap-2 sm:bottom-4">
        {MESSENGERS.map((messenger, i) => (
          <button
            key={messenger.id}
            type="button"
            aria-label={`Ver ${messenger.name}`}
            onClick={() => setIndex(i)}
            className={cn(
              "h-1.5 rounded-full transition-all duration-500",
              i === index
                ? "w-7 bg-primary"
                : "w-1.5 bg-foreground/20 hover:bg-foreground/40",
            )}
            style={{ transitionTimingFunction: "var(--ease-romantic)" }}
          />
        ))}
      </div>
    </div>
  );
}
