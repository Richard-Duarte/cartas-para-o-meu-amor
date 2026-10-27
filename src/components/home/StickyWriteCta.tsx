"use client";

import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Botão "Escrever uma carta" fixo no polegar (celular), depois que o vídeo de abertura sai
 * da tela. Some perto do convite final para não repetir o mesmo botão.
 */
export function StickyWriteCta() {
  const [show, setShow] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    const hero = document.querySelector(".cinematic-hero");
    const ends = Array.from(document.querySelectorAll(".closing-cta, .site-footer"));
    if (!hero || typeof IntersectionObserver !== "function") return;
    let heroVisible = true;
    const endVisible = new Set<Element>();
    const update = () => setShow(!heroVisible && endVisible.size === 0);
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === hero) heroVisible = entry.isIntersecting;
        else if (entry.isIntersecting) endVisible.add(entry.target);
        else endVisible.delete(entry.target);
      }
      update();
    });
    io.observe(hero);
    ends.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          key="sticky-write"
          className="home-sticky-cta"
          // Entra e sai deslizando devagar (sem "pulo"); com movimento reduzido, só esmaece.
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
          transition={{ duration: reduce ? 0.2 : 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link to="/escrever" className="home-sticky-cta-btn">
            Escrever uma carta
          </Link>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
