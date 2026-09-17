"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

/** Floating CTA — QuizHub filled button chrome */
export function StickyCta() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.5, ease: [0.34, 1, 0.64, 1] }}
      className="fixed right-4 bottom-5 z-50 sm:right-8 sm:bottom-8"
    >
      <Link
        href="/escrever"
        className="btn-filled shadow-lg"
      >
        Escrever
        <ArrowRight className="size-4" />
      </Link>
    </motion.div>
  );
}
