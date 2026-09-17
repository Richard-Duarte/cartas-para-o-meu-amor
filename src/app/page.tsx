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
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -top-24 right-0 size-72 rounded-full bg-blush/40 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-0 size-64 rounded-full bg-gold/20 blur-3xl" />

          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24">
            <FadeIn className="space-y-6">
              <p className="inline-flex items-center gap-2 rounded-full border border-blush/50 bg-card/70 px-3 py-1 text-xs tracking-[0.2em] text-pink uppercase">
                <Link2 className="size-3.5" aria-hidden />
                Entrega com afeto
              </p>
              <DisplayTitle className="text-3xl leading-tight sm:text-4xl lg:text-5xl">
                Cartas para o meu amor
              </DisplayTitle>
              <p className="max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
                Escreva uma carta romântica, escolha um mensageiro e envie um
                link especial — feito para derreter corações, com calma e
                beleza.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  nativeButton={false}
                  render={<Link href="/escrever" />}
                  size="lg"
                  className="h-11 rounded-full bg-pink px-6 text-primary-foreground hover:bg-pink/90"
                >
                  Escrever uma carta
                </Button>
                <Button
                  nativeButton={false}
                  render={<a href="#mensageiros" />}
                  variant="outline"
                  size="lg"
                  className="h-11 rounded-full border-gold/50 bg-transparent text-ink hover:bg-gold/10"
                >
                  Ver mensageiros
                </Button>
              </div>
            </FadeIn>

            <FadeIn delay={0.15}>
              <InterleavingAnimals />
            </FadeIn>
          </div>
        </section>

        <section className="border-y border-blush/25 bg-card/40 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <FadeIn className="mb-10 max-w-xl">
              <DisplayTitle as="h2" className="text-2xl sm:text-3xl">
                Como funciona
              </DisplayTitle>
              <p className="mt-3 text-muted-foreground">
                Quatro passos suaves — do sentimento ao envio.
              </p>
            </FadeIn>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, index) => (
                <FadeIn key={step.title} delay={index * 0.08}>
                  <Card className="h-full border-none bg-cream/80 ring-blush/30">
                    <CardHeader>
                      <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-pink/15 text-pink">
                        <step.Icon className="size-5" aria-hidden />
                      </div>
                      <CardTitle className="font-display tracking-[0.14em] uppercase">
                        {index + 1}. {step.title}
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        {step.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        <section id="mensageiros" className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <FadeIn className="mb-10 max-w-xl">
              <DisplayTitle as="h2" className="text-2xl sm:text-3xl">
                Mensageiros
              </DisplayTitle>
              <p className="mt-3 text-muted-foreground">
                Cada um com seu tempo, humor e preço — valores ilustrativos.
              </p>
            </FadeIn>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {MESSENGERS.map((messenger, index) => (
                <FadeIn key={messenger.name} delay={index * 0.08}>
                  <Card className="h-full border-none bg-card ring-gold/25">
                    <CardHeader>
                      <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blush/40 to-gold/20 text-pink">
                        <messenger.Icon className="size-8" />
                      </div>
                      <CardTitle className="font-display tracking-[0.14em] uppercase">
                        {messenger.name}
                      </CardTitle>
                      <CardDescription>{messenger.blurb}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-end justify-between gap-3 pt-0">
                      <div>
                        <p className="text-xs tracking-widest text-muted-foreground uppercase">
                          Tempo
                        </p>
                        <p className="font-medium text-ink">{messenger.time}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs tracking-widest text-muted-foreground uppercase">
                          A partir de
                        </p>
                        <p className="font-display text-lg tracking-[0.12em] text-pink">
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

        <section className="pb-20">
          <FadeIn className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <div className="rounded-[2rem] border border-blush/40 bg-gradient-to-br from-blush/30 via-cream to-gold/20 px-6 py-12 sm:px-10">
              <DisplayTitle as="h2" className="text-2xl sm:text-3xl">
                Pronto para escrever?
              </DisplayTitle>
              <p className="mx-auto mt-4 max-w-md text-muted-foreground">
                Comece agora. O editor, o mapa e o pagamento chegam nos
                próximos passos — por enquanto, sonhe com a carta.
              </p>
              <Button
                nativeButton={false}
                  render={<Link href="/escrever" />}
                size="lg"
                className="mt-8 h-11 rounded-full bg-pink px-8 text-primary-foreground hover:bg-pink/90"
              >
                Escrever uma carta
              </Button>
            </div>
          </FadeIn>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
