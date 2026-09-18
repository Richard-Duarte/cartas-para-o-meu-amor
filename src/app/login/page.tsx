import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="relative flex flex-1 items-center justify-center px-5 py-16 sm:px-8">
        <div
          aria-hidden
          className="ambient-wash left-1/2 top-1/4 h-[320px] w-[320px] -translate-x-1/2"
          style={{ background: "var(--wash-blush)" }}
        />
        <Card className="relative w-full max-w-md">
          <CardHeader className="space-y-3 text-center">
            <p className="eyebrow">Conta</p>
            <h1 className="heading-md">Entrar</h1>
            <p className="text-muted-foreground">Em breve</p>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Autenticação e conta pessoal ainda não estão disponíveis neste
              passo. Volte para a página inicial e explore o visual.
            </p>
            <Link href="/" className="btn-filled w-full justify-center">
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
