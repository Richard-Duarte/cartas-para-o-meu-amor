"use client";

/**
 * Leva a próxima parte do formulário para perto do topo, logo abaixo do cabeçalho fixo.
 * Com `focusEmpty`, foca o primeiro campo vazio (o CEP) ainda dentro do toque, para o
 * iPhone abrir o teclado; quando o teclado sobe (visualViewport), confere se o campo
 * ficou visível. Movimento reduzido: pula direto, sem animação.
 */
export function scrollToSection(el: HTMLElement | null, focusEmpty: boolean) {
  if (!el || typeof window === "undefined") return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const behavior: ScrollBehavior = reduce ? "auto" : "smooth";
  const header = document.querySelector<HTMLElement>(".site-header");
  const headerBottom = () => (header ? Math.max(0, header.getBoundingClientRect().bottom) : 0);
  const field = focusEmpty
    ? Array.from(el.querySelectorAll<HTMLInputElement>("input:not([type=hidden]):not(:disabled)")).find(
        (input) => !input.value.trim(),
      )
    : undefined;
  if (field) {
    try {
      field.focus({ preventScroll: true });
    } catch {
      field.focus();
    }
  }
  // Mede depois que o cartão anterior fechou no resumo (a página encolhe nesse quadro).
  window.requestAnimationFrame(() =>
    window.requestAnimationFrame(() => {
      const top = el.getBoundingClientRect().top + window.scrollY - headerBottom() - 12;
      window.scrollTo({ top: Math.max(0, top), behavior });
    }),
  );
  const vv = window.visualViewport;
  if (!field || !vv) return;
  // Teclado aberto: o campo precisa caber na parte visível que sobrou.
  let done = false;
  const check = () => {
    if (done) return;
    done = true;
    vv.removeEventListener("resize", check);
    const r = field.getBoundingClientRect();
    const visibleBottom = vv.offsetTop + vv.height - 16;
    if (r.bottom > visibleBottom) window.scrollBy({ top: r.bottom - visibleBottom, behavior });
    else if (r.top < headerBottom() + 8) window.scrollBy({ top: r.top - headerBottom() - 8, behavior });
  };
  vv.addEventListener("resize", check);
  window.setTimeout(check, reduce ? 80 : 900);
}
