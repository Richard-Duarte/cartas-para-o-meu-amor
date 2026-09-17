"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function useSaoPauloClock() {
  const [time, setTime] = useState("—:—");

  useEffect(() => {
    const format = () =>
      new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date());

    setTime(format());
    const id = window.setInterval(() => setTime(format()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return time;
}

export function SiteHeader() {
  const time = useSaoPauloClock();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#E8DDD0]/80 bg-cream/90 backdrop-blur-md">
      <div className="site-gutter mx-auto flex h-[58px] max-w-[1400px] items-center justify-between gap-4">
        <div className="flex min-w-0 items-baseline gap-3">
          <Link
            href="/"
            className="font-display text-[1.35rem] leading-none tracking-[-0.03em] text-ink"
          >
            Cartas.
          </Link>
          <span className="font-hand hidden text-[1.05rem] text-ink/55 sm:inline">
            São Paulo · {time}
          </span>
        </div>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
          <a
            href="#como-funciona"
            className="text-[0.8rem] font-medium text-ink/70 transition-colors hover:text-ink"
          >
            Como funciona
          </a>
          <a
            href="#mensageiros"
            className="text-[0.8rem] font-medium text-ink/70 transition-colors hover:text-ink"
          >
            Mensageiros
          </a>
          <a
            href="#depoimentos"
            className="text-[0.8rem] font-medium text-ink/70 transition-colors hover:text-ink"
          >
            Cartinhas
          </a>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            nativeButton={false}
            render={<Link href="/login" />}
            variant="ghost"
            className="hidden h-9 px-3 text-[0.8rem] text-ink/65 hover:bg-transparent hover:text-ink sm:inline-flex"
          >
            Entrar
          </Button>
          <Button
            nativeButton={false}
            render={<Link href="/escrever" />}
            size="sm"
            className="h-10 rounded-full bg-yellow px-5 text-[0.8rem] font-medium text-ink shadow-none hover:bg-[#f3f06a]"
          >
            Escrever
          </Button>
        </div>
      </div>
    </header>
  );
}
