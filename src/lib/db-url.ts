/**
 * Postgres em serverless: cada instância da Vercel abre o próprio pool. No pooler do
 * Supabase em "session mode" (porta 5432) cada conexão ocupa um cliente até fechar, e o
 * limite (pool_size 15) estoura: login e checkout passam a dar 500 (EMAXCONNSESSION).
 * Aqui usamos o "transaction mode" do mesmo pooler (porta 6543), feito para serverless,
 * e pools pequenos que soltam conexões ociosas. `DB_SESSION_POOLER=1` desliga a troca.
 */
export function serverlessDbUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  if (process.env.DB_SESSION_POOLER === "1") return url;
  try {
    const u = new URL(url);
    if (u.hostname.endsWith(".pooler.supabase.com") && (u.port === "5432" || u.port === "")) {
      u.port = "6543";
      return u.toString();
    }
  } catch {
    /* URL fora do padrão: usa como veio */
  }
  return url;
}

export const SERVERLESS_POOL = { max: 3, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 10_000 } as const;
