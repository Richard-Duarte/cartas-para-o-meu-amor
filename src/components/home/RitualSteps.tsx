"use client";

import { motion } from "framer-motion";

const STEPS = [
  {
    n: "01",
    t: "Escreva o que não cabe no zap",
    d: "Uma carta curta, longa, ou um desenho. Ninguém mais lê — só quem você escolheu.",
  },
  {
    n: "02",
    t: "Escolha o mensageiro",
    d: "Pombo para a pressa. Tartaruga para o teatro. Avião se o peito não aguenta esperar.",
  },
  {
    n: "03",
    t: "Acompanhe até pousar",
    d: "No mapa o bicho percorre o caminho. Se você estiver olhando, vê a chegada.",
  },
];

export function RitualSteps() {
  return (
    <section className="ritual">
      <p className="section-kicker">O rito</p>
      <h2 className="ritual-title">Três gestos. Uma carta a caminho.</h2>
      <div className="ritual-grid">
        {STEPS.map((s, i) => (
          <motion.article
            key={s.n}
            className="ritual-card"
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="ritual-n">{s.n}</p>
            <h3>{s.t}</h3>
            <p>{s.d}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
