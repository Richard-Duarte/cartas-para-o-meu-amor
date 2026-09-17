import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import AiButton from "@/components/ui/ai-button";
import { FeatureCycler } from "@/components/feature-cycler";
import { FaqAccordion } from "@/components/faq-accordion";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StickyCta } from "@/components/sticky-cta";
import { TestimonialsStrip } from "@/components/testimonials-strip";
import {
  CavaloIcon,
  InstantaneoIcon,
  JegueIcon,
  PomboIcon,
} from "@/components/messenger-icons";
import { cn } from "@/lib/utils";

const HERO_COLUMNS = [
  {
    name: "Pombo",
    title1: "Pombo",
    title2: "correio",
    desc: "Elegante e clássico, para cartas que merecem asas.",
    href: "/escrever",
    bg: "#cf4c67",
    text: "text-white",
    muted: "text-white/80",
    label: "text-white/80",
    ctaVariant: "outline-white" as const,
    hoverTint: "hover:text-[#cf4c67]!",
  },
  {
    name: "Cavalo",
    title1: "Cavalo",
    title2: "nobre",
    desc: "Rápido e ousado, com um toque de aventura.",
    href: "/escrever",
    bg: "#273FF5",
    text: "text-white",
    muted: "text-white/80",
    label: "text-white/80",
    ctaVariant: "outline-white" as const,
    hoverTint: "hover:text-[#273FF5]!",
  },
  {
    name: "Jegue",
    title1: "Jegue",
    title2: "devagar",
    desc: "A espera também é romance — humor no caminho.",
    href: "/escrever",
    bg: "#27F56C",
    text: "text-[#064c1f]",
    muted: "text-[#064c1f]/80",
    label: "text-[#064c1f]/70",
    ctaVariant: "outline" as const,
    hoverTint: "border-[#064c1f] text-[#064c1f] hover:bg-[#064c1f] hover:text-white",
  },
  {
    name: "Instantâneo",
    title1: "Flash",
    title2: "agora",
    desc: "Chega na hora, com um brilho de ouro e estrelas.",
    href: "/escrever",
    bg: "#F5A027",
    text: "text-[#3a1f00]",
    muted: "text-[#3a1f00]/80",
    label: "text-[#3a1f00]/70",
    ctaVariant: "outline" as const,
    hoverTint: "border-[#3a1f00] text-[#3a1f00] hover:bg-[#3a1f00] hover:text-white",
  },
];

const MESSENGERS = [
  {
    name: "Pombo",
    description: "Elegante e clássico",
    price: "R$ 12",
    period: "/carta",
    meta: "2–3 dias",
    features: ["Entrega com asas", "Link especial", "Tom clássico"],
    highlighted: false,
    Icon: PomboIcon,
  },
  {
    name: "Cavalo",
    description: "Rápido e nobre",
    price: "R$ 24",
    period: "/carta",
    meta: "1 dia",
    features: ["Galope expresso", "Toque de aventura", "Link especial"],
    highlighted: true,
    Icon: CavaloIcon,
  },
  {
    name: "Jegue",
    description: "Devagar e com humor",
    price: "R$ 8",
    period: "/carta",
    meta: "5–7 dias",
    features: ["Espera romântica", "Humor no caminho", "Link especial"],
    highlighted: false,
    Icon: JegueIcon,
  },
  {
    name: "Instantâneo",
    description: "Na hora, com flash",
    price: "R$ 36",
    period: "/carta",
    meta: "Na hora",
    features: ["Entrega imediata", "Brilho de ouro", "Link especial"],
    highlighted: false,
    Icon: InstantaneoIcon,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        {/* Hero — 4 messenger columns */}
        <section className="flex min-h-[80vh] flex-col md:flex-row md:flex-wrap xl:flex-nowrap">
          {HERO_COLUMNS.map((col) => (
            <Link
              key={col.name}
              href={col.href}
              className="group relative flex min-h-[40vh] flex-1 flex-col items-center justify-center p-8 text-center transition-transform duration-300 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50 md:min-h-[50vh] md:basis-1/2 xl:min-h-0 xl:basis-0"
              style={{ backgroundColor: col.bg }}
            >
              <span
                className={cn(
                  "mb-4 text-sm uppercase tracking-widest md:text-base",
                  col.label,
                )}
              >
                Cartas
              </span>
              <h2
                className={cn(
                  "text-4xl font-extrabold uppercase leading-[0.9] md:text-5xl lg:text-6xl",
                  col.text,
                )}
              >
                {col.title1}
                <br />
                {col.title2}
              </h2>
              <p
                className={cn(
                  "mt-4 max-w-xs font-serif text-base md:text-lg",
                  col.muted,
                )}
              >
                {col.desc}
              </p>
              <AiButton
                size="lg"
                variant={col.ctaVariant}
                className={cn(
                  "mt-8 opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                  col.hoverTint,
                )}
                tabIndex={-1}
              >
                Escrever
                <ArrowRight />
              </AiButton>
            </Link>
          ))}
        </section>

        <FeatureCycler />

        <TestimonialsStrip />

        {/* Mensageiros — QuizHub pricing cards */}
        <section id="mensageiros" className="scroll-mt-24 px-5 py-16 md:px-20">
          <h2 className="heading-md text-center">Mensageiros</h2>
          <p className="mt-2 mb-10 text-center font-serif text-muted-foreground">
            Cada um com seu tempo, humor e preço — valores ilustrativos.
          </p>
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {MESSENGERS.map((tier) => (
              <div
                key={tier.name}
                className={cn(
                  "relative flex flex-col rounded-3xl border-2 border-foreground bg-card p-8 transition-shadow duration-200",
                  tier.highlighted && "shadow-lg ring-2 ring-primary md:-translate-y-2",
                )}
              >
                {tier.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-foreground bg-primary px-3 py-1 text-xs font-bold uppercase text-foreground">
                    Popular
                  </span>
                )}
                <div className="mb-4 flex size-12 items-center justify-center rounded-full border-2 border-foreground bg-background">
                  <tier.Icon className="size-6" />
                </div>
                <h3 className="text-lg font-bold uppercase">{tier.name}</h3>
                <p className="mt-1 font-serif text-sm text-muted-foreground">
                  {tier.description} · {tier.meta}
                </p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold tracking-tight">
                    {tier.price}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {tier.period}
                  </span>
                </div>
                <AiButton
                  nativeButton={false}
                  render={<Link href="/escrever" />}
                  variant={tier.highlighted ? "default" : "outline"}
                  className="mt-8 w-full"
                >
                  Escolher
                  <ArrowRight />
                </AiButton>
                <div className="mt-8 border-t-2 border-foreground pt-8">
                  <ul className="flex flex-col gap-3">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-3">
                        <Check className="mt-0.5 size-4 shrink-0 text-foreground" />
                        <span className="font-serif text-sm text-muted-foreground">
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        <FaqAccordion />

        {/* CTA Banner */}
        <section className="relative py-20 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-0 bg-[radial-gradient(ellipse_at_center,var(--color-primary)/0.18,transparent_60%)]"
          />
          <div className="relative">
            <h2 className="heading-lg">Pronto para escrever?</h2>
            <p className="mt-4 font-serif text-lg text-muted-foreground">
              Escolha um mensageiro e envie uma carta que derrete corações.
            </p>
            <AiButton
              nativeButton={false}
              render={<Link href="/escrever" />}
              size="lg"
              className="mt-8"
            >
              Escrever uma carta
              <ArrowRight />
            </AiButton>
          </div>
        </section>
      </main>
      <SiteFooter />
      <StickyCta />
    </div>
  );
}
