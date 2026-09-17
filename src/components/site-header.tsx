import Link from "next/link";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DisplayTitle } from "@/components/display-title";

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#E5D5C4]/60 bg-cream/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 text-ink">
          <span className="flex size-8 items-center justify-center rounded-full bg-pink/12 text-pink">
            <Heart className="size-3.5 fill-current" aria-hidden />
          </span>
          <DisplayTitle
            as="span"
            tracking="wide"
            weight="medium"
            className="hidden text-[0.65rem] sm:inline"
          >
            Cartas
          </DisplayTitle>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Button
            nativeButton={false}
            render={<Link href="/login" />}
            variant="ghost"
            className="text-sm text-muted-foreground hover:bg-transparent hover:text-ink"
          >
            Entrar
          </Button>
          <Button
            nativeButton={false}
            render={<Link href="/escrever" />}
            className="h-9 rounded-full bg-pink px-5 text-sm font-medium tracking-wide text-primary-foreground shadow-[0_8px_24px_-10px_rgba(232,90,122,0.7)] hover:bg-pink/90"
          >
            Começar
          </Button>
        </nav>
      </div>
    </header>
  );
}
