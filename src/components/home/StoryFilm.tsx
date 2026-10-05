"use client";

import { motion } from "framer-motion";

export function StoryFilm() {
  return (
    <section className="story-film">
      <div className="story-film-media">
        <video
          autoPlay
          muted
          loop
          playsInline
          poster="/media/criativo-poster.jpg"
          className="story-film-video"
        >
          <source src="/media/criativo.mp4" type="video/mp4" />
        </video>
      </div>
      <div className="story-film-copy">
        <p className="section-kicker">A chegada</p>
        <motion.h2
          className="story-film-title"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          Alguém bateu na janela.
        </motion.h2>
        <motion.p
          className="story-film-text"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          Não foi uma notificação. Foi um pombo no parapeito, uma carta no bico, e o tempo
          inteiro do mundo para abrir. No fim da rua, o jegue, o cisne, a cegonha, o cavalo,
          a tartaruga e o avião já carregavam o resto.
        </motion.p>
        <p className="story-film-note">Sete mensageiros. Um só destino: quem você ama.</p>
      </div>
    </section>
  );
}
