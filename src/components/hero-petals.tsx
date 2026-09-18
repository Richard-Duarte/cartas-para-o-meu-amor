"use client";

import { motion } from "framer-motion";

const PETALS = [
  { left: "8%", top: "18%", size: 10, delay: 0, color: "#E8A0B0" },
  { left: "18%", top: "62%", size: 8, delay: 2.2, color: "#F0C4A8" },
  { left: "78%", top: "22%", size: 12, delay: 1.1, color: "#E8A0B0" },
  { left: "88%", top: "55%", size: 9, delay: 3.4, color: "#C4A35A" },
  { left: "12%", top: "40%", size: 7, delay: 4.5, color: "#E8A090" },
  { left: "72%", top: "70%", size: 11, delay: 0.8, color: "#F0C4A8" },
  { left: "45%", top: "12%", size: 6, delay: 5.2, color: "#E8A0B0" },
  { left: "55%", top: "78%", size: 8, delay: 1.8, color: "#C4A35A" },
];

/** Subtle floating heart petals / paper scraps for hero ambiance. */
export function HeroPetals() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {PETALS.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-[40%_60%_55%_45%]"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size * 0.85,
            background: p.color,
            opacity: 0.35,
          }}
          animate={{
            y: [0, -40, -80, -120],
            x: [0, 8, -6, 4],
            rotate: [0, 15, -10, 25],
            opacity: [0, 0.45, 0.35, 0],
          }}
          transition={{
            duration: 14 + i,
            delay: p.delay,
            repeat: Infinity,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      ))}
      {/* Tiny paper scraps */}
      {[
        { left: "22%", top: "28%", rotate: -12 },
        { left: "68%", top: "38%", rotate: 18 },
        { left: "40%", top: "72%", rotate: -8 },
      ].map((s, i) => (
        <motion.span
          key={`scrap-${i}`}
          className="absolute h-3 w-5 rounded-sm bg-[#F5E6DC] opacity-40 shadow-sm"
          style={{ left: s.left, top: s.top, rotate: s.rotate }}
          animate={{ y: [0, -18, 0], rotate: [s.rotate, s.rotate + 6, s.rotate] }}
          transition={{
            duration: 8 + i * 2,
            repeat: Infinity,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      ))}
    </div>
  );
}
