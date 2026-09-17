import Link from "next/link";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DisplayTitle } from "@/components/display-title";

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-blush/30 bg-cream/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-ink">
          <span className="flex size-8 items-center justify-center rounded-full bg-pink/15 text-pink">
            <Heart className="size-4 fill-current" aria-hidden />
          </span>
          <DisplayTitle as="span" className="hidden text-xs tracking-[0.22em] sm:inline">
            Cartas
          </DisplayTitle>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          <Button
            nativeButton={false}
            render={<Link href="/login" />}
            variant="ghost"
            className="text-ink hover:bg-blush/30 hover:text-ink"
          >
            Entrar
          </Button>
          <Button
            nativeButton={false}
            render={<Link href="/escrever" />}
            className="bg-pink text-primary-foreground hover:bg-pink/90"
          >
            Começar
          </Button>
        </nav>
      </div>
    </header>
  );
}
