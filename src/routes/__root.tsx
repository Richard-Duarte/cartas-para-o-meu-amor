import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthProvider } from "@/lib/auth/provider";
import { KeyboardLift } from "@/components/layout/KeyboardLift";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { bootCatalog } from "@/lib/catalog";
import { pingVisit } from "@/lib/server/shop";
import appCss from "../styles.css?url";

const APP_NAME = "Carta para o meu amor";

function Boot() {
  useEffect(() => {
    void bootCatalog();
    void pingVisit({ data: window.location.pathname }).catch(() => {});
  }, []);
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
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
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
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
