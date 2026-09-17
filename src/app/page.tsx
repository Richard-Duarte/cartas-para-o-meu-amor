import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DisplayTitle } from "@/components/display-title";
import { FadeIn } from "@/components/fade-in";
import { InterleavingAnimals } from "@/components/interleaving-animals";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StickyCta } from "@/components/sticky-cta";
import {
  CavaloIcon,
  InstantaneoIcon,
  JegueIcon,
  PomboIcon,
} from "@/components/messenger-icons";

const STEPS = [
  {
    n: "01",
    title: "Escreva",
    description: "Despeje o coração em uma carta delicada, no seu ritmo.",
  },
  {
    n: "02",
    title: "Escolha o visual",
    description: "Templates românticos com tipografia e texturas suaves.",
  },
  {
    n: "03",
    title: "Envie com um mensageiro",
    description: "Pombo, cavalo, jegue ou entrega instantânea — você decide.",
  },
  {
    n: "04",
    title: "Compartilhe e acompanhe",
    description: "Um link especial e, em breve, o mapa da jornada.",
  },
];

const MESSENGERS = [
  {
    name: "Pombo",
    blurb: "Elegante e clássico, para cartas que merecem asas.",
    meta: "2–3 dias",
    price: "R$ 12",
    Icon: PomboIcon,
  },
  {
    name: "Cavalo",
    blurb: "Rápido e nobre, com um toque de aventura.",
    meta: "1 dia",
    price: "R$ 24",
    Icon: CavaloIcon,
  },
  {
    name: "Jegue",
    blurb: "Devagar e com humor — a espera também é romance.",
    meta: "5–7 dias",
    price: "R$ 8",
    Icon: JegueIcon,
  },
  {
    name: "Instantâneo",
    blurb: "Chega na hora, com um flash de ouro e estrelas.",
    meta: "Na hora",
    price: "R$ 36",
    Icon: InstantaneoIcon,
  },
];

const REVIEWS = [
  {
    quote: "Chegou como um segredo doce. Chorei na primeira linha.",
    who: "Marina · SP",
  },
  {
    quote: "O jegue demorou — e a espera fez tudo mais especial.",
    who: "Thiago · RJ",
  },
  {
    quote: "Parece papel de verdade. Intenção em cada detalhe.",
    who: "Lívia · BH",
  },
  {
    quote: "Mandamos no pombo. Ele guardou o link como tesouro.",
    who: "Ana & Leo",
  },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 pt-[58px]">
        {/* ── Hero — Studio Think centered structure ── */}
        <section className="relative overflow-hidden">
          {/* Hand-drawn corner annotations */}
          <p
            className="font-hand pointer-events-none absolute top-16 left-6 hidden rotate-[-8deg] text-xl text-ink/40 sm:block lg:left-12 lg:text-2xl"
            aria-hidden
          >
            ← drag →
          </p>
          <p
            className="font-hand pointer-events-none absolute top-24 right-6 hidden rotate-[7deg] text-xl text-ink/40 sm:block lg:right-14 lg:text-2xl"
            aria-hidden
          >
            confiança no caminho
          </p>
          <p
            className="font-hand pointer-events-none absolute bottom-8 left-1/4 hidden rotate-[-4deg] text-lg text-ink/35 md:block"
            aria-hidden
          >
            feito à mão digital ♡
          </p>

          <div className="site-gutter mx-auto flex max-w-[1100px] flex-col items-center px-5 pt-20 pb-8 text-center sm:pt-28 sm:pb-12">
            <FadeIn className="space-y-6">
              <p className="section-kicker">Entrega com afeto · São Paulo</p>

              <DisplayTitle
                as="h1"
                weight="bold"
                className="mx-auto max-w-4xl text-[clamp(2.75rem,8vw,5.75rem)] leading-[1.08]"
              >
                Cartas para o{" "}
                <span className="yellow-highlight inline">meu amor</span>
              </DisplayTitle>

              <p className="mx-auto max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
                Escreva com intenção. Escolha um mensageiro. Envie um link
                especial — paper craft digital, para derreter corações.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button
                  nativeButton={false}
                  render={<Link href="/escrever" />}
                  size="lg"
                  className="h-11 rounded-full bg-yellow px-8 text-sm font-medium text-ink hover:bg-[#f3f06a]"
                >
                  Escrever uma carta
                </Button>
                <Button
                  nativeButton={false}
                  render={<a href="#mensageiros" />}
                  variant="outline"
                  size="lg"
                  className="h-11 rounded-full border-ink/15 bg-transparent px-6 text-sm text-ink hover:bg-paper"
                >
                  Ver mensageiros
                </Button>
              </div>
            </FadeIn>

            <FadeIn delay={0.15} className="mt-16 w-full sm:mt-20">
              <InterleavingAnimals word="CARTAS" />
            </FadeIn>
          </div>
        </section>

        {/* ── Como funciona — oversized serif process rows ── */}
        <section
          id="como-funciona"
          className="site-gutter mx-auto max-w-[1100px] py-24 sm:py-32 lg:py-36"
        >
          <FadeIn className="mb-16 max-w-2xl space-y-3">
            <p className="section-kicker">Processo</p>
            <DisplayTitle as="h2" className="text-4xl sm:text-5xl lg:text-6xl">
              Como funciona
            </DisplayTitle>
            <p className="font-hand text-2xl text-ink/50">
              quatro passos suaves — sem pressa
            </p>
          </FadeIn>

          <div className="divide-y divide-[#E8DDD0] border-y border-[#E8DDD0]">
            {STEPS.map((step, index) => (
              <FadeIn key={step.n} delay={index * 0.06}>
                <div className="group grid gap-4 py-10 sm:grid-cols-[5rem_1fr_1.2fr] sm:items-baseline sm:gap-8 lg:py-12">
                  <span className="font-sans text-sm font-medium tracking-[0.12em] text-ink/35">
                    {step.n}
                  </span>
                  <DisplayTitle
                    as="h3"
                    weight="medium"
                    className="text-3xl sm:text-4xl lg:text-[2.75rem]"
                  >
                    {step.title}
                  </DisplayTitle>
                  <p className="max-w-md text-base leading-relaxed text-muted-foreground sm:justify-self-end sm:text-right">
                    {step.description}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── Mensageiros — Ocha menu rows on cream panel ── */}
        <section
          id="mensageiros"
          className="site-gutter mx-auto max-w-[1100px] pb-24 sm:pb-32 lg:pb-36"
        >
          <FadeIn className="mb-12 max-w-2xl space-y-3">
            <p className="section-kicker">Cardápio</p>
            <DisplayTitle as="h2" className="text-4xl sm:text-5xl lg:text-6xl">
              Mensageiros
            </DisplayTitle>
            <p className="text-muted-foreground">
              Cada um com seu tempo, humor e preço — valores ilustrativos.
            </p>
          </FadeIn>

          <FadeIn>
            <div className="overflow-hidden rounded-[1.5rem] border border-[#E8DDD0] bg-paper paper-shadow">
              <ul className="divide-y divide-[#E8DDD0]">
                {MESSENGERS.map((m) => (
                  <li
                    key={m.name}
                    className="flex flex-col gap-4 px-6 py-8 transition-colors hover:bg-cream/60 sm:flex-row sm:items-center sm:gap-6 sm:px-10 sm:py-9"
                  >
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-[#E8DDD0] bg-cream text-pink/80">
                      <m.Icon className="size-8" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <DisplayTitle
                        as="h3"
                        weight="medium"
                        className="text-2xl sm:text-3xl lg:text-4xl"
                      >
                        {m.name}
                      </DisplayTitle>
                      <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                        {m.blurb}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-baseline justify-between gap-8 sm:flex-col sm:items-end sm:justify-center sm:gap-1">
                      <span className="font-hand text-lg text-ink/45">
                        {m.meta}
                      </span>
                      <span className="font-display text-xl tracking-[-0.02em] text-ink sm:text-2xl">
                        {m.price}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>
        </section>

        {/* ── Depoimentos — drifting overlapping cards ── */}
        <section
          id="depoimentos"
          className="overflow-hidden border-y border-[#E8DDD0]/80 bg-paper/50 py-24 sm:py-32"
        >
          <div className="site-gutter mx-auto mb-12 max-w-[1100px]">
            <FadeIn className="space-y-3">
              <p className="section-kicker">Cartinhas recebidas</p>
              <DisplayTitle as="h2" className="text-4xl sm:text-5xl">
                O que dizem
              </DisplayTitle>
            </FadeIn>
          </div>

          <div className="relative">
            <div className="flex gap-5 overflow-x-auto px-[max(1.25rem,calc((100%-1100px)/2+1rem))] pb-6 scroll-px-5 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {REVIEWS.map((review, i) => (
                <FadeIn
                  key={review.who}
                  delay={i * 0.08}
                  className="w-[280px] shrink-0 snap-start sm:w-[320px]"
                  style={{
                    marginTop: i % 2 === 0 ? 0 : 28,
                    rotate: `${i % 2 === 0 ? -1.5 : 2}deg`,
                  }}
                >
                  <article className="paper-shadow flex h-full flex-col justify-between rounded-2xl border border-[#E8DDD0] bg-cream p-7 sm:p-8">
                    <p className="font-display text-xl leading-snug tracking-[-0.02em] text-ink sm:text-2xl">
                      “{review.quote}”
                    </p>
                    <p className="font-hand mt-8 text-lg text-ink/50">
                      — {review.who}
                    </p>
                  </article>
                </FadeIn>
              ))}
              {/* Peek next card hint */}
              <div className="w-16 shrink-0 sm:w-24" aria-hidden />
            </div>
          </div>
        </section>

        {/* ── Dark final CTA — Studio Think "Let's work together" ── */}
        <section className="site-gutter mx-auto max-w-[1100px] py-24 sm:py-32 lg:py-36">
          <FadeIn>
            <div className="relative overflow-hidden rounded-[1.75rem] bg-ink px-8 py-16 text-cream sm:px-14 sm:py-20 lg:px-20">
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.06]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(254,245,236,1) 1px, transparent 1px), linear-gradient(90deg, rgba(254,245,236,1) 1px, transparent 1px)",
                  backgroundSize: "48px 48px",
                }}
                aria-hidden
              />
              <div className="relative mx-auto max-w-2xl text-center">
                <p className="font-hand text-2xl text-yellow">vamos começar?</p>
                <DisplayTitle
                  as="h2"
                  className="mt-4 text-4xl text-cream sm:text-5xl lg:text-6xl"
                >
                  Pronto para escrever?
                </DisplayTitle>
                <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-cream/55">
                  O editor, o mapa e o pagamento chegam nos próximos passos —
                  por enquanto, sonhe com a carta.
                </p>
                <div className="mt-10">
                  <Button
                    nativeButton={false}
                    render={<Link href="/escrever" />}
                    size="lg"
                    className="h-12 rounded-full bg-yellow px-10 text-sm font-medium text-ink hover:bg-[#f3f06a]"
                  >
                    Escrever uma carta
                  </Button>
                </div>
              </div>
            </div>
          </FadeIn>
        </section>
      </main>
      <SiteFooter />
      <StickyCta />
    </>
  );
}
