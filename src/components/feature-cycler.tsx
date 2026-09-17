"use client";

import { CyclerNav } from "@/components/cycler-nav";
import { InterleavingAnimals } from "@/components/interleaving-animals";
import { useAutoCycle } from "@/hooks/use-auto-cycle";

const FEATURE_TABS = [
  {
    id: "escreva",
    label: "Escreva",
    heading: { line1: "Despeje o coração", line2: "em uma carta delicada" },
  },
  {
    id: "visual",
    label: "Visual",
    heading: { line1: "Escolha o visual", line2: "com carinho e estilo" },
  },
  {
    id: "mensageiro",
    label: "Mensageiro",
    heading: { line1: "Envie com um", line2: "mensageiro especial" },
  },
  {
    id: "acompanhe",
    label: "Acompanhe",
    heading: { line1: "Compartilhe o link", line2: "e siga a jornada" },
  },
];

export function FeatureCycler() {
  const cycle = useAutoCycle(FEATURE_TABS.length);
  const current = FEATURE_TABS[cycle.active];

  return (
    <section id="como-funciona" className="relative w-full scroll-mt-24">
      <img
        src="https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=2400"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-black/45" aria-hidden />
      <div className="relative px-5 pt-12 pb-12 md:px-20 md:pb-20 lg:pt-16">
        <div className="mb-10 text-center">
          <CyclerNav
            items={FEATURE_TABS.map((t) => ({ id: t.id, label: t.label }))}
            active={cycle.active}
            progress={cycle.progress}
            paused={cycle.paused}
            onSelect={cycle.setActive}
            onTogglePause={cycle.togglePause}
          />
          <h2 className="heading-lg mt-8 text-white drop-shadow-lg">
            {current.heading.line1}
            <br />
            {current.heading.line2}
          </h2>
        </div>
        <InterleavingAnimals word="CARTAS" className="mx-auto" />
      </div>
    </section>
  );
}
