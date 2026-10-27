import { GlobalFooter } from "@/components/layout/SiteFooter";
import { createRootRoute, HeadContent, Outlet, Scripts, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthProvider } from "@/lib/auth/provider";
import { KeyboardLift } from "@/components/layout/KeyboardLift";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { bootCatalog } from "@/lib/catalog";
import { shareMeta } from "@/lib/share-meta";
import { bootPwa } from "@/lib/pwa";
import { installChunkReload } from "@/lib/chunk-reload";
import { pingVisit } from "@/lib/server/shop";
import { bootTracking, trackPageView, TRACKING_ENABLED } from "@/lib/tracking";
import appCss from "../styles.css?url";

// Telas de abertura do app no iPhone/iPad (apple-touch-startup-image), só retrato.
const IOS_SPLASH: Array<[number, number, number, string]> = [
  [430, 932, 3, "/splash/splash-1290x2796-v2.png"],
  [440, 956, 3, "/splash/splash-1320x2868-v2.png"],
  [402, 874, 3, "/splash/splash-1206x2622-v2.png"],
  [393, 852, 3, "/splash/splash-1179x2556-v2.png"],
  [390, 844, 3, "/splash/splash-1170x2532-v2.png"],
  [428, 926, 3, "/splash/splash-1284x2778-v2.png"],
  [375, 812, 3, "/splash/splash-1125x2436-v2.png"],
  [414, 896, 3, "/splash/splash-1242x2688-v2.png"],
  [414, 896, 2, "/splash/splash-828x1792-v2.png"],
  [375, 667, 2, "/splash/splash-750x1334-v2.png"],
  [820, 1180, 2, "/splash/splash-1640x2360-v2.png"],
  [834, 1194, 2, "/splash/splash-1668x2388-v2.png"],
  [768, 1024, 2, "/splash/splash-1536x2048-v2.png"],
  [1024, 1366, 2, "/splash/splash-2048x2732-v2.png"],
];

const APP_NAME = "Carta para o meu amor";

function Boot() {
  useEffect(() => {
    void bootCatalog();
    void pingVisit({ data: window.location.pathname }).catch(() => {});
  }, []);
  // Aba aberta antes de um deploy: arquivos antigos somem e o import dinâmico falha.
  useEffect(() => installChunkReload(), []);
  // App instalável (Android/iOS): service worker + convite de instalação.
  useEffect(() => bootPwa(), []);
  // Pixels (Meta/TikTok) só com VITE_META_PIXEL_ID / VITE_TIKTOK_PIXEL_ID; sem eles, nada carrega.
  const router = useRouter();
  useEffect(() => {
    bootTracking();
    if (!TRACKING_ENABLED) return;
    // Só troca de página (pathname): mudar ?passo=… na mesma tela não é PageView.
    let last = window.location.pathname;
    trackPageView();
    return router.subscribe("onResolved", () => {
      const now = window.location.pathname;
      if (now === last) return;
      last = now;
      trackPageView();
    });
  }, [router]);
  return null;
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content" },
      { title: APP_NAME },
      {
        name: "description",
        content: "Escreva uma carta, escolha um mensageiro e acompanhe a entrega no mapa.",
      },
      { name: "theme-color", content: "#F6EDE4" },
      // Na tela de início abre como app (sem a barra do navegador).
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Carta" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "format-detection", content: "telephone=no" },
      ...shareMeta(),
    ],
    links: [
      // Ícones da logo oficial (envelope com coração). Nomes "-v2" furam o cache do ícone antigo.
      { rel: "icon", href: "/favicon.ico?v=2", sizes: "16x16 32x32 48x48" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/icons/favicon-32-v2.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/icons/favicon-16-v2.png" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest?v=2" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon-v2.png" },
      ...IOS_SPLASH.map(([w, h, d, href]) => ({
        rel: "apple-touch-startup-image",
        href,
        media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${d}) and (orientation: portrait)`,
      })),
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Alex+Brush&family=Allura&family=Caveat:wght@500;700&family=Cinzel:wght@400;600&family=Comfortaa:wght@400;700&family=Cookie&family=Cormorant+Garamond:ital,wght@0,500;0,700;1,500&family=DM+Sans:ital,wght@0,400;0,700;1,400&family=Dancing+Script:wght@400;700&family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=Figtree:wght@400;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Great+Vibes&family=Homemade+Apple&family=Indie+Flower&family=Karla:ital,wght@0,400;0,700;1,400&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,400;0,600;1,400&family=Marck+Script&family=Nunito:ital,wght@0,400;0,700;1,400&family=Outfit:wght@400;600;700&family=Pacifico&family=Parisienne&family=Pinyon+Script&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Quicksand:wght@400;600;700&family=Sacramento&family=Satisfy&family=Spectral:ital,wght@0,400;0,600;1,400&family=Tangerine:wght@400;700&family=Yeseva+One&display=swap",
      },
    ],
  }),
  component: () => (
    <html lang="pt-BR" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-dvh bg-cream font-sans text-ink">
        <PreviewHostBridge />
        <AuthProvider>
          <Boot />
          <KeyboardLift />
          <Outlet />
          <GlobalFooter />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
