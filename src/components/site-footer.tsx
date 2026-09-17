import Link from "next/link";
import { DisplayTitle } from "@/components/display-title";

export function SiteFooter() {
  return (
    <footer className="border-t border-[#E5D5C4]/70 bg-transparent">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-12 sm:flex-row sm:items-end sm:justify-between sm:px-8">
        <div className="max-w-sm">
          <DisplayTitle
            as="p"
            tracking="wide"
            weight="medium"
            className="text-[0.65rem] text-ink/70"
          >
            Cartas para o meu amor
          </DisplayTitle>
          <p className="mt-3 font-heading text-sm leading-relaxed text-muted-foreground italic">
            Feito com intenção — palavras lindas, entregues com carinho.
          </p>
        </div>
        <div className="flex gap-6 text-xs tracking-[0.18em] text-muted-foreground uppercase">
          <Link href="/login" className="transition-colors hover:text-pink">
            Entrar
          </Link>
          <Link href="/escrever" className="transition-colors hover:text-pink">
            Escrever
          </Link>
        </div>
      </div>
    </footer>
  );
}
