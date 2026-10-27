"use client";

import { Link, useRouterState } from "@tanstack/react-router";
import { LogoMark } from "@/components/layout/LogoMark";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-row">
        <Link to="/" className="site-footer-brand">
          <LogoMark className="h-9 w-10" />
          <span>Carta para o meu amor</span>
        </Link>
        <nav className="site-footer-nav" aria-label="Informações">
          <Link to="/" hash="app">
            Baixe o app
          </Link>
          <Link to="/termos">Termos de Uso</Link>
          <Link to="/privacidade">Privacidade</Link>
          <a href="mailto:contato.cartaparaomeuamor@gmail.com">Contato</a>
        </nav>
      </div>
      <p className="site-footer-note">Papel, selo e um bicho a caminho.</p>
    </footer>
  );
}

/** Rodapé em todas as páginas (o painel /admin tem layout próprio). */
export function GlobalFooter() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (path.startsWith("/admin")) return null;
  return <SiteFooter />;
}
