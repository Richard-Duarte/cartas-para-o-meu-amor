"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQ_COLUMNS = [
  [
    {
      q: "Como funciona a entrega?",
      a: "Você escreve a carta, escolhe um mensageiro e compartilha um link especial com quem ama. A jornada no mapa chega em breve.",
    },
    {
      q: "Os preços são reais?",
      a: "Por enquanto os valores são ilustrativos. Pagamento com Stripe vem nos próximos passos.",
    },
  ],
  [
    {
      q: "Posso escolher o mensageiro?",
      a: "Sim — pombo, cavalo, jegue ou instantâneo. Cada um com seu tempo e humor.",
    },
    {
      q: "Preciso criar conta?",
      a: "Ainda não. Autenticação chega depois; por agora explore e sonhe com a carta.",
    },
  ],
  [
    {
      q: "A carta fica privada?",
      a: "O link é pensado para quem você escolher. Controles finos de privacidade vêm depois.",
    },
    {
      q: "Funciona no celular?",
      a: "Sim. A experiência é mobile-first, do rascunho ao compartilhamento.",
    },
  ],
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b-2 border-foreground">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-bold uppercase"
        aria-expanded={open}
      >
        <span>{q}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 transition-transform duration-300",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <p className="pb-4 font-serif text-sm leading-relaxed text-muted-foreground">
          {a}
        </p>
      )}
    </div>
  );
}

export function FaqAccordion() {
  return (
    <section id="faq" className="scroll-mt-24 px-5 py-16 md:px-20">
      <h2 className="heading-md mb-10 text-center">
        Perguntas
        <br />
        frequentes
      </h2>
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-start md:grid-cols-3 md:gap-x-8">
        {FAQ_COLUMNS.map((column, colIndex) => (
          <div key={colIndex}>
            {column.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
