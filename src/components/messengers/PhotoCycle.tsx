"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { MESSENGERS, messengerPhoto, type MessengerId } from "@/lib/messengers";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

type Props = {
  intervalMs?: number;
  className?: string;
  ids?: MessengerId[];
};

export function PhotoCycle({ intervalMs = 3200, className, ids }: Props) {
  const list = ids?.length
    ? MESSENGERS.filter((m) => ids.includes(m.id))
    : MESSENGERS;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % list.length);
    }, intervalMs);
    return () => clearInterval(t);
  }, [intervalMs, list.length, index]);

  const current = list[index] ?? list[0];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-line bg-paper",
        className,
      )}
    >
      <div className="relative aspect-square w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            className="absolute inset-0 overflow-hidden"
            initial={{ opacity: 0, x: 28, filter: "blur(8px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: -20, filter: "blur(6px)" }}
            transition={{ duration: 0.55, ease }}
          >
            <img
              src={messengerPhoto(current.id)}
              alt={current.name}
              className="photo-breathe h-full w-full object-cover"
            />
          </motion.div>
        </AnimatePresence>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/55 to-transparent px-5 pb-5 pt-16">
          <AnimatePresence mode="wait">
            <motion.p
              key={current.id}
              className="font-display text-2xl text-paper"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease }}
            >
              {current.name}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 px-4 py-3">
        {list.map((m, i) => (
          <button
            key={m.id}
            type="button"
            aria-label={m.name}
            onClick={() => setIndex(i)}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              i === index ? "w-6 bg-rose" : "w-2 bg-line hover:bg-muted",
            )}
          />
        ))}
      </div>
    </div>
  );
}

type StillProps = {
  id: MessengerId;
  className?: string;
  alt?: string;
};

export function MessengerStill({ id, className, alt }: StillProps) {
  return (
    <img
      src={messengerPhoto(id)}
      alt={alt ?? ""}
      className={cn("photo-breathe h-full w-full object-cover", className)}
    />
  );
}
