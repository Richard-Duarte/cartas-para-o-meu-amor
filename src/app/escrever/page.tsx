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
      <main className="flex flex-1 items-center justify-center px-4 pt-24 pb-16">
        <Card className="w-full max-w-lg border-none bg-card/90 ring-gold/30">
          <CardHeader className="items-center text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-blush/40 text-pink">
              <Feather className="size-6" aria-hidden />
            </div>
            <DisplayTitle as="h1" className="text-xl tracking-[0.2em]">
              Escrever uma carta
            </DisplayTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="rounded-2xl border border-dashed border-blush/50 bg-cream/60 px-4 py-10 text-sm text-muted-foreground">
              Editor em breve — templates, mensageiros e preview chegam nos
              próximos passos.
            </div>
            <Button
              nativeButton={false}
                  render={<Link href="/" />}
              variant="outline"
              className="rounded-full border-pink/40 text-ink hover:bg-blush/20"
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
