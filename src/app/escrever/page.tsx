import Link from "next/link";
import { ArrowRight, Feather } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function EscreverPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="relative flex flex-1 items-center justify-center px-5 py-16 sm:px-8">
        <div
          aria-hidden
          className="ambient-wash right-1/4 top-1/3 h-[280px] w-[280px]"
          style={{ background: "var(--wash-gold)" }}
        />
        <div
          aria-hidden
          className="ambient-wash left-1/4 bottom-1/4 h-[240px] w-[240px]"
          style={{ background: "var(--wash-blush)" }}
        />
        <Card className="relative w-full max-w-lg">
          <CardHeader className="items-center space-y-4 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-accent text-primary">
              <Feather className="size-6" aria-hidden />
            </div>
            <p className="eyebrow">Editor</p>
            <h1 className="heading-md">Escrever uma carta</h1>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="rounded-2xl border border-dashed border-foreground/12 bg-[#FEF5EC]/80 px-5 py-12 text-sm leading-relaxed text-muted-foreground">
              Editor em breve — templates, mensageiros e preview chegam nos
              próximos passos. Por agora, guarde a ideia no coração.
            </div>
            <Link href="/" className="btn-transparent w-full justify-center">
              Voltar ao início
              <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
