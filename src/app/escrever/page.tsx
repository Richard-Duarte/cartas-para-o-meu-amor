import Link from "next/link";
import { ArrowRight, Feather } from "lucide-react";
import AiButton from "@/components/ui/ai-button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function EscreverPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-5 py-16 sm:px-8">
        <Card className="w-full max-w-lg">
          <CardHeader className="items-center space-y-4 text-center">
            <div className="flex size-14 items-center justify-center rounded-full border-2 border-foreground bg-background text-foreground">
              <Feather className="size-6" aria-hidden />
            </div>
            <p className="nav-text text-muted-foreground">Editor</p>
            <h1 className="heading-md">Escrever uma carta</h1>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="rounded-3xl border-2 border-dashed border-foreground/40 bg-background/40 px-5 py-12 font-serif text-sm leading-relaxed text-muted-foreground">
              Editor em breve — templates, mensageiros e preview chegam nos
              próximos passos. Por agora, guarde a ideia.
            </div>
            <AiButton
              nativeButton={false}
              render={<Link href="/" />}
              variant="outline"
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
