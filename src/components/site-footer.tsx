import Link from "next/link";
import { DisplayTitle } from "@/components/display-title";

export function SiteFooter() {
  return (
    <footer className="border-t border-blush/30 bg-cream">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <DisplayTitle as="p" className="text-xs tracking-[0.22em]">
            Cartas para o meu amor
          </DisplayTitle>
          <p className="mt-2 text-sm text-muted-foreground">
            Feito com carinho para quem merece palavras lindas.
          </p>
        </div>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <Link href="/login" className="hover:text-pink">
            Entrar
          </Link>
          <Link href="/escrever" className="hover:text-pink">
            Escrever
          </Link>
        </div>
      </div>
    </footer>
  );
}
