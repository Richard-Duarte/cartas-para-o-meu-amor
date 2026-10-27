/** Lado do usuário: estado de bloqueio, pedido de desbloqueio e origem do cadastro. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { classifyChannel, parseUserAgent } from "@/lib/acquisition";
import { blockState, ensureModerationTables } from "@/lib/server/moderation.server";

export type UnblockRequestView = {
  id: string;
  status: "pending" | "approved" | "refused";
  message: string;
  adminNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

const MAX_REQUESTS_PER_DAY = 3;

export const myAccountStatus = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const state = await blockState(sql, context.userId);
    if (!state.blocked) return { blocked: false as const };
    const reqs = await sql<{
      id: string;
      status: string;
      message: string;
      admin_note: string | null;
      created_at: string;
      resolved_at: string | null;
    }>`
      select id, status, message, admin_note, created_at::text as created_at, resolved_at::text as resolved_at
      from unblock_requests where user_id = ${context.userId}
      order by created_at desc limit 5
    `;
    const recent = reqs.filter((r) => Date.now() - new Date(r.created_at).getTime() < 24 * 3600 * 1000).length;
    const last = reqs[0];
    return {
      blocked: true as const,
      reason: state.reason,
      blockedAt: state.blockedAt,
      lastRequest: last
        ? ({
            id: last.id,
            status: last.status as UnblockRequestView["status"],
            message: last.message,
            adminNote: last.admin_note,
            createdAt: last.created_at,
            resolvedAt: last.resolved_at,
          } satisfies UnblockRequestView)
        : null,
      canRequest: last?.status !== "pending" && recent < MAX_REQUESTS_PER_DAY,
    };
  });

export const requestUnblock = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ message: z.string().trim().min(10).max(1000) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const state = await blockState(sql, context.userId);
    if (!state.blocked) return { ok: false as const, error: "Sua conta não está bloqueada." };
    const pending = await sql<{ n: number }>`
      select count(*)::int as n from unblock_requests where user_id = ${context.userId} and status = 'pending'
    `;
    if ((pending[0]?.n ?? 0) > 0) return { ok: false as const, error: "Você já tem um pedido em análise." };
    const recent = await sql<{ n: number }>`
      select count(*)::int as n from unblock_requests
      where user_id = ${context.userId} and created_at > now() - interval '24 hours'
    `;
    if ((recent[0]?.n ?? 0) >= MAX_REQUESTS_PER_DAY) {
      return { ok: false as const, error: "Você já mandou pedidos demais hoje. Tente de novo amanhã." };
    }
    await sql`
      insert into unblock_requests (id, user_id, message) values (${crypto.randomUUID()}, ${context.userId}, ${data.message})
    `;
    return { ok: true as const };
  });

const s = (n: number) => z.string().max(n).optional();

/** Origem do cadastro (1º toque) + aparelho. Só para conta criada há menos de 1 dia; grava uma vez. */
export const saveMyAttribution = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      utm_source: s(200),
      utm_medium: s(200),
      utm_campaign: s(200),
      utm_content: s(200),
      utm_term: s(200),
      fbclid: s(500),
      ttclid: s(500),
      gclid: s(500),
      referrer: s(300),
      landing_path: s(200),
      first_seen_at: z.number().optional(),
      standalone: z.boolean().optional(),
      touchMac: z.boolean().optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureModerationTables(sql);
    const fresh = await sql<{ n: number }>`
      select count(*)::int as n from "user" where id = ${context.userId} and "createdAt" > now() - interval '1 day'
    `;
    if (!fresh[0]?.n) return { ok: true as const, saved: false };
    const { requestContext } = await import("@/lib/server/attribution");
    const rc = await requestContext();
    const agent = parseUserAgent(rc.userAgent, Boolean(data.touchMac));
    const channel = classifyChannel(data);
    const first =
      typeof data.first_seen_at === "number" && Number.isFinite(data.first_seen_at)
        ? new Date(data.first_seen_at).toISOString()
        : null;
    await sql`
      insert into user_attribution (user_id, channel, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
        fbclid, ttclid, gclid, referrer, landing_path, first_seen_at, platform, os, browser, device, display_mode, user_agent)
      values (${context.userId}, ${channel}, ${data.utm_source ?? null}, ${data.utm_medium ?? null},
        ${data.utm_campaign ?? null}, ${data.utm_content ?? null}, ${data.utm_term ?? null}, ${data.fbclid ?? null},
        ${data.ttclid ?? null}, ${data.gclid ?? null}, ${data.referrer ?? null}, ${data.landing_path ?? null}, ${first},
        ${agent.platform}, ${agent.os}, ${agent.browser}, ${agent.device},
        ${data.standalone ? "standalone" : "browser"}, ${rc.userAgent?.slice(0, 400) ?? null})
      on conflict (user_id) do nothing
    `;
    return { ok: true as const, saved: true };
  });
