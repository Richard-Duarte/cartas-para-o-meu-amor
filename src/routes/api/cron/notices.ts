import { createFileRoute } from "@tanstack/react-router";
import { dispatchDueNotices } from "@/lib/server/notices";

function sanitizeError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return raw
    .replace(/postgresql:\/\/[^\s'"]+/gi, "postgresql://***")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]")
    .slice(0, 300);
}

export const Route = createFileRoute("/api/cron/notices")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const states = await dispatchDueNotices();
          return Response.json({ ok: true, sent: states.length });
        } catch (err) {
          console.error("[cron/notices]", sanitizeError(err));
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});
