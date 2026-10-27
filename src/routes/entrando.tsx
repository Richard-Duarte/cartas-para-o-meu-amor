import { createFileRoute, redirect } from "@tanstack/react-router";
import { googleAdminStatus } from "@/lib/server/admin-auth";

/**
 * Destino depois do login Google. A decisão é do servidor (googleAdminStatus confere a sessão):
 * admin (ADMIN_EMAILS + Google verificado) vai para o /admin; os demais voltam para `next`.
 */
export const Route = createFileRoute("/entrando")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => {
    const next = typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//") ? s.next : undefined;
    return { next };
  },
  beforeLoad: async ({ search }) => {
    const { admin } = await googleAdminStatus();
    throw redirect({ href: admin ? "/admin" : search.next || "/" });
  },
  component: () => <main className="mx-auto max-w-lg px-5 py-16 text-muted">Entrando…</main>,
});
