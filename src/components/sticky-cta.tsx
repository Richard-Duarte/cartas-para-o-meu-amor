"use client";

import Link from "next/link";
import { motion } from "framer-motion";

/** Ocha "Open For Order" sticky chip — Studio Think yellow chrome */
export function StickyCta() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="fixed right-4 bottom-5 z-50 sm:right-8 sm:bottom-8"
    >
      <Link
        href="/escrever"
        className="inline-flex h-11 items-center gap-2 rounded-full border border-ink/10 bg-yellow px-5 text-[0.8rem] font-medium text-ink shadow-[0_12px_40px_-12px_rgba(32,31,29,0.45)] transition-transform hover:scale-[1.03] active:scale-[0.98]"
      >
        <span className="size-1.5 rounded-full bg-ink/80" aria-hidden />
        Escrever uma carta
      </Link>
    </motion.div>
  );
}
