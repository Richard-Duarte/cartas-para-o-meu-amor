/**
 * Prévia de link (Open Graph + Twitter/X). Para trocar o domínio depois
 * (ex.: https://cartaparaomeuamor.com.br), defina VITE_SITE_ORIGIN na Vercel
 * ou altere o valor padrão abaixo.
 */
export const SITE_ORIGIN = (
  (import.meta.env.VITE_SITE_ORIGIN as string | undefined) || "https://cartas-para-o-meu-amor.vercel.app"
).replace(/\/+$/, "");

export const SITE_NAME = "Carta para o meu amor";
export const SITE_TAGLINE = "O correio mais lento. O recado mais certo.";
export const SITE_DESCRIPTION =
  "O correio mais lento. O recado mais certo. Escreva uma carta, escolha um mensageiro e acompanhe a entrega no mapa.";

/** Arquivo versionado: troque o nome (v3, v4…) quando mudar a imagem. */
export const SHARE_IMAGE_PATH = "/og/og-cartas-v2.jpg";

export function absoluteUrl(path: string): string {
  return `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

export function shareMeta({
  title = SITE_NAME,
  description = SITE_DESCRIPTION,
  path = "/",
}: { title?: string; description?: string; path?: string } = {}) {
  const image = absoluteUrl(SHARE_IMAGE_PATH);
  return [
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:locale", content: "pt_BR" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: absoluteUrl(path) },
    { property: "og:image", content: image },
    { property: "og:image:secure_url", content: image },
    { property: "og:image:type", content: "image/jpeg" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    {
      property: "og:image:alt",
      content: `${SITE_NAME}: envelope com coração e os mensageiros (pombo, cavalo, tartaruga, cegonha, cisne e burrinho). ${SITE_TAGLINE}`,
    },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
    { name: "twitter:image:alt", content: `${SITE_NAME}. ${SITE_TAGLINE}` },
  ];
}
