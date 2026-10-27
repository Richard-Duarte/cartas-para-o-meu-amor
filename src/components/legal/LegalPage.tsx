import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const CONTACT_EMAIL = "contato.cartaparaomeuamor@gmail.com";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="legal-page">
        <h1>{title}</h1>
        <p className="legal-updated">Atualizado em {updated}</p>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
