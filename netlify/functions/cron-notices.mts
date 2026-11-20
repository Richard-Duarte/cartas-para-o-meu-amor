/**
 * Netlify scheduled function: hits the existing /api/cron/notices route
 * (Vercel cron stays in vercel.json; this file is ignored there).
 * 0 15 * * * UTC = 12:00 in America/Sao_Paulo.
 */
export default async () => {
  const base = (
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    "https://cartaparaomeuamor.com.br"
  ).replace(/\/+$/, "");
  const res = await fetch(`${base}/api/cron/notices`);
  if (!res.ok) {
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
