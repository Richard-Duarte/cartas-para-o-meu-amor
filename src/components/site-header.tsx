import Link from "next/link";
import { ArrowRight } from "lucide-react";
import AiButton from "@/components/ui/ai-button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-foreground/5 bg-background">
      <div className="flex items-center justify-between gap-6 px-5 py-5 md:px-20 md:py-6">
        <Link
          href="/"
          className="font-serif text-2xl font-bold italic md:text-3xl"
        >
          Cartas
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="#como-funciona"
            className="nav-text transition-opacity hover:opacity-70"
          >
            Como funciona
          </a>
          <a
            href="#mensageiros"
            className="nav-text transition-opacity hover:opacity-70"
          >
            Mensageiros
          </a>
          <a
            href="#depoimentos"
            className="nav-text transition-opacity hover:opacity-70"
          >
            Cartinhas
          </a>
          <Link
            href="/login"
            className="nav-text transition-opacity hover:opacity-70"
          >
            Entrar
          </Link>
        </nav>

        <AiButton
          nativeButton={false}
          render={<Link href="/escrever" />}
          size="sm"
        >
          Começar
          <ArrowRight />
        </AiButton>
      </div>
    </header>
  );
}
