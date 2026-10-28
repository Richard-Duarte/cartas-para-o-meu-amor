"use client";

import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { signOut } from "@/lib/auth/client";
import { myAccountStatus, requestUnblock, saveMyAttribution } from "@/lib/server/moderation";
import { captureAttribution, readFirstTouch } from "@/lib/tracking";
import { isStandalone } from "@/lib/pwa";

type Status = Awaited<ReturnType<typeof myAccountStatus>>;

const SENT_KEY = "trk:first-sent:";

/** Manda o 1º toque (origem + aparelho) uma vez por conta. O servidor só grava em conta nova. */
function syncAttribution(userId: string) {
  try {
    if (localStorage.getItem(SENT_KEY + userId)) return;
    captureAttribution(); // garante o 1º toque mesmo se este efeito rodar antes do boot
    const a = readFirstTouch() ?? {};
    const standalone = isStandalone();
    const touchMac = /Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
    void saveMyAttribution({
      data: {
        utm_source: a.utm_source,
        utm_medium: a.utm_medium,
        utm_campaign: a.utm_campaign,
        utm_content: a.utm_content,
        utm_term: a.utm_term,
        fbclid: a.fbclid,
        ttclid: a.ttclid,
        gclid: (a as { gclid?: string }).gclid,
        referrer: a.referrer,
        landing_path: a.landing_path,
        first_seen_at: a.first_seen_at,
        standalone: Boolean(standalone),
        touchMac,
      },
    })
      .then(() => localStorage.setItem(SENT_KEY + userId, "1"))
      .catch(() => {});
  } catch {
    /* sem storage: tenta na próxima */
  }
}

function fmt(iso: string | null | undefined) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

/**
 * Conta bloqueada: tela cheia com ícone vermelho, o motivo e "Reivindicar acesso".
 * Quem não está bloqueado não vê nada (e o /admin, os Termos e a Privacidade ficam livres).
 */
export function AccountGuard() {
  // Só assina a sessão depois que a página terminou de hidratar: se a sessão
  // resolver antes do cabeçalho (rotas lazy), o React acusa "hydration mismatch".
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const go = () => {
      t = setTimeout(() => setReady(true), 1200);
    };
    if (document.readyState === "complete") go();
    else window.addEventListener("load", go, { once: true });
    return () => {
      window.removeEventListener("load", go);
      if (t) clearTimeout(t);
    };
  }, []);
  return ready ? <AccountGuardInner /> : null;
}

function AccountGuardInner() {
  const { user, isPending } = useCurrentUserState();
  const [status, setStatus] = useState<Status | null>(null);
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (isPending || !user || user.isDevFallback) {
      setStatus(null);
      return;
    }
    syncAttribution(user.id);
    let live = true;
    const load = () =>
      void myAccountStatus()
        .then((s) => live && setStatus(s))
        .catch(() => {});
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      live = false;
      window.removeEventListener("focus", onFocus);
    };
  }, [user, isPending]);

  if (!status || !status.blocked) return null;
  if (/^\/(admin|termos|privacidade)(\/|$)/.test(path)) return null;
  return <BlockedScreen status={status} onChange={setStatus} />;
}

function BlockedScreen({
  status,
  onChange,
}: {
  status: Extract<Status, { blocked: true }>;
  onChange: (s: Status) => void;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const last = status.lastRequest;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function send() {
    setError("");
    setBusy(true);
    const r = await requestUnblock({ data: { message } }).catch(() => ({ ok: false as const, error: "Não foi possível enviar agora." }));
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setOpen(false);
    setMessage("");
    onChange(await myAccountStatus());
  }

  return (
    <div className="blocked-screen" role="alertdialog" aria-modal="true" aria-labelledby="blocked-title" data-testid="blocked-screen">
      <div className="blocked-card">
        <div className="blocked-icon" aria-hidden="true">
          <svg viewBox="0 0 48 48" width="56" height="56">
            <circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" strokeWidth="4" />
            <path d="M9.5 38.5 38.5 9.5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>
        <h1 id="blocked-title">Sua conta está bloqueada</h1>
        <p className="blocked-lead">Enquanto o bloqueio durar, você não pode escrever, enviar nem pagar cartas.</p>
        <div className="blocked-reason">
          <p className="cart-kicker">Motivo</p>
          <p>{status.reason || "Violação dos Termos de Uso."}</p>
          {status.blockedAt ? <small>Desde {fmt(status.blockedAt)}</small> : null}
        </div>

        {last?.status === "pending" ? (
          <p className="blocked-note" data-testid="blocked-pending">
            Seu pedido de desbloqueio foi enviado em {fmt(last.createdAt)} e está em análise. Você verá a resposta aqui.
          </p>
        ) : null}
        {last?.status === "refused" ? (
          <div className="blocked-note is-refused" data-testid="blocked-refused">
            <p>
              <strong>Pedido recusado</strong> em {fmt(last.resolvedAt)}.
            </p>
            {last.adminNote ? <p>Resposta da equipe: {last.adminNote}</p> : null}
          </div>
        ) : null}

        {open ? (
          <form
            className="blocked-form"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <label htmlFor="blocked-msg">Recado para a equipe</label>
            <textarea
              id="blocked-msg"
              rows={5}
              maxLength={1000}
              value={message}
              placeholder="Explique por que sua conta deveria ser desbloqueada."
              onChange={(e) => setMessage(e.target.value)}
              autoFocus
            />
            <small>{message.trim().length < 10 ? "Escreva pelo menos 10 caracteres." : `${message.length}/1000`}</small>
            {error ? <p className="blocked-error">{error}</p> : null}
            <div className="blocked-actions">
              <button type="submit" className="pay-submit" disabled={busy || message.trim().length < 10}>
                {busy ? "Enviando…" : "Enviar pedido"}
              </button>
              <button type="button" className="blocked-ghost" onClick={() => setOpen(false)}>
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <div className="blocked-actions">
            {status.canRequest ? (
              <button type="button" className="pay-submit" onClick={() => setOpen(true)} data-testid="blocked-claim">
                Reivindicar acesso
              </button>
            ) : last?.status !== "pending" ? (
              <p className="blocked-note">Você já mandou pedidos demais hoje. Tente de novo amanhã.</p>
            ) : null}
            <button type="button" className="blocked-ghost" onClick={() => void signOut("/")}>
              Sair da conta
            </button>
          </div>
        )}
        <p className="blocked-legal">
          Veja os <a href="/termos">Termos de Uso</a> e a <a href="/privacidade">Política de Privacidade</a>.
        </p>
      </div>
    </div>
  );
}
