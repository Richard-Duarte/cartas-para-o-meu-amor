import Link from "next/link";
import {
  Feather,
  Heart,
  Link2,
  MapPin,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DisplayTitle } from "@/components/display-title";
import { FadeIn } from "@/components/fade-in";
import { InterleavingAnimals } from "@/components/interleaving-animals";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  CavaloIcon,
  InstantaneoIcon,
  JegueIcon,
  PomboIcon,
} from "@/components/messenger-icons";

const STEPS = [
  {
    title: "Escreva",
    description: "Despeje o coração em uma carta delicada, no seu ritmo.",
    Icon: Feather,
  },
  {
    title: "Escolha o visual",
    description: "Templates românticos com tipografia e texturas suaves.",
    Icon: Sparkles,
  },
  {
    title: "Envie com um mensageiro",
    description: "Pombo, cavalo, jegue ou entrega instantânea — você decide.",
    Icon: Heart,
  },
  {
    title: "Compartilhe e acompanhe",
    description: "Um link especial e, em breve, o mapa da jornada.",
    Icon: MapPin,
  },
];

const MESSENGERS = [
  {
    name: "Pombo",
    blurb: "Elegante e clássico, para cartas que merecem asas.",
    time: "2–3 dias",
    price: "R$ 12",
    Icon: PomboIcon,
  },
  {
    name: "Cavalo",
    blurb: "Rápido e nobre, com um toque de aventura.",
    time: "1 dia",
    price: "R$ 24",
    Icon: CavaloIcon,
  },
  {
    name: "Jegue",
    blurb: "Devagar e com humor — a espera também é romance.",
    time: "5–7 dias",
    price: "R$ 8",
    Icon: JegueIcon,
  },
  {
    name: "Instantâneo",
    blurb: "Chega na hora, com um flash de ouro e estrelas.",
    time: "Na hora",
    price: "R$ 36",
    Icon: InstantaneoIcon,
  },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 pt-16">
        {/* Hero — asymmetric: text left, craft object right */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -top-32 right-0 size-80 rounded-full bg-blush/30 blur-3xl" />
          <div className="pointer-events-none absolute bottom-8 left-0 size-72 rounded-full bg-gold/15 blur-3xl" />

          <div className="mx-auto grid max-w-6xl gap-16 px-5 py-20 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-20 lg:py-28">
            <FadeIn className="space-y-8">
              <p className="section-kicker inline-flex items-center gap-2 rounded-full border border-blush/45 bg-[#FFF8F0]/80 px-3.5 py-1.5">
                <Link2 className="size-3 text-pink" aria-hidden />
                Entrega com afeto
              </p>

              <DisplayTitle
                tracking="wide"
                weight="bold"
                className="max-w-lg text-4xl leading-[1.15] sm:text-5xl lg:text-[3.35rem]"
              >
                Cartas para o meu amor
              </DisplayTitle>

              <p className="max-w-md font-heading text-base leading-relaxed text-muted-foreground sm:text-lg sm:leading-relaxed">
                Escreva com intenção. Escolha um mensageiro. Envie um link
                especial — feito à mão digital, para derreter corações.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Button
                  nativeButton={false}
                  render={<Link href="/escrever" />}
                  size="lg"
                  className="h-12 rounded-full bg-pink px-8 text-sm font-medium tracking-wide text-primary-foreground shadow-[0_12px_32px_-12px_rgba(232,90,122,0.75)] hover:bg-pink/90"
                >
                  Escrever uma carta
                </Button>
                <Button
                  nativeButton={false}
                  render={<a href="#mensageiros" />}
                  variant="outline"
                  size="lg"
                  className="h-12 rounded-full border-gold/45 bg-transparent px-6 text-sm tracking-wide text-ink hover:bg-gold/10"
                >
                  Ver mensageiros
                </Button>
              </div>
            </FadeIn>

            <FadeIn delay={0.12} className="lg:justify-self-end lg:w-full">
              <InterleavingAnimals />
            </FadeIn>
          </div>
        </section>

        {/* Como funciona */}
        <section className="border-y border-[#E5D5C4]/70 bg-[#FFF8F0]/45 py-24 sm:py-28">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <FadeIn className="mb-14 max-w-xl space-y-4">
              <p className="section-kicker">Como funciona</p>
              <DisplayTitle as="h2" tracking="display" className="text-3xl sm:text-4xl">
                Do sentimento ao envio
              </DisplayTitle>
              <p className="font-heading text-muted-foreground italic">
                Quatro passos suaves — sem pressa, com cuidado.
              </p>
            </FadeIn>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {STEPS.map((step, index) => (
                <FadeIn key={step.title} delay={index * 0.07}>
                  <Card className="paper-shadow h-full rounded-2xl border border-[#E5D5C4]/80 bg-cream/90 ring-0">
                    <CardHeader className="gap-3">
                      <div className="mb-1 flex size-11 items-center justify-center rounded-full bg-pink/12 text-pink">
                        <step.Icon className="size-5" aria-hidden />
                      </div>
                      <p className="text-[0.6rem] tracking-[0.28em] text-gold uppercase">
                        Passo {index + 1}
                      </p>
                      <CardTitle className="font-display text-sm tracking-[0.18em] uppercase">
                        {step.title}
                      </CardTitle>
                      <CardDescription className="leading-relaxed text-muted-foreground">
                        {step.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Mensageiros */}
        <section id="mensageiros" className="py-24 sm:py-28">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <FadeIn className="mb-14 max-w-xl space-y-4">
              <p className="section-kicker">Mensageiros</p>
              <DisplayTitle as="h2" tracking="display" className="text-3xl sm:text-4xl">
                Quem leva a carta
              </DisplayTitle>
              <p className="font-heading text-muted-foreground italic">
                Cada um com seu tempo, humor e preço — valores ilustrativos.
              </p>
            </FadeIn>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {MESSENGERS.map((messenger, index) => (
                <FadeIn key={messenger.name} delay={index * 0.07}>
                  <Card className="paper-shadow h-full rounded-2xl border border-[#E5D5C4]/80 bg-[#FFF8F0] ring-0">
                    <CardHeader>
                      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blush/35 to-gold/15 text-pink">
                        <messenger.Icon className="size-8" />
                      </div>
                      <CardTitle className="font-display text-sm tracking-[0.2em] uppercase">
                        {messenger.name}
                      </CardTitle>
                      <CardDescription className="leading-relaxed">
                        {messenger.blurb}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-end justify-between gap-3 pt-0">
                      <div>
                        <p className="text-[0.6rem] tracking-[0.22em] text-muted-foreground uppercase">
                          Tempo
                        </p>
                        <p className="mt-0.5 font-medium text-ink">{messenger.time}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[0.6rem] tracking-[0.22em] text-muted-foreground uppercase">
                          A partir de
                        </p>
                        <p className="font-display text-lg tracking-[0.14em] text-pink">
                          {messenger.price}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-28">
          <FadeIn className="mx-auto max-w-3xl px-5 text-center sm:px-8">
            <div className="paper-shadow rounded-[2rem] border border-blush/35 bg-gradient-to-br from-blush/25 via-cream to-gold/15 px-8 py-16 sm:px-14">
              <p className="section-kicker mb-5">Comece agora</p>
              <DisplayTitle as="h2" tracking="display" className="text-3xl sm:text-4xl">
                Pronto para escrever?
              </DisplayTitle>
              <p className="mx-auto mt-5 max-w-md font-heading text-muted-foreground italic">
                O editor, o mapa e o pagamento chegam nos próximos passos —
                por enquanto, sonhe com a carta.
              </p>
              <div className="mt-10">
                <Button
                  nativeButton={false}
                  render={<Link href="/escrever" />}
                  size="lg"
                  className="h-12 rounded-full bg-pink px-10 text-sm font-medium tracking-wide text-primary-foreground shadow-[0_12px_32px_-12px_rgba(232,90,122,0.75)] hover:bg-pink/90"
                >
                  Escrever uma carta
                </Button>
              </div>
            </div>
          </FadeIn>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
