import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";

const COOKIE = "carta_admin";

async function hashPassword(password: string) {
  const { randomBytes, scrypt: scryptCb } = await import("node:crypto");
  const { promisify } = await import("node:util");
  const scrypt = promisify(scryptCb);
  const salt = randomBytes(16);
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string) {
  const { scrypt: scryptCb, timingSafeEqual } = await import("node:crypto");
  const { promisify } = await import("node:util");
  const scrypt = promisify(scryptCb);
  const [saltHex, keyHex] = stored.split(":");
  if (!saltHex || !keyHex) return false;
  const key = (await scrypt(password, Buffer.from(saltHex, "hex"), 64)) as Buffer;
  const a = Buffer.from(keyHex, "hex");
  if (a.length !== key.length) return false;
  return timingSafeEqual(a, key);
}

async function ensureAdminRow() {
  const sql = await getSql();
  await sql`
    create table if not exists admin_users (
      id text primary key,
      username text unique not null,
      password_hash text not null,
      updated_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists admin_sessions (
      token text primary key,
      created_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists app_settings (
      key text primary key,
      value text not null
    )
  `;
  await sql`
    insert into app_settings (key, value) values ('affiliate_percent', '10')
    on conflict (key) do nothing
  `;
  try { await sql`alter table profiles add column if not exists payable_brl integer not null default 0`; } catch { /* skip */ }
  try { await sql`alter table affiliate_events add column if not exists commission_brl integer not null default 0`; } catch { /* skip */ }
  const rows = await sql<{ id: string }>`select id from admin_users limit 1`;
  if (rows.length) return sql;
  await sql`
    insert into admin_users (id, username, password_hash)
    values ('root', 'admin', ${await hashPassword("1234")})
  `;
  return sql;
}

async function readToken() {
  const { getCookie } = await import("@tanstack/react-start/server");
  return getCookie(COOKIE) ?? "";
}

async function writeToken(token: string, maxAge: number) {
  const { setCookie } = await import("@tanstack/react-start/server");
  setCookie(COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge,
  });
}

export async function requireAdminSession() {
  const sql = await ensureAdminRow();
  const token = await readToken();
  if (!token) throw new Error("Forbidden");
  const rows = await sql<{ token: string }>`
    select token from admin_sessions where token = ${token} limit 1
  `;
  if (!rows.length) throw new Error("Forbidden");
  return sql;
}

export const adminLogin = createServerFn({ method: "POST" })
  .validator(z.object({ username: z.string(), password: z.string() }))
  .handler(async ({ data }) => {
    const sql = await ensureAdminRow();
    const rows = await sql<{ username: string; password_hash: string }>`
      select username, password_hash from admin_users where username = ${data.username.trim()} limit 1
    `;
    const row = rows[0];
    if (!row || !(await verifyPassword(data.password, row.password_hash))) {
      return { ok: false as const, message: "Usuário ou senha inválidos" };
    }
    const { randomBytes } = await import("node:crypto");
    const token = randomBytes(24).toString("hex");
    await sql`insert into admin_sessions (token) values (${token})`;
    await writeToken(token, 60 * 60 * 24 * 7);
    return { ok: true as const };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const sql = await getSql();
  const token = await readToken();
  if (token) await sql`delete from admin_sessions where token = ${token}`;
  await writeToken("", 0);
  return { ok: true };
});

export const adminSession = createServerFn({ method: "GET" }).handler(async () => {
  try {
    await requireAdminSession();
    return { ok: true as const };
  } catch {
    return { ok: false as const };
  }
});

export const changeAdminPassword = createServerFn({ method: "POST" })
  .validator(z.object({ current: z.string(), next: z.string().min(4) }))
  .handler(async ({ data }) => {
    const sql = await requireAdminSession();
    const rows = await sql<{ password_hash: string }>`
      select password_hash from admin_users where username = 'admin' limit 1
    `;
    if (!rows[0] || !(await verifyPassword(data.current, rows[0].password_hash))) {
      return { ok: false as const, message: "Senha atual não confere" };
    }
    await sql`
      update admin_users
      set password_hash = ${await hashPassword(data.next)}, updated_at = now()
      where username = 'admin'
    `;
    return { ok: true as const };
  });

export const getSettings = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminSession();
  const sql = await getSql();
  const rows = await sql<{ key: string; value: string }>`select key, value from app_settings`;
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { affiliatePercent: Number(map.affiliate_percent ?? 10) };
});

export const saveSettings = createServerFn({ method: "POST" })
  .validator(z.object({ affiliatePercent: z.number().min(0).max(80) }))
  .handler(async ({ data }) => {
    await requireAdminSession();
    const sql = await getSql();
    await sql`
      insert into app_settings (key, value) values ('affiliate_percent', ${String(data.affiliatePercent)})
      on conflict (key) do update set value = excluded.value
    `;
    return { ok: true };
  });
