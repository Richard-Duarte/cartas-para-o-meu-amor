import { useEffect, useState } from "react";
import { googleAdminStatus } from "@/lib/server/admin-auth";

let cache: { userId: string; admin: Promise<boolean> } | null = null;

/** true quando o usuário logado é admin pelo Google (a resposta vem do servidor). */
export function useGoogleAdmin(userId: string | null | undefined) {
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    if (!userId) {
      setAdmin(false);
      return;
    }
    if (!cache || cache.userId !== userId) {
      cache = { userId, admin: googleAdminStatus().then((r) => r.admin).catch(() => false) };
    }
    let live = true;
    void cache.admin.then((v) => live && setAdmin(v));
    return () => {
      live = false;
    };
  }, [userId]);
  return admin;
}
