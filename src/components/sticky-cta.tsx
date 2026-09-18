"use client";

import Link from "next/link";
import { Feather } from "lucide-react";
import { motion } from "framer-motion";

/** Soft persistent CTA — romantic, not loud SaaS. */
export function StickyCta() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="fixed right-4 bottom-5 z-50 sm:right-8 sm:bottom-8"
    >
      <Link
        href="/escrever"
        className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background shadow-[var(--shadow-lift)] transition-transform duration-300 hover:scale-[1.03]"
        style={{ transitionTimingFunction: "var(--ease-romantic)" }}
      >
        <Feather className="size-3.5 opacity-80" />
        Escrever
      </Link>
    </motion.div>
  );
}
