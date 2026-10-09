import { createFileRoute, Link } from "@tanstack/react-router";
import { CinematicHero } from "@/components/home/CinematicHero";
import { MessengerMarquee } from "@/components/home/MessengerMarquee";
import { MessengerShowcase } from "@/components/home/MessengerShowcase";
import { RitualSteps } from "@/components/home/RitualSteps";
import { StoryFilm } from "@/components/home/StoryFilm";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ClotheslineSection } from "@/components/letters/ClotheslineGallery";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <div className="min-h-dvh">
      <div className="home-top">
        <SiteHeader className="is-ghost" />
        <CinematicHero />
      </div>
      <main>
        <MessengerMarquee />
        <StoryFilm />
        <RitualSteps />
        <div id="mensageiros">
          <MessengerShowcase />
        </div>
        <ClotheslineSection className="border-y border-line bg-paper/50" />
        <section className="closing-cta">
          <p className="section-kicker">Agora</p>
          <h2>A saudade tem endereço. A carta também.</h2>
          <p>
            Escreva hoje. Escolha o bicho. Deixe o mapa contar o resto — até pousar
            nas mãos certas.
          </p>
          <Link to="/escrever" className="closing-cta-btn">
            Escrever uma carta
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
