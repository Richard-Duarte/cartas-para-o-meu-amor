import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-foreground/6 bg-[#FBF6F0]/85 backdrop-blur-md">
      <div className="flex items-center justify-between gap-6 px-5 py-4 md:px-12 md:py-5 lg:px-20">
        <Link
          href="/"
          className="font-[family-name:var(--font-fraunces)] text-xl font-medium tracking-tight text-foreground md:text-2xl"
        >
          Cartas
          <span className="hidden font-normal text-muted-foreground sm:inline">
            {" "}
            para o meu amor
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <a href="#como-funciona" className="nav-text">
            Como funciona
          </a>
          <a href="#mensageiros" className="nav-text">
            Mensageiros
          </a>
          <Link href="/login" className="nav-text">
            Entrar
          </Link>
        </nav>

        <Link href="/escrever" className="btn-filled !px-5 !py-2.5 text-[13px]">
          Começar
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </header>
  );
}
