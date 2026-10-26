// Depois de um deploy novo, uma aba aberta antes dele ainda aponta para os arquivos
// antigos (/assets/*-hash.js). Eles somem da Vercel e o import dinâmico falha
// ("Importing a module script failed." no Safari/Chrome do iPhone). O navegador guarda
// essa falha até recarregar, então tentar o import de novo na mesma página não adianta:
// recarregamos uma vez (com trava para não entrar em loop).

const KEY = "cartas-para-o-meu-amor:chunk-reload";
const WINDOW_MS = 60_000;

/** Recarrega a página uma vez por minuto no máximo. Retorna true se vai recarregar. */
export function reloadOnceForStaleChunks(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const last = Number(window.sessionStorage.getItem(KEY) || 0);
    if (Number.isFinite(last) && Date.now() - last < WINDOW_MS) return false;
    window.sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

/** Escuta o evento do Vite para imports dinâmicos que falharam. */
export function installChunkReload(): () => void {
  if (typeof window === "undefined") return () => {};
  const onPreloadError = (event: Event) => {
    if (reloadOnceForStaleChunks()) event.preventDefault();
  };
  window.addEventListener("vite:preloadError", onPreloadError);
  return () => window.removeEventListener("vite:preloadError", onPreloadError);
}
