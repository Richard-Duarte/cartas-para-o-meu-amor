import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DisplayTitle } from "@/components/display-title";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function LoginPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-5 pt-28 pb-20 sm:px-8">
        <Card className="paper-shadow w-full max-w-md rounded-2xl border border-[#E8DDD0] bg-paper ring-0">
          <CardHeader className="space-y-4 text-center">
            <p className="section-kicker">Conta</p>
            <DisplayTitle as="h1" className="text-3xl sm:text-4xl">
              Entrar
            </DisplayTitle>
            <p className="font-hand text-xl text-ink/45">em breve</p>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Autenticação e conta pessoal ainda não estão disponíveis neste
              passo. Volte para a página inicial e explore o visual.
            </p>
            <Button
              nativeButton={false}
              render={<Link href="/" />}
              className="h-11 rounded-full bg-yellow px-8 text-sm font-medium text-ink hover:bg-[#f3f06a]"
            >
              Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
