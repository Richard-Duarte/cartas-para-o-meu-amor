import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-ink text-cream">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(254,245,236,1) 1px, transparent 1px), linear-gradient(90deg, rgba(254,245,236,1) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
        aria-hidden
      />

      <div className="site-gutter relative mx-auto grid max-w-[1400px] gap-12 py-16 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10 lg:py-20">
        <div className="lg:col-span-2">
          <p className="font-display text-3xl tracking-[-0.03em] sm:text-4xl">
            Cartas.
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-cream/60">
            Palavras lindas, entregues com intenção. Um studio digital de
            cartas românticas — feito à mão, no ritmo do coração.
          </p>
          <p className="font-hand mt-6 text-xl text-yellow">
            entrega com afeto ♡
          </p>
        </div>

        <div>
          <p className="section-kicker text-cream/45">Produto</p>
          <ul className="mt-4 space-y-3 text-sm text-cream/75">
            <li>
              <Link href="/escrever" className="transition-colors hover:text-yellow">
                Escrever uma carta
              </Link>
            </li>
            <li>
              <a href="#mensageiros" className="transition-colors hover:text-yellow">
                Mensageiros
              </a>
            </li>
            <li>
              <a href="#como-funciona" className="transition-colors hover:text-yellow">
                Como funciona
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="section-kicker text-cream/45">Conta</p>
          <ul className="mt-4 space-y-3 text-sm text-cream/75">
            <li>
              <Link href="/login" className="transition-colors hover:text-yellow">
                Entrar
              </Link>
            </li>
            <li>
              <span className="text-cream/40">Mapa — em breve</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="site-gutter relative mx-auto flex max-w-[1400px] flex-col gap-3 border-t border-cream/10 py-6 text-xs text-cream/40 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Cartas para o meu amor</p>
        <p className="font-hand text-base text-cream/50">feito com intenção</p>
      </div>
    </footer>
  );
}
