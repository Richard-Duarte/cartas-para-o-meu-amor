# Domínio principal: cartaparaomeuamor.com.br

- **Endereço principal:** `https://cartaparaomeuamor.com.br` (`src/lib/site-url.ts`; troque com `VITE_SITE_URL`).
- **www → apex:** redirect 308 configurado no domínio da Vercel (Settings → Domains).
- **vercel.app → domínio:** redirect 308 em `vercel.json` (só para o host `cartas-para-o-meu-amor.vercel.app`; as prévias `*-richardduartesilvas-projects.vercel.app` não são afetadas). Caminho e query são mantidos.
  - Ficam **fora** do redirect (continuam respondendo no endereço antigo): `/api/auth/*` (callbacks OAuth), `/api/mercadopago/*` (webhook de pagamentos antigos), `/api/cron/*`, `/_serverFn/*` (abas abertas antes da troca) e `/sw.js`.
- **Login:** `BETTER_AUTH_URL=https://cartaparaomeuamor.com.br` em Production. `trustedOrigins` aceita o domínio, o www, o vercel.app e as prévias.
- **Links de carta e avisos:** `safeOrigin`/`publicOrigin` trocam o host antigo pelo principal; cartas antigas (com `share_origin` antigo) passam a avisar com o domínio novo. Sem migration.
