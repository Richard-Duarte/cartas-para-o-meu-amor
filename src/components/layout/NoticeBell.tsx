"use client";

import { useNavigate } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { noticeKindLabel, noticeLetterTarget, type NoticeItem } from "@/lib/notice-action";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/server/notifications";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function usePresence(open: boolean, ms = 340) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setShown(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }
    setShown(false);
    const timer = window.setTimeout(() => setMounted(false), ms);
    return () => window.clearTimeout(timer);
  }, [open, ms]);
  return { mounted, shown };
}

function whenLabel(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (!Number.isFinite(mins) || mins < 1) return "agora";
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `há ${hours} h`;
  return `há ${Math.round(hours / 24)} d`;
}

export function NoticeBell({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [items, setItems] = useState<NoticeItem[]>([]);
  const [ready, setReady] = useState(false);
  const presence = usePresence(open);
  const unread = items.filter((item) => !item.readAt).length;

  useEffect(() => {
    let stop = false;
    const load = () => {
      void listNotifications()
        .then((rows) => {
          if (!stop) {
            setItems(rows);
            setReady(true);
          }
        })
        .catch(() => {
          if (!stop) setReady(true);
        });
    };
    load();
    const timer = window.setInterval(load, 20000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    window.addEventListener("cartas:notices", onFocus);
    return () => {
      stop = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("cartas:notices", onFocus);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  function markLocal(id?: string) {
    const now = new Date().toISOString();
    setItems((current) =>
      current.map((item) => {
        if (item.readAt) return item;
        if (id && item.id !== id) return item;
        return { ...item, readAt: now };
      }),
    );
  }

  function openItem(item: NoticeItem) {
    const letterId = noticeLetterTarget(item.kind, item.letterId);
    if (!item.readAt) {
      markLocal(item.id);
      void markNotificationRead({ data: item.id }).catch(() => undefined);
    }
    if (!letterId) return;
    onOpenChange(false);
    void navigate({ to: "/acompanhar/$letterId", params: { letterId } });
  }

  function markAll() {
    if (!unread) return;
    markLocal();
    void markAllNotificationsRead().catch(() => undefined);
  }

  return (
    <>
      <button
        type="button"
        className={cn("notice-bell", open && "is-open")}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={unread ? `Notificações, ${unread} sem ler` : "Notificações"}
        onClick={() => onOpenChange(!open)}
      >
        <Bell size={18} />
        {unread > 0 ? <span className="notice-badge">{unread > 9 ? "9+" : unread}</span> : null}
      </button>
      {presence.mounted
        ? createPortal(
            <>
              <button
                type="button"
                className={cn("notice-scrim", presence.shown && "is-in")}
                aria-label="Fechar notificações"
                onClick={() => onOpenChange(false)}
              />
              <div
                className={cn("notice-pop", presence.shown && "is-in")}
                role="dialog"
                aria-label="Notificações"
              >
                <header className="notice-pop-head">
                  <p>Notificações</p>
                  <span>{unread ? `${unread} sem ler` : "Em dia"}</span>
                </header>
                <div className="notice-scroll">
                  {!ready ? <p className="notice-empty">Abrindo a caixa…</p> : null}
                  {ready && items.length === 0 ? (
                    <p className="notice-empty">Nada por aqui ainda.</p>
                  ) : null}
                  {items.map((item, index) => {
                    const goes = Boolean(noticeLetterTarget(item.kind, item.letterId));
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={cn("notice-item", item.readAt && "is-read", goes && "is-link")}
                        style={{ "--i": index } as CSSProperties}
                        onClick={() => openItem(item)}
                      >
                        <span className="notice-kicker">
                          {noticeKindLabel(item.kind)}
                          <time>{whenLabel(item.createdAt)}</time>
                        </span>
                        <strong>{item.title}</strong>
                        {item.body ? <span className="notice-body">{item.body}</span> : null}
                        {goes ? <span className="notice-go">Abrir a carta</span> : null}
                      </button>
                    );
                  })}
                </div>
                <button type="button" className="notice-all" disabled={!unread} onClick={markAll}>
                  Marcar todas como lidas
                </button>
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
