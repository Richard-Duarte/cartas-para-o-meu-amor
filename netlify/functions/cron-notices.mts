/**
 * Netlify scheduled function: hits the existing /api/cron/notices route
 * (Vercel cron stays in vercel.json; this file is ignored there).
 * 0 15 * * * UTC = 12:00 in America/Sao_Paulo.
 *
 * Prefer DEPLOY_URL (unique *.netlify.app permalink) so this does not depend
 * on custom-domain DNS. URL / DEPLOY_PRIME_URL can already be the apex domain.
 */
export default async () => {
  const base = (
    process.env.DEPLOY_URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.URL ||
    "https://cartas-para-o-meu-amor.netlify.app"
  ).replace(/\/+$/, "");
  const res = await fetch(`${base}/api/cron/notices`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[cron-notices]", res.status, body.slice(0, 200));
    return new Response(`cron failed: ${res.status}`, { status: 500 });
  }
  return new Response(await res.text(), {
    status: 200,
    headers: { "content-type": res.headers.get("content-type") || "application/json" },
  });
};

export const config = {
  schedule: "0 15 * * *",
};
