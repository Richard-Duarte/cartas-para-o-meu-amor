"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Heart, PenLine, Share2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { HeroPetals } from "@/components/hero-petals";
import { InterleavingAnimals } from "@/components/interleaving-animals";
import { FadeIn } from "@/components/motion/fade-in";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StickyCta } from "@/components/sticky-cta";
import { MESSENGERS } from "@/lib/messengers";

const easeRomantic = [0.22, 1, 0.36, 1] as const;

const STEPS = [
  {
    n: "01",
    title: "Escreva com o coração",
    body: "Despeje o que às vezes fica preso na garganta. Sem pressa, sem filtros — só você e o papel.",
    icon: PenLine,
  },
  {
    n: "02",
    title: "Escolha quem leva",
    body: "Pombo, cavalo, tartaruga, cegonha, ganso ou avião. Cada um com seu tempo e sua personalidade.",
    icon: Sparkles,
  },
  {
    n: "03",
    title: "Envie o link",
    body: "Compartilhe um presente digital. A pessoa abre, lê e sente que alguém pensou nela de verdade.",
    icon: Share2,
  },
  {
    n: "04",
    title: "O amor chega",
    body: "Acompanhe a jornada do mensageiro. A espera vira ritual — e a leitura, um momento só de vocês.",
    icon: Heart,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        {/* ── 1. Hero ─────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          {/* Ambient washes */}
          <div
            aria-hidden
            className="ambient-wash -left-20 -top-10 h-[420px] w-[420px]"
            style={{ background: "var(--wash-blush)" }}
          />
          <div
            aria-hidden
            className="ambient-wash -right-16 top-32 h-[380px] w-[380px]"
            style={{ background: "var(--wash-gold)" }}
          />
          <div
            aria-hidden
            className="ambient-wash bottom-0 left-1/3 h-[280px] w-[280px]"
            style={{ background: "var(--wash-peach)" }}
          />
          <HeroPetals />

          <div className="relative mx-auto flex max-w-5xl flex-col items-center px-5 pb-16 pt-14 text-center md:px-12 md:pb-24 md:pt-20 lg:px-20">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: easeRomantic }}
              className="eyebrow"
            >
              Entrega com afeto
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.1, ease: easeRomantic }}
              className="heading-xl mt-5 max-w-3xl"
            >
              Uma carta encontra
              <br className="hidden sm:block" /> o caminho até
              <br className="hidden sm:block" /> quem você ama.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.25, ease: easeRomantic }}
              className="prose-romantic mt-6 max-w-xl"
            >
              Escreva o que o coração guarda. Escolha um mensageiro. Deixe a
              espera virar romance — e a leitura, um presente inesquecível.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4, ease: easeRomantic }}
              className="mt-9 flex flex-wrap items-center justify-center gap-3"
            >
              <Link href="/escrever" className="btn-filled">
                Escrever uma carta
                <ArrowRight className="size-4" />
              </Link>
              <a href="#mensageiros" className="btn-transparent">
                Conhecer os mensageiros
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.35, ease: easeRomantic }}
              className="mt-12 w-full md:mt-16"
            >
              <InterleavingAnimals />
            </motion.div>
          </div>
        </section>

        {/* ── 2. Como funciona ────────────────────────────────── */}
        <section
          id="como-funciona"
          className="scroll-mt-24 border-t border-foreground/5 bg-[#FEF5EC]/60 px-5 py-20 md:px-12 md:py-28 lg:px-20"
        >
          <FadeIn className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">O ritual</p>
            <h2 className="heading-lg mt-3">Como uma carta ganha vida</h2>
            <p className="prose-romantic mx-auto mt-4 max-w-lg">
              Quatro passos simples. O resto é sentimento.
            </p>
          </FadeIn>

          <div className="mx-auto mt-14 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <FadeIn key={step.n} delay={i * 0.08}>
                <article className="paper-card card-hover flex h-full flex-col p-6 md:p-7">
                  <div className="mb-5 flex items-center justify-between">
                    <span className="eyebrow text-primary/80">{step.n}</span>
                    <span className="flex size-9 items-center justify-center rounded-full bg-accent text-foreground/70">
                      <step.icon className="size-4" aria-hidden />
                    </span>
                  </div>
                  <h3 className="heading-sm text-lg">{step.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </article>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── 3. Mensageiros ──────────────────────────────────── */}
        <section
          id="mensageiros"
          className="scroll-mt-24 px-5 py-20 md:px-12 md:py-28 lg:px-20"
        >
          <FadeIn className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">Companheiros de rota</p>
            <h2 className="heading-lg mt-3">Os mensageiros</h2>
            <p className="prose-romantic mx-auto mt-4 max-w-lg">
              Seis personalidades. Seis tempos. Escolha quem leva o que só você
              sabe dizer.
            </p>
          </FadeIn>

          <div className="mx-auto mt-14 grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {MESSENGERS.map((m, i) => (
              <FadeIn key={m.id} delay={i * 0.06}>
                <Link
                  href="/escrever"
                  className="paper-card card-hover group flex h-full flex-col overflow-hidden"
                >
                  <div
                    className="relative flex aspect-[4/3] items-center justify-center overflow-hidden"
                    style={{ background: m.accentSoft }}
                  >
                    <div
                      className="relative size-[72%] transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-2"
                      style={{
                        filter: "drop-shadow(0 16px 32px rgba(42,33,28,0.14))",
                        transitionTimingFunction: "var(--ease-romantic)",
                      }}
                    >
                      <Image
                        src={m.image}
                        alt={m.name}
                        fill
                        sizes="(max-width: 640px) 90vw, (max-width: 1024px) 40vw, 280px"
                        className="object-contain"
                      />
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-[family-name:var(--font-fraunces)] text-xl font-medium tracking-tight">
                        {m.name}
                      </h3>
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: m.accent }}
                        aria-hidden
                      />
                    </div>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {m.personality}
                    </p>
                    <div className="mt-5 flex items-center justify-between border-t border-foreground/6 pt-4 text-sm">
                      <span className="text-muted-foreground">{m.time}</span>
                      <span className="font-medium text-foreground">
                        {m.price}
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          /carta
                        </span>
                      </span>
                    </div>
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── 4. Momento emocional ────────────────────────────── */}
        <section className="relative overflow-hidden border-y border-foreground/5 bg-[#FEF5EC] px-5 py-24 md:px-12 md:py-32 lg:px-20">
          <div
            aria-hidden
            className="ambient-wash left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2"
            style={{ background: "var(--wash-blush)" }}
          />
          <FadeIn className="relative mx-auto max-w-3xl text-center">
            <p className="eyebrow">Por que escrever</p>
            <blockquote className="mt-6 font-[family-name:var(--font-fraunces)] text-2xl font-medium leading-snug tracking-tight text-foreground md:text-4xl md:leading-[1.25]">
              &ldquo;Uma mensagem some no feed.
              <br />
              Uma carta fica — no bolso, na gaveta,
              <br className="hidden sm:block" /> no coração.&rdquo;
            </blockquote>
            <p className="prose-romantic mx-auto mt-8 max-w-md">
              Em um mundo de respostas rápidas, escolher escrever é um gesto
              raro. É dizer: você merece meu tempo.
            </p>
          </FadeIn>
        </section>

        {/* ── 5. Final CTA ────────────────────────────────────── */}
        <section className="relative px-5 py-24 md:px-12 md:py-32 lg:px-20">
          <div
            aria-hidden
            className="ambient-wash -right-10 top-10 h-[300px] w-[300px]"
            style={{ background: "var(--wash-gold)" }}
          />
          <FadeIn className="relative mx-auto max-w-2xl text-center">
            <div className="paper-card mx-auto max-w-xl px-8 py-14 md:px-12 md:py-16">
              <div
                aria-hidden
                className="mx-auto mb-8 flex size-16 items-center justify-center rounded-2xl bg-accent"
              >
                <span className="font-[family-name:var(--font-fraunces)] text-3xl text-primary">
                  ✉
                </span>
              </div>
              <p className="eyebrow">O envelope espera</p>
              <h2 className="heading-lg mt-3">
                Comece a carta
                <br />
                que alguém vai guardar.
              </h2>
              <p className="prose-romantic mx-auto mt-5 max-w-sm">
                Abra o editor. Escolha o mensageiro. Deixe o amor encontrar o
                caminho.
              </p>
              <Link href="/escrever" className="btn-filled mt-9 inline-flex">
                Escrever uma carta
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </FadeIn>
        </section>
      </main>
      <SiteFooter />
      <StickyCta />
    </div>
  );
}
