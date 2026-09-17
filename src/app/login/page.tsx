import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DisplayTitle } from "@/components/display-title";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function LoginPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 pt-24 pb-16">
        <Card className="w-full max-w-md border-none bg-card/90 ring-blush/40">
          <CardHeader className="text-center">
            <DisplayTitle as="h1" className="text-xl tracking-[0.2em]">
              Entrar
            </DisplayTitle>
            <CardTitle className="mt-2 font-sans text-base font-normal text-muted-foreground">
              Em breve
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Autenticação e conta pessoal ainda não estão disponíveis neste
              passo. Volte para a página inicial e explore o visual.
            </p>
            <Button
              nativeButton={false}
                  render={<Link href="/" />}
              className="rounded-full bg-pink text-primary-foreground hover:bg-pink/90"
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
