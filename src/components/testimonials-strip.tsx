"use client";

import { CyclerNav } from "@/components/cycler-nav";
import { useAutoCycle } from "@/hooks/use-auto-cycle";
import { cn } from "@/lib/utils";

const REVIEWS = [
  {
    quote: "Chegou como um segredo doce. Chorei na primeira linha.",
    who: "Marina",
    title: "São Paulo",
  },
  {
    quote: "O jegue demorou — e a espera fez tudo mais especial.",
    who: "Thiago",
    title: "Rio de Janeiro",
  },
  {
    quote: "Parece papel de verdade. Intenção em cada detalhe.",
    who: "Lívia",
    title: "Belo Horizonte",
  },
  {
    quote: "Mandamos no pombo. Ele guardou o link como tesouro.",
    who: "Ana & Leo",
    title: "Casal",
  },
];

export function TestimonialsStrip() {
  const cycle = useAutoCycle(REVIEWS.length);

  return (
    <section id="depoimentos" className="scroll-mt-24 overflow-hidden py-16">
      <h2 className="heading-md mb-8 text-center">Cartinhas recebidas</h2>
      <div className="relative overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{
            gap: "8px",
            transform: `translateX(calc(50% - 160px - ${cycle.active * 328}px))`,
          }}
        >
          {REVIEWS.map((review, i) => (
            <article
              key={review.who}
              role="button"
              tabIndex={0}
              onClick={() => cycle.setActive(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  cycle.setActive(i);
                }
              }}
              className={cn(
                "flex w-[320px] shrink-0 cursor-pointer flex-col rounded-3xl p-6 transition-all duration-500 focus-visible:ring-2 focus-visible:ring-foreground focus-visible:outline-none",
                i === cycle.active
                  ? "border-2 border-foreground bg-card shadow-sm"
                  : "border-2 border-transparent bg-muted/50 opacity-60",
              )}
            >
              <blockquote className="flex-1 text-center font-serif text-sm leading-relaxed text-foreground">
                &ldquo;{review.quote}&rdquo;
              </blockquote>
              <div className="mt-5 flex flex-col items-center text-center">
                <span className="text-sm font-bold">{review.who}</span>
                <span className="text-xs text-muted-foreground">{review.title}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="mt-8">
        <CyclerNav
          items={REVIEWS.map((_, i) => ({ id: String(i), label: i + 1 }))}
          active={cycle.active}
          progress={cycle.progress}
          paused={cycle.paused}
          onSelect={cycle.setActive}
          onTogglePause={cycle.togglePause}
          variant="light"
        />
      </div>
    </section>
  );
}
