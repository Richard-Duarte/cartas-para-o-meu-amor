import Link from "next/link";
import { Feather } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DisplayTitle } from "@/components/display-title";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function EscreverPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-5 pt-28 pb-20 sm:px-8">
        <Card className="paper-shadow w-full max-w-lg rounded-2xl border border-[#E5D5C4]/80 bg-[#FFF8F0] ring-0">
          <CardHeader className="items-center space-y-4 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-blush/35 text-pink">
              <Feather className="size-6" aria-hidden />
            </div>
            <p className="section-kicker">Editor</p>
            <DisplayTitle as="h1" tracking="wide" className="text-2xl">
              Escrever uma carta
            </DisplayTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="rounded-2xl border border-dashed border-blush/50 bg-cream/70 px-5 py-12 text-sm leading-relaxed text-muted-foreground">
              Editor em breve — templates, mensageiros e preview chegam nos
              próximos passos. Por agora, guarde a ideia.
            </div>
            <Button
              nativeButton={false}
              render={<Link href="/" />}
              variant="outline"
              className="h-11 rounded-full border-gold/45 px-8 text-sm tracking-wide text-ink hover:bg-gold/10"
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
