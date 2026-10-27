/**
 * UM pool de Postgres por instância, dividido entre o app (`getSql`) e o Better Auth.
 *
 * Antes havia dois pools (até 3 + 3 conexões por instância) e, em serverless, uma
 * instância "congelada" entre requisições segurava as conexões ociosas: o
 * `idleTimeoutMillis` não roda enquanto a função está suspensa. Com muitas
 * instâncias (picos de tráfego + deploys/previews no mesmo banco) o pooler do
 * Supabase chegava ao limite de clientes (EMAXCONN, 200).
 *
 * `attachDatabasePool` (Vercel) mantém a instância viva só o bastante para fechar
 * as conexões ociosas antes de suspender.
 */
import { attachDatabasePool } from "@vercel/functions";
import pg from "pg";
import { SERVERLESS_POOL, serverlessDbUrl } from "./db-url";

const g = globalThis as typeof globalThis & { __sharedPgPool__?: pg.Pool };

export function sharedPool(databaseUrl: string): pg.Pool {
  if (g.__sharedPgPool__) return g.__sharedPgPool__;
  const pool = new pg.Pool({
    ...SERVERLESS_POOL,
    connectionString: serverlessDbUrl(databaseUrl),
    // Supabase's pooler cert chain is not in Node's trust store.
    ssl: databaseUrl.includes("supabase") ? { rejectUnauthorized: false } : undefined,
  });
  // Conexão ociosa derrubada pelo pooler não pode derrubar a função.
  pool.on("error", (err) => console.warn("[db] pool", err.message));
  try {
    attachDatabasePool(pool);
  } catch {
    /* fora da Vercel (local): segue só com o idleTimeout */
  }
  g.__sharedPgPool__ = pool;
  return pool;
}
