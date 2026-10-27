"use client";

import { useEffect, type RefObject } from "react";

/**
 * Mede quanto da tela uma barra fixa no rodapé ocupa e publica isso numa variável CSS
 * (ex.: `--app-bar-space`), para o conteúdo reservar o espaço exato embaixo dela.
 *
 * Conta a altura da barra (com a área segura do iPhone, que já entra no padding dela) e
 * (modo "viewport") também o que sobra entre a barra e o fim da tela: no Safari 26 e no Chrome do iOS a
 * barra do navegador flutua e a página rola por baixo dela, então o fim do conteúdo
 * precisa subir até acima da nossa barra, não só até a borda de baixo.
 * No modo "height" publica só a altura (barras que flutuam dentro de um painel).
 */
export function useBarSpace(
  ref: RefObject<HTMLElement | null>,
  name = "--app-bar-space",
  mode: "viewport" | "height" = "viewport",
) {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;
    const root = document.documentElement;
    let frame = 0;
    let last = -1;

    const measure = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      // Escondida (desktop ou teclado aberto): mantém o último valor para não pular a página.
      if (rect.height === 0) return;
      const vv = window.visualViewport;
      const screenBottom = Math.max(
        window.innerHeight,
        root.clientHeight,
        vv ? vv.height + vv.offsetTop : 0,
      );
      const space = Math.ceil(mode === "height" ? rect.height : Math.max(rect.height, screenBottom - rect.top));
      if (space !== last) {
        last = space;
        root.style.setProperty(name, `${space}px`);
      }
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    measure();
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(schedule) : null;
    ro?.observe(el);
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    window.addEventListener("scroll", schedule, { passive: true });
    window.visualViewport?.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("scroll", schedule);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      ro?.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      window.removeEventListener("scroll", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
      root.style.removeProperty(name);
    };
  }, [ref, name, mode]);
}
