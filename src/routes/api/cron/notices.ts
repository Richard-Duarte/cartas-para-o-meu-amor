import { createFileRoute } from "@tanstack/react-router";
import { dispatchDueNotices } from "@/lib/server/notices";

export const Route = createFileRoute("/api/cron/notices")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const states = await dispatchDueNotices();
          return Response.json({ ok: true, sent: states.length });
        } catch {
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});
