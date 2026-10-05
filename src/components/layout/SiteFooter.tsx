"use client";

import { Link } from "@tanstack/react-router";
import { LogoMark } from "@/components/layout/LogoMark";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-row">
        <Link to="/" className="site-footer-brand">
          <LogoMark className="h-9 w-10" />
          <span>Carta para o meu amor</span>
        </Link>
        <nav className="site-footer-nav">
          <Link to="/escrever">Escrever</Link>
          <Link to="/">Mensageiros</Link>
        </nav>
      </div>
      <p className="site-footer-note">Papel, selo e um bicho a caminho.</p>
    </footer>
  );
}
