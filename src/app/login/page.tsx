import Link from "next/link";
import { ArrowRight } from "lucide-react";
import AiButton from "@/components/ui/ai-button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-5 py-16 sm:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-3 text-center">
            <p className="nav-text text-muted-foreground">Conta</p>
            <h1 className="heading-md">Entrar</h1>
            <p className="font-serif text-muted-foreground">Em breve</p>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <p className="font-serif text-sm leading-relaxed text-muted-foreground">
              Autenticação e conta pessoal ainda não estão disponíveis neste
              passo. Volte para a página inicial e explore o visual.
            </p>
            <AiButton
              nativeButton={false}
              render={<Link href="/" />}
              className="w-full"
            >
              Voltar ao início
              <ArrowRight />
            </AiButton>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
