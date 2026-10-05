import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

export const accountAuthKind = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ providerId: string }>`
      select "providerId" from account where "userId" = ${context.userId}
    `;
    return {
      hasPassword: rows.some((r) => r.providerId === "credential"),
      providers: rows.map((r) => r.providerId),
    };
  });

export const saveAccountPassword = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      current: z.string().optional(),
      next: z.string().min(8).max(128),
    }),
  )
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const cred = await sql<{ password: string | null }>`
      select password from account
      where "userId" = ${context.userId} and "providerId" = 'credential'
      limit 1
    `;
    const hasPassword = Boolean(cred[0]?.password);
    if (hasPassword && !data.current) {
      return { ok: false as const, error: "Informe a senha atual." };
    }

    const { auth } = await import("@/lib/auth/server");
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    const headers = new Headers(request?.headers);

    try {
      if (hasPassword) {
        await auth.api.changePassword({
          body: {
            newPassword: data.next,
            currentPassword: data.current ?? "",
          },
          headers,
        });
      } else {
        await auth.api.setPassword({
          body: { newPassword: data.next },
          headers,
        });
      }
      return { ok: true as const, hasPassword: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível salvar a senha.";
      return { ok: false as const, error: message };
    }
  });
