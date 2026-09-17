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
        <Card className="paper-shadow w-full max-w-md rounded-2xl border border-[#E5D5C4]/80 bg-[#FFF8F0] ring-0">
          <CardHeader className="space-y-4 text-center">
            <p className="section-kicker">Conta</p>
            <DisplayTitle as="h1" tracking="wide" className="text-2xl">
              Entrar
            </DisplayTitle>
            <p className="font-heading text-sm text-muted-foreground italic">
              Em breve
            </p>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Autenticação e conta pessoal ainda não estão disponíveis neste
              passo. Volte para a página inicial e explore o visual.
            </p>
            <Button
              nativeButton={false}
              render={<Link href="/" />}
              className="h-11 rounded-full bg-pink px-8 text-sm tracking-wide text-primary-foreground shadow-[0_10px_28px_-12px_rgba(232,90,122,0.7)] hover:bg-pink/90"
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
