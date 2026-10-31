"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatBrl } from "@/lib/cart";
import { CHANNEL_LABEL, PLATFORM_LABEL } from "@/lib/acquisition";
import { LetterDocument } from "@/components/letters/LetterDocument";
import { downloadLetterPng } from "@/lib/download-letter";
import { getMessenger } from "@/lib/messengers";
import { pagesPlainText, type LetterPage } from "@/lib/pages";
import type { DesignId } from "@/lib/designs";
import { dataUrlBytes, makeZip, saveBlob, type ZipEntry } from "@/lib/zip";
import {
  adminBlockUser,
  adminLetterDetail,
  adminResolveUnblock,
  adminUnblockRequests,
  adminUnblockUser,
  adminUserDetail,
  adminUserExport,
  adminUserList,
} from "@/lib/server/admin-panel";
import { cn } from "@/lib/utils";

type ListRow = Awaited<ReturnType<typeof adminUserList>>[number];
type Detail = Awaited<ReturnType<typeof adminUserDetail>>;
type HistRow = Detail["letters"][number];
type LetterFull = Awaited<ReturnType<typeof adminLetterDetail>>;
type Req = Awaited<ReturnType<typeof adminUnblockRequests>>[number];

function fmtDate(iso: string | null | undefined, withTime = true) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "America/Sao_Paulo",
  });
}

function slug(v: string) {
  return (
    v
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "usuario"
  );
}

function letterStatus(l: { started_at: string; depart_at: string | null; arrive_at: string | null; demo_duration_ms: number; viewed_at?: string | null }) {
  const now = Date.now();
  const depart = l.depart_at ? new Date(l.depart_at).getTime() : new Date(l.started_at).getTime();
  const arrive = l.arrive_at ? new Date(l.arrive_at).getTime() : depart + (l.demo_duration_ms || 0);
  if (now < depart) return "Agendada";
  if (now < arrive) return "A caminho";
  return l.viewed_at ? "Entregue · lida" : "Entregue";
}

function payStatus(total: number | null, method: string | null) {
  if (total == null) return "Sem pedido";
  if (method === "bypass") return "Sem pagamento (teste)";
  if (Number(total) <= 0) return "Grátis (cupom/crédito)";
  return `Pago ${formatBrl(Number(total))}${method ? ` · ${method}` : ""}`;
}

function parsePages(raw: unknown): LetterPage[] {
  try {
    const v = JSON.parse(String(raw ?? "[]"));
    return Array.isArray(v) ? (v as LetterPage[]) : [];
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ lista */

export function AdminUsers({ focusUserId, onFocused }: { focusUserId?: string | null; onFocused?: () => void }) {
  const [rows, setRows] = useState<ListRow[] | null>(null);
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<"" | "bloqueados" | "pedidos">("");
  const [open, setOpen] = useState<string | null>(null);

  function reload() {
    void adminUserList().then(setRows).catch(() => setRows([]));
  }
  useEffect(reload, []);
  useEffect(() => {
    if (focusUserId) {
      setOpen(focusUserId);
      onFocused?.();
    }
  }, [focusUserId, onFocused]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (rows ?? []).filter(
      (u) =>
        (!term || `${u.name ?? ""} ${u.email ?? ""} ${u.user_id}`.toLowerCase().includes(term)) &&
        (only !== "bloqueados" || u.blocked_at) &&
        (only !== "pedidos" || u.pending_requests > 0),
    );
  }, [rows, q, only]);

  if (open) {
    return (
      <UserPage
        userId={open}
        onBack={() => {
          setOpen(null);
          reload();
        }}
      />
    );
  }

  return (
    <div>
      <h2>Usuários</h2>
      <div className="users-tools">
        <input type="search" placeholder="Buscar por nome ou e-mail" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="dash-chips is-small">
          <button type="button" className={cn(only === "" && "is-on")} onClick={() => setOnly("")}>
            Todos
          </button>
          <button type="button" className={cn(only === "bloqueados" && "is-on")} onClick={() => setOnly("bloqueados")}>
            Bloqueados
          </button>
          <button type="button" className={cn(only === "pedidos" && "is-on")} onClick={() => setOnly("pedidos")}>
            Com pedido
          </button>
        </div>
      </div>
      {!rows ? <p className="text-muted">Lendo as contas…</p> : null}
      <div className="admin-table">
        {shown.map((u) => (
          <button key={u.user_id} type="button" className="admin-row user-row" onClick={() => setOpen(u.user_id)}>
            <span className="user-row-main">
              {u.image ? <img src={u.image} alt="" referrerPolicy="no-referrer" /> : <i aria-hidden="true">{(u.name || u.email || "?").slice(0, 1)}</i>}
              <span>
                <strong>{u.name || u.email || u.user_id.slice(0, 8)}</strong>
                <em>{u.email}</em>
              </span>
            </span>
            <span className="user-row-meta">
              {u.blocked_at ? <b className="tag is-red">Bloqueado</b> : null}
              {u.pending_requests ? <b className="tag is-gold">Pedido de desbloqueio</b> : null}
              <span>
                {u.letters} cartas · {CHANNEL_LABEL[u.channel] ?? u.channel} · {PLATFORM_LABEL[u.platform] ?? u.platform}
              </span>
            </span>
          </button>
        ))}
        {rows && !shown.length ? <p className="py-4 text-sm text-muted">Ninguém encontrado.</p> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ página do usuário */

function UserPage({ userId, onBack }: { userId: string; onBack: () => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [viewing, setViewing] = useState<{ id: string; download: boolean } | null>(null);
  const closeViewing = useCallback(() => setViewing(null), []);
  const [dialog, setDialog] = useState<"block" | "unblock" | null>(null);
  const [zipState, setZipState] = useState("");

  function reload() {
    void adminUserDetail({ data: userId })
      .then(setD)
      .catch(() => setError("Não foi possível abrir este usuário."));
  }
  useEffect(reload, [userId]);

  async function downloadJson(letterId: string) {
    const full = await adminLetterDetail({ data: { letterId, purpose: "baixar_json", userId } });
    saveBlob(new Blob([JSON.stringify(full, null, 2)], { type: "application/json" }), `carta-${letterId}.json`);
  }

  async function downloadAll() {
    if (!d) return;
    setZipState("Preparando…");
    try {
      const ids = await adminUserExport({ data: userId });
      const entries: ZipEntry[] = [];
      const index: string[] = [];
      for (let i = 0; i < ids.length; i++) {
        setZipState(`Carta ${i + 1} de ${ids.length}…`);
        const full = await adminLetterDetail({ data: { letterId: ids[i], purpose: "baixar_todas", userId } });
        const l = full.letter as Record<string, unknown>;
        const folder = `cartas/${String(l.started_at ?? "").slice(0, 10)}_${ids[i]}`;
        const pages = parsePages(l.pages_json);
        let n = 0;
        const imgs: string[] = [];
        for (const p of pages) {
          for (const b of p.blocks ?? []) {
            if (b.kind === "sticker" && typeof b.src === "string" && b.src.startsWith("data:")) {
              const f = dataUrlBytes(b.src);
              if (f) {
                n += 1;
                const name = `anexos/imagem-${n}.${f.ext}`;
                entries.push({ name: `${folder}/${name}`, data: f.bytes });
                imgs.push(name);
              }
            }
          }
        }
        for (const r of full.replies) {
          if (r.photo_data?.startsWith("data:")) {
            const f = dataUrlBytes(r.photo_data);
            if (f) {
              n += 1;
              const name = `anexos/comentario-${n}.${f.ext}`;
              entries.push({ name: `${folder}/${name}`, data: f.bytes });
              imgs.push(name);
            }
          }
        }
        const text = pagesPlainText(pages);
        entries.push({ name: `${folder}/carta.json`, data: JSON.stringify(full, null, 2) });
        entries.push({
          name: `${folder}/texto.txt`,
          data: `De: ${l.from_name}${l.anonymous ? " (anônima)" : ""} <${full.sender?.email ?? "?"}>\nPara: ${l.to_name}\nData: ${fmtDate(String(l.started_at))}\n\n${text}\n${full.replies.map((r) => `\n— Comentário (${fmtDate(r.created_at)}): ${r.body}`).join("")}\n`,
        });
        index.push(
          `<article><h2>${esc(String(l.from_name))} → ${esc(String(l.to_name))}</h2><p class="m">${esc(fmtDate(String(l.started_at)))} · ${l.anonymous ? "anônima · " : ""}${esc(getMessenger(String(l.messenger_id)).name)} · id ${ids[i]}</p><pre>${esc(text)}</pre>${imgs.map((src) => `<img src="${folder}/${src}">`).join("")}</article>`,
        );
      }
      const who = d.user.name || d.user.email || userId;
      entries.push({
        name: "usuario.json",
        data: JSON.stringify({ user: d.user, attribution: d.attribution, blocks: d.blocks, requests: d.requests, exportedAt: new Date().toISOString() }, null, 2),
      });
      entries.push({
        name: "index.html",
        data: `<!doctype html><meta charset="utf-8"><title>Cartas de ${esc(who)}</title><style>body{font:15px/1.5 system-ui;max-width:780px;margin:2rem auto;padding:0 1rem}article{border-top:1px solid #ddd;padding:1rem 0;page-break-inside:avoid}pre{white-space:pre-wrap;font:inherit}.m{color:#777;font-size:13px}img{max-width:220px;margin:4px}</style><h1>Cartas de ${esc(who)}</h1><p class="m">${esc(d.user.email ?? "")} · exportado em ${esc(fmtDate(new Date().toISOString()))}</p>${index.join("")}`,
      });
      saveBlob(makeZip(entries), `cartas-${slug(who)}.zip`);
      setZipState("");
    } catch {
      setZipState("Não foi possível baixar. Tente de novo.");
    }
  }

  if (error) return <p className="text-rose">{error}</p>;
  if (!d) return <p className="text-muted">Abrindo a conta…</p>;
  const u = d.user;
  const blocked = Boolean(u.blocked_at);
  const pending = d.requests.filter((r) => r.status === "pending");

  return (
    <div className="user-page" data-testid="user-page">
      <button type="button" className="user-back" onClick={onBack}>
        ← Usuários
      </button>
      <header className="user-head">
        {u.image ? <img src={u.image} alt="" referrerPolicy="no-referrer" /> : <i aria-hidden="true">{(u.name || u.email || "?").slice(0, 1)}</i>}
        <div>
          <h2>{u.name || u.email || u.user_id.slice(0, 8)}</h2>
          <p className="text-sm text-muted">
            {u.email} · conta desde {fmtDate(u.created_at, false)}
          </p>
          <p className="text-sm text-muted">
            Origem: {CHANNEL_LABEL[d.attribution?.channel ?? "desconhecido"] ?? d.attribution?.channel}
            {d.attribution?.utm_campaign ? ` · campanha ${d.attribution.utm_campaign}` : ""} · Plataforma:{" "}
            {d.attribution
              ? `${d.attribution.os ?? "?"} · ${d.attribution.browser ?? "?"}${d.attribution.display_mode === "standalone" ? " · app instalado" : ""}`
              : "Desconhecido"}
          </p>
        </div>
        <div className="user-head-actions">
          {d.protected ? (
            <span className="tag">Administrador</span>
          ) : blocked ? (
            <button type="button" className="btn-outline" onClick={() => setDialog("unblock")} data-testid="unblock-btn">
              Desbloquear
            </button>
          ) : (
            <button type="button" className="btn-danger" onClick={() => setDialog("block")} data-testid="block-btn">
              Bloquear
            </button>
          )}
        </div>
      </header>

      {blocked ? (
        <div className="user-blocked-banner">
          <b>Bloqueado</b> em {fmtDate(u.blocked_at)} por {u.blocked_by || "—"}
          <p>Motivo: {u.block_reason}</p>
          <small>As cartas enviadas por esta conta estão fora do ar. Voltam como eram se a conta for desbloqueada.</small>
        </div>
      ) : null}

      {pending.length ? (
        <section className="dash-card">
          <h3>Pedido de desbloqueio</h3>
          {pending.map((r) => (
            <RequestCard key={r.id} req={{ ...r, user_id: userId, name: u.name, email: u.email, block_reason: u.block_reason, blocked_at: u.blocked_at }} onDone={reload} compact />
          ))}
        </section>
      ) : null}

      <section className="dash-card">
        <header>
          <h3>Histórico de cartas ({d.letters.length})</h3>
          {d.letters.length ? (
            <button type="button" className="btn-outline" onClick={() => void downloadAll()} disabled={Boolean(zipState) && zipState !== "Não foi possível baixar. Tente de novo."}>
              {zipState || "Baixar todas (.zip)"}
            </button>
          ) : null}
        </header>
        {d.unplacedPayments ? (
          <p className="text-xs text-muted">{d.unplacedPayments} pagamento(s) iniciado(s) sem carta criada (PIX não pago ou recusado).</p>
        ) : null}
        {d.letters.length ? (
          <div className="dash-table-wrap">
            <table className="dash-table hist-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>De → Para</th>
                  <th>Status</th>
                  <th>Mensageiro</th>
                  <th>Data</th>
                  <th>Pagamento</th>
                  <th>Carta</th>
                </tr>
              </thead>
              <tbody>
                {d.letters.map((l) => (
                  <HistoryRow
                    key={l.id}
                    l={l}
                    onOpen={() => setViewing({ id: l.id, download: false })}
                    onImage={() => setViewing({ id: l.id, download: true })}
                    onJson={() => downloadJson(l.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">Nenhuma carta enviada ou recebida.</p>
        )}
      </section>

      {d.blocks.length || d.requests.length ? (
        <section className="dash-card">
          <h3>Histórico de moderação</h3>
          <ul className="dash-list">
            {d.blocks.map((b) => (
              <li key={b.id}>
                <span>
                  {b.action === "bloqueio" ? "Bloqueio" : "Desbloqueio"}
                  {b.reason ? ` — ${b.reason}` : ""} <small className="text-muted">({b.admin_label})</small>
                </span>
                <small>{fmtDate(b.created_at)}</small>
              </li>
            ))}
            {d.requests
              .filter((r) => r.status !== "pending")
              .map((r) => (
                <li key={r.id}>
                  <span>
                    Pedido {r.status === "approved" ? "aceito" : "recusado"}: “{r.message.slice(0, 120)}”
                    {r.admin_note ? ` — resposta: ${r.admin_note}` : ""}
                  </span>
                  <small>{fmtDate(r.resolved_at)}</small>
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      {viewing ? (
        <LetterModal key={`${viewing.id}-${viewing.download}`} letterId={viewing.id} userId={userId} autoDownload={viewing.download} onClose={closeViewing} />
      ) : null}
      {dialog === "block" ? (
        <ReasonDialog
          title="Bloquear usuário"
          intro="A pessoa vai ver este motivo sempre que entrar. As cartas que ela enviou saem do ar (não são apagadas)."
          label="Motivo"
          required
          confirm="Bloquear"
          danger
          onCancel={() => setDialog(null)}
          onConfirm={async (reason) => {
            const r = await adminBlockUser({ data: { userId, reason } });
            if (!r.ok) return r.error;
            setDialog(null);
            reload();
            return null;
          }}
        />
      ) : null}
      {dialog === "unblock" ? (
        <ReasonDialog
          title="Desbloquear usuário"
          intro="A conta volta a funcionar e as cartas dela voltam ao ar como eram. A pessoa recebe um aviso."
          label="Recado para a pessoa (opcional)"
          confirm="Desbloquear"
          onCancel={() => setDialog(null)}
          onConfirm={async (note) => {
            await adminUnblockUser({ data: { userId, note: note || undefined } });
            setDialog(null);
            reload();
            return null;
          }}
        />
      ) : null}
    </div>
  );
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
}

function EnvelopeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <rect x="3" y="5.5" width="18" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3.5 6.5 12 13l8.5-6.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HistoryRow({ l, onOpen, onImage, onJson }: { l: HistRow; onOpen: () => void; onImage: () => void; onJson: () => Promise<void> }) {
  const [menu, setMenu] = useState(false);
  const [msg, setMsg] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: Event) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setMenu(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const who = `${l.from_name || "—"} para ${l.to_name || "—"}`;
  return (
    <tr>
      <td className="hist-tags">
        <span className={cn("tag", l.direction === "recebida" && "is-soft")}>{l.direction === "enviada" ? "Enviada" : "Recebida"}</span>
        {l.anonymous ? <span className="tag is-ink">Anônima</span> : null}
        {l.reply_to_letter_id ? <span className="tag is-soft">Resposta</span> : null}
      </td>
      <td className="hist-who">
        {l.from_name || "—"} → {l.to_name || "—"}
        {l.replies ? <small className="block text-muted">{l.replies} comentário(s)</small> : null}
      </td>
      <td data-label="Status">{letterStatus(l)}</td>
      <td data-label="Mensageiro">{getMessenger(l.messenger_id).name}</td>
      <td data-label="Data">{fmtDate(l.started_at)}</td>
      <td data-label="Pagamento">{payStatus(l.order_total, l.order_method)}</td>
      <td className="hist-actions">
        <div className="hist-actions-row">
          <button type="button" className="hist-btn is-primary" onClick={onOpen} aria-label={`Ver carta de ${who}`} data-testid="open-letter">
            <EnvelopeIcon />
            Ver carta
          </button>
          <div className="hist-split" ref={boxRef}>
            <button type="button" className="hist-btn" onClick={onImage} aria-label={`Baixar carta de ${who} como imagem`} data-testid="download-letter">
              <DownloadIcon />
              Baixar
            </button>
            <button
              type="button"
              className="hist-btn hist-split-toggle"
              onClick={() => setMenu((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menu}
              aria-label="Mais opções de download"
              data-testid="download-menu"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {menu ? (
              <div className="hist-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenu(false);
                    onImage();
                  }}
                >
                  Imagem (PNG)
                  <small>Como quem recebe vê</small>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  data-testid="download-json"
                  onClick={() => {
                    setMenu(false);
                    setMsg("");
                    onJson().catch(() => setMsg("Não foi possível baixar."));
                  }}
                >
                  Dados (JSON)
                  <small>Texto, remetente, datas e comentários</small>
                </button>
              </div>
            ) : null}
          </div>
        </div>
        {msg ? <small className="text-rose">{msg}</small> : null}
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------------ carta em tela cheia */

function LetterModal({
  letterId,
  userId,
  onClose,
  autoDownload = false,
}: {
  letterId: string;
  userId: string;
  onClose: () => void;
  /** Aberto pelo botão "Baixar" da lista: mostra a carta e já baixa a imagem. */
  autoDownload?: boolean;
}) {
  const [full, setFull] = useState<LetterFull | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const docRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // "Baixar" registra baixar_imagem; "Ver carta" registra ver.
    void adminLetterDetail({ data: { letterId, purpose: autoDownload ? "baixar_imagem" : "ver", userId } })
      .then(setFull)
      .catch(() => setError("Não foi possível abrir a carta."));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [letterId, userId, onClose, autoDownload]);

  const l = full?.letter as Record<string, unknown> | undefined;
  const pages = l ? parsePages(l.pages_json) : [];

  async function png(alreadyLogged = false) {
    if (!docRef.current || !l) return;
    setBusy("Preparando…");
    try {
      if (!alreadyLogged) await adminLetterDetail({ data: { letterId, purpose: "baixar_imagem", userId } });
      await downloadLetterPng(docRef.current, `${String(l.to_name)}-${letterId}`);
      setBusy("");
    } catch {
      setBusy("Não deu para gerar a imagem.");
    }
  }
  const autoDone = useRef(false);
  useEffect(() => {
    if (!autoDownload || !l || autoDone.current) return;
    autoDone.current = true;
    // espera a carta desenhar antes de gerar a imagem
    requestAnimationFrame(() => requestAnimationFrame(() => void png(true)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- roda uma vez quando a carta chega
  }, [autoDownload, l]);

  async function json() {
    const data = await adminLetterDetail({ data: { letterId, purpose: "baixar_json", userId } });
    saveBlob(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), `carta-${letterId}.json`);
  }

  return (
    <div className="admin-modal" role="dialog" aria-modal="true" aria-label="Carta" data-testid="letter-modal">
      <div className="admin-modal-card is-wide">
        <header className="admin-modal-head">
          <div>
            <p className="cart-kicker">Carta {letterId}</p>
            {l ? (
              <p className="text-sm">
                <b>De:</b> {String(l.from_name)} {full?.sender?.email ? `<${full.sender.email}>` : ""}
                {l.anonymous ? <span className="tag is-ink ml-2">Anônima</span> : null}
                <br />
                <b>Para:</b> {String(l.to_name)} {full?.recipient?.email ? `<${full.recipient.email}>` : ""}
                <br />
                <span className="text-muted">
                  {fmtDate(String(l.started_at))} · {getMessenger(String(l.messenger_id)).name} ·{" "}
                  {payStatus(full?.order?.total_brl ?? null, full?.order?.method ?? null)}
                </span>
              </p>
            ) : null}
          </div>
          <button type="button" className="admin-modal-x" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </header>
        {error ? <p className="text-rose">{error}</p> : null}
        {!l && !error ? <p className="text-muted">Abrindo a carta…</p> : null}
        {l ? (
          <>
            <div className="admin-modal-actions">
              <button type="button" className="btn-outline" onClick={() => void png()} disabled={busy === "Preparando…"}>
                {busy || "Baixar imagem"}
              </button>
              <button type="button" className="btn-outline" onClick={() => void json()}>
                Baixar dados (JSON)
              </button>
            </div>
            <p className="text-xs text-muted">Como quem recebe vê. Abrir e baixar fica registrado no histórico do painel.</p>
            <div ref={docRef} className="admin-letter-doc">
              <LetterDocument
                designId={(String(l.template_id) as DesignId) || "classico"}
                fromName={l.anonymous ? "Alguém especial" : String(l.from_name)}
                toName={String(l.to_name)}
                body={pagesPlainText(pages) || "…"}
                pages={pages}
              />
            </div>
            {full?.replies.length ? (
              <section className="mt-6">
                <h3 className="font-display text-xl">Comentários</h3>
                <ul className="dash-list">
                  {full.replies.map((r) => (
                    <li key={r.id} className="is-col">
                      <small className="text-muted">{fmtDate(r.created_at)}</small>
                      {r.body ? <p>{r.body}</p> : null}
                      {r.photo_data ? <img src={r.photo_data} alt="" className="max-h-48 rounded-lg" /> : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ diálogos e pedidos */

function ReasonDialog({
  title,
  intro,
  label,
  confirm,
  required,
  danger,
  onCancel,
  onConfirm,
}: {
  title: string;
  intro: string;
  label: string;
  confirm: string;
  required?: boolean;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: (text: string) => Promise<string | null>;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ok = !required || text.trim().length >= 3;
  return (
    <div className="admin-modal" role="dialog" aria-modal="true" aria-label={title} data-testid="reason-dialog">
      <form
        className="admin-modal-card"
        onSubmit={(e) => {
          e.preventDefault();
          if (!ok) return;
          setBusy(true);
          setError("");
          void onConfirm(text.trim())
            .then((err) => err && setError(err))
            .catch(() => setError("Não foi possível salvar."))
            .finally(() => setBusy(false));
        }}
      >
        <h3 className="font-display text-2xl">{title}</h3>
        <p className="mt-2 text-sm text-muted">{intro}</p>
        <label className="admin-field">
          {label}
          {required ? " *" : ""}
          <textarea rows={4} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} required={required} autoFocus />
        </label>
        {error ? <p className="text-sm text-rose">{error}</p> : null}
        <div className="admin-modal-actions">
          <button type="submit" className={danger ? "btn-danger" : "pay-submit"} disabled={!ok || busy}>
            {busy ? "Salvando…" : confirm}
          </button>
          <button type="button" className="btn-outline" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

function RequestCard({ req, onDone, compact, onOpenUser }: { req: Req; onDone: () => void; compact?: boolean; onOpenUser?: (id: string) => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function act(decision: "desbloquear" | "recusar") {
    setBusy(true);
    setError("");
    const r = await adminResolveUnblock({ data: { requestId: req.id, decision, note: note.trim() || undefined } }).catch(() => ({
      ok: false as const,
      error: "Não foi possível salvar.",
    }));
    setBusy(false);
    if (!r.ok) setError(r.error);
    else onDone();
  }
  return (
    <article className={cn("req-card", req.status !== "pending" && "is-done")} data-testid="unblock-request">
      {!compact ? (
        <header>
          <strong>{req.name || req.email || req.user_id.slice(0, 8)}</strong>
          <span className="text-sm text-muted"> {req.email}</span>
          {onOpenUser ? (
            <button type="button" className="link-btn ml-2" onClick={() => onOpenUser(req.user_id)}>
              ver usuário
            </button>
          ) : null}
        </header>
      ) : null}
      {req.block_reason ? <p className="text-sm text-muted">Motivo do bloqueio: {req.block_reason}</p> : null}
      <blockquote>{req.message}</blockquote>
      <small className="text-muted">Enviado em {fmtDate(req.created_at)}</small>
      {req.status === "pending" ? (
        <>
          <label className="admin-field">
            Resposta (opcional)
            <textarea rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          {error ? <p className="text-sm text-rose">{error}</p> : null}
          <div className="admin-modal-actions">
            <button type="button" className="pay-submit" disabled={busy} onClick={() => void act("desbloquear")}>
              Desbloquear
            </button>
            <button type="button" className="btn-outline" disabled={busy} onClick={() => void act("recusar")}>
              Recusar
            </button>
          </div>
        </>
      ) : (
        <p className="text-sm">
          <b>{req.status === "approved" ? "Desbloqueado" : "Recusado"}</b> em {fmtDate(req.resolved_at)} por {req.resolved_by}
          {req.admin_note ? ` — “${req.admin_note}”` : ""}
        </p>
      )}
    </article>
  );
}

export function AdminUnblockRequests({ onOpenUser, onChange }: { onOpenUser: (id: string) => void; onChange?: () => void }) {
  const [rows, setRows] = useState<Req[] | null>(null);
  function reload() {
    void adminUnblockRequests().then(setRows).catch(() => setRows([]));
    onChange?.();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reload, []);
  const pending = (rows ?? []).filter((r) => r.status === "pending");
  const done = (rows ?? []).filter((r) => r.status !== "pending");
  return (
    <div data-testid="unblock-requests">
      <h2>Pedidos de desbloqueio</h2>
      {!rows ? <p className="text-muted">Lendo os pedidos…</p> : null}
      {rows && !pending.length ? <p className="text-sm text-muted">Nenhum pedido esperando resposta.</p> : null}
      <div className="grid gap-3">
        {pending.map((r) => (
          <RequestCard key={r.id} req={r} onDone={reload} onOpenUser={onOpenUser} />
        ))}
      </div>
      {done.length ? (
        <>
          <h3 className="mt-8 font-display text-xl">Respondidos</h3>
          <div className="mt-3 grid gap-3">
            {done.map((r) => (
              <RequestCard key={r.id} req={r} onDone={reload} onOpenUser={onOpenUser} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
