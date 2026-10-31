"use client";

import { useCallback, useEffect, useState } from "react";
import { formatBrl, formatMoney } from "@/lib/cart";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminUnblockRequests, AdminUsers } from "@/components/admin/AdminUsers";
import { adminPendingCount } from "@/lib/server/admin-panel";
import { bootCatalog } from "@/lib/catalog";
import { signOut } from "@/lib/auth/client";
import {
  adminLogin,
  adminLogout,
  adminSession,
  changeAdminPassword,
  getSettings,
  saveSettings,
} from "@/lib/server/admin-auth";
import {
  listAffiliates,
  listPayouts,
  markPayoutPaid,
  listCatalog,
  listCoupons,
  listReferralUses,
  saveCoupon,
  saveMessenger,
  saveTemplate,
} from "@/lib/server/shop";
import { adminListNotices, adminPublishNotice } from "@/lib/server/notifications";
import { cn } from "@/lib/utils";

type Tab = "painel" | "usuarios" | "desbloqueios" | "templates" | "mensageiros" | "cupons" | "afiliados" | "avisos" | "senha";

const TABS: { id: Tab; label: string }[] = [
  { id: "painel", label: "Painel" },
  { id: "usuarios", label: "Usuários" },
  { id: "desbloqueios", label: "Desbloqueios" },
  { id: "templates", label: "Templates" },
  { id: "mensageiros", label: "Mensageiros" },
  { id: "cupons", label: "Cupons" },
  { id: "afiliados", label: "Afiliados" },
  { id: "avisos", label: "Avisos" },
  { id: "senha", label: "Senha" },
];

async function fileToDataUrl(file: File) {
  if (file.size > 1_800_000) throw new Error("Arquivo acima de 1,8 MB");
  return await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function AdminApp() {
  const [tab, setTab] = useState<Tab>("painel");
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [pending, setPending] = useState(0);
  const [focusUser, setFocusUser] = useState<string | null>(null);
  const refreshPending = useCallback(() => {
    void adminPendingCount().then(setPending).catch(() => {});
  }, []);
  const clearFocus = useCallback(() => setFocusUser(null), []);

  useEffect(() => {
    void adminSession()
      .then((s) => setAllowed(s.ok))
      .catch(() => setAllowed(false));
  }, []);

  useEffect(() => {
    if (allowed) refreshPending();
  }, [allowed, tab, refreshPending]);

  if (allowed === null) {
    return <main className="mx-auto max-w-lg px-5 py-16 text-muted">Abrindo o escritório…</main>;
  }
  if (!allowed) {
    return <AdminLogin onOk={() => setAllowed(true)} />;
  }

  return (
    <div className="admin">
      <aside className="admin-nav">
        <p className="cart-kicker">Administração</p>
        <h1>O escritório</h1>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={cn(tab === t.id && "is-on")}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === "desbloqueios" && pending > 0 ? (
              <span className="admin-badge" aria-label={`${pending} pendentes`}>
                {pending}
              </span>
            ) : null}
          </button>
        ))}
        <button type="button" onClick={() => void adminLogout().then(() => signOut("/login")).catch(() => setAllowed(false))}>
          Sair
        </button>
      </aside>
      <section className="admin-body">
        {tab === "painel" ? <AdminDashboard /> : null}
        {tab === "usuarios" ? <AdminUsers focusUserId={focusUser} onFocused={clearFocus} /> : null}
        {tab === "desbloqueios" ? (
          <AdminUnblockRequests
            onChange={refreshPending}
            onOpenUser={(id) => {
              setFocusUser(id);
              setTab("usuarios");
            }}
          />
        ) : null}
        {tab === "templates" ? <Templates /> : null}
        {tab === "mensageiros" ? <Messengers /> : null}
        {tab === "cupons" ? <Coupons /> : null}
        {tab === "afiliados" ? <Affiliates /> : null}
        {tab === "avisos" ? <Notices /> : null}
        {tab === "senha" ? <PasswordPanel /> : null}
      </section>
    </div>
  );
}

function Templates() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listCatalog>>["templates"]>([]);
  const [form, setForm] = useState({
    id: "",
    name: "",
    tagline: "",
    src: "",
    fontFamily: "Fraunces, serif",
    ink: "dark" as "dark" | "light",
    paid: false,
    priceBrl: 0,
    sortOrder: 10,
  });
  const [msg, setMsg] = useState("");

  async function reload() {
    const c = await listCatalog();
    setRows(c.templates);
    await bootCatalog();
  }
  useEffect(() => {
    void reload();
  }, []);

  return (
    <div>
      <h2>Templates</h2>
      <p className="mb-4 text-muted">
        Envie um PNG ou JPG do Canva. O fundo deve vir sem texto — a escrita
        acontece no editor.
      </p>
      <div className="admin-grid-cards">
        {rows.map((t) => (
          <button
            key={t.id}
            type="button"
            className="admin-thumb"
            onClick={() =>
              setForm({
                id: t.id,
                name: t.name,
                tagline: t.tagline,
                src: t.src,
                fontFamily: t.font_family,
                ink: t.ink === "light" ? "light" : "dark",
                paid: t.paid,
                priceBrl: t.price_brl,
                sortOrder: t.sort_order,
              })
            }
          >
            <img src={t.src} alt="" />
            <span>
              {t.name} · {t.paid ? formatBrl(t.price_brl) : "Grátis"}
            </span>
          </button>
        ))}
      </div>
      <form
        className="pay-card-form mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          void saveTemplate({
            data: {
              id: form.id || form.name.toLowerCase().replace(/\s+/g, "-"),
              name: form.name,
              tagline: form.tagline,
              src: form.src,
              fontFamily: form.fontFamily,
              ink: form.ink,
              paid: form.paid,
              priceBrl: Number(form.priceBrl),
              sortOrder: Number(form.sortOrder),
            },
          })
            .then(() => {
              setMsg("Papel salvo.");
              void reload();
            })
            .catch((err) => setMsg(String(err)));
        }}
      >
        <label>
          Id
          <input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} />
        </label>
        <label>
          Nome
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </label>
        <label>
          Tagline
          <input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
        </label>
        <label>
          Fonte
          <input value={form.fontFamily} onChange={(e) => setForm({ ...form, fontFamily: e.target.value })} />
        </label>
        <label>
          Arquivo Canva
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              void fileToDataUrl(f).then((src) => setForm({ ...form, src }));
            }}
          />
        </label>
        {form.src ? <img src={form.src} alt="" className="h-40 w-28 object-cover" /> : null}
        <div className="pay-row">
          <label>
            Preço
            <input
              type="number"
              min={0}
              step={0.01}
              inputMode="decimal"
              value={form.priceBrl}
              onChange={(e) =>
                setForm({ ...form, priceBrl: Number(e.target.value), paid: Number(e.target.value) > 0 })
              }
            />
          </label>
          <label>
            Tinta
            <select
              value={form.ink}
              onChange={(e) => setForm({ ...form, ink: e.target.value as "dark" | "light" })}
            >
              <option value="dark">Escura</option>
              <option value="light">Clara</option>
            </select>
          </label>
        </div>
        <button className="pay-submit" type="submit">
          Salvar papel
        </button>
        {msg ? <p className="text-sm text-muted">{msg}</p> : null}
      </form>
    </div>
  );
}

function Messengers() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listCatalog>>["messengers"]>([]);
  const [form, setForm] = useState({
    id: "",
    name: "",
    tagline: "",
    flavor: "",
    speedKmh: 20,
    priceBrl: 12,
    photoSrc: "",
    previewSrc: "",
    mapSrc: "",
    arriveSrc: "",
    token: "pigeon",
    sortOrder: 10,
  });
  const [msg, setMsg] = useState("");
  async function reload() {
    const c = await listCatalog();
    setRows(c.messengers);
    await bootCatalog();
  }
  useEffect(() => {
    void reload();
  }, []);

  async function onMedia(key: "photoSrc" | "previewSrc" | "mapSrc" | "arriveSrc", file?: File) {
    if (!file) return;
    const src = await fileToDataUrl(file);
    setForm((f) => ({ ...f, [key]: src }));
  }

  return (
    <div>
      <h2>Mensageiros</h2>
      <p className="mb-4 text-muted">
        Nome, preço, foto, preview e as animações do mapa (ida e chegada).
      </p>
      <div className="admin-grid-cards">
        {rows.map((m) => (
          <button
            key={m.id}
            type="button"
            className="admin-thumb"
            onClick={() =>
              setForm({
                id: m.id,
                name: m.name,
                tagline: m.tagline,
                flavor: m.flavor,
                speedKmh: Number(m.speed_kmh),
                priceBrl: m.price_brl,
                photoSrc: m.photo_src,
                previewSrc: m.preview_src,
                mapSrc: m.map_src,
                arriveSrc: m.arrive_src,
                token: m.token,
                sortOrder: m.sort_order,
              })
            }
          >
            <img src={m.photo_src} alt="" />
            <span>
              {m.name} · {formatBrl(m.price_brl)}
            </span>
          </button>
        ))}
      </div>
      <form
        className="pay-card-form mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          void saveMessenger({
            data: {
              id: form.id || form.name.toLowerCase().replace(/\s+/g, "-"),
              name: form.name,
              tagline: form.tagline,
              flavor: form.flavor,
              speedKmh: Number(form.speedKmh),
              priceBrl: Number(form.priceBrl),
              photoSrc: form.photoSrc,
              previewSrc: form.previewSrc,
              mapSrc: form.mapSrc,
              arriveSrc: form.arriveSrc,
              token: form.token,
              sortOrder: Number(form.sortOrder),
            },
          })
            .then(() => {
              setMsg("Mensageiro salvo.");
              void reload();
            })
            .catch((err) => setMsg(String(err)));
        }}
      >
        <label>
          Id
          <input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} />
        </label>
        <label>
          Nome
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </label>
        <label>
          Tagline
          <input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
        </label>
        <label>
          Texto
          <input value={form.flavor} onChange={(e) => setForm({ ...form, flavor: e.target.value })} />
        </label>
        <div className="pay-row">
          <label>
            km/h
            <input
              type="number"
              value={form.speedKmh}
              onChange={(e) => setForm({ ...form, speedKmh: Number(e.target.value) })}
            />
          </label>
          <label>
            Preço
            <input
              type="number"
              min={0}
              step={0.01}
              inputMode="decimal"
              value={form.priceBrl}
              onChange={(e) => setForm({ ...form, priceBrl: Number(e.target.value) })}
            />
          </label>
        </div>
        <label>
          Foto
          <input type="file" accept="image/*" onChange={(e) => void onMedia("photoSrc", e.target.files?.[0])} />
        </label>
        <label>
          Preview (vídeo ou gif)
          <input type="file" accept="image/*,video/*" onChange={(e) => void onMedia("previewSrc", e.target.files?.[0])} />
        </label>
        <label>
          Animação do mapa
          <input type="file" accept="image/*,video/*" onChange={(e) => void onMedia("mapSrc", e.target.files?.[0])} />
        </label>
        <label>
          Animação de chegada
          <input type="file" accept="image/*,video/*" onChange={(e) => void onMedia("arriveSrc", e.target.files?.[0])} />
        </label>
        <button className="pay-submit" type="submit">
          Salvar mensageiro
        </button>
        {msg ? <p className="text-sm text-muted">{msg}</p> : null}
      </form>
    </div>
  );
}

function Coupons() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listCoupons>>>([]);
  const [refs, setRefs] = useState<Awaited<ReturnType<typeof listReferralUses>>>([]);
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState(10);
  const [amount, setAmount] = useState(0);
  const reload = useCallback(() => {
    void listCoupons().then(setRows).catch(() => setRows([]));
    void listReferralUses().then(setRefs).catch(() => setRefs([]));
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  const total = rows.reduce((n, c) => n + Number(c.redemptions || 0), 0);
  return (
    <div>
      <h2>Cupons</h2>
      <p className="mb-2 text-muted">
        Usos contados no servidor (tabela de usos). {total} uso{total === 1 ? "" : "s"} de cupom no total.
      </p>
      <ul className="mt-4 grid gap-2" data-testid="admin-coupons">
        {rows.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-paper px-4 py-3"
          >
            <span>
              <strong>{c.code}</strong> ·{" "}
              {c.rule === "second_send"
                ? "2º envio grátis · 1x por conta"
                : c.percent
                  ? `${c.percent}%`
                  : formatBrl(c.amount_brl)}
              {c.active ? null : <span className="text-muted"> · desligado</span>}
            </span>
            <span className="flex items-center gap-3">
              <span className="admin-coupon-count" data-code={c.code}>
                <b>{c.redemptions}</b> uso{c.redemptions === 1 ? "" : "s"}
              </span>
              <button
                type="button"
                className="text-sm underline-offset-4 hover:underline"
                onClick={() =>
                  void saveCoupon({
                    data: { id: c.id, code: c.code, percent: c.percent, amountBrl: Number(c.amount_brl), active: !c.active },
                  }).then(reload)
                }
              >
                {c.active ? "Desligar" : "Ligar"}
              </button>
            </span>
          </li>
        ))}
      </ul>
      <h3 className="mt-8 font-display text-xl">Códigos de indicação</h3>
      {refs.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Nenhuma carta enviada com código de indicação ainda.</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {refs.map((r) => (
            <li key={r.code} className="flex justify-between rounded-xl border border-line bg-paper px-4 py-3">
              <span>
                <strong>{r.code}</strong>
                {r.owner ? <span className="text-muted"> · {r.owner}</span> : null}
              </span>
              <span className="text-muted">
                {r.redemptions} uso{r.redemptions === 1 ? "" : "s"}
              </span>
            </li>
          ))}
        </ul>
      )}
      <form
        className="pay-card-form mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          void saveCoupon({
            data: { code, percent, amountBrl: amount, active: true },
          }).then(reload);
        }}
      >
        <label>
          Código
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required />
        </label>
        <div className="pay-row">
          <label>
            %
            <input type="number" min={0} max={100} value={percent} onChange={(e) => setPercent(Number(e.target.value))} />
          </label>
          <label>
            R$ fixo
            <input
              type="number"
              min={0}
              step={0.01}
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </label>
        </div>
        <button className="pay-submit" type="submit">
          Criar cupom
        </button>
      </form>
    </div>
  );
}

function Affiliates() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listAffiliates>>>([]);
  const [payouts, setPayouts] = useState<Awaited<ReturnType<typeof listPayouts>>>([]);
  const [percent, setPercent] = useState(10);
  const [msg, setMsg] = useState("");
  const [anonFee, setAnonFee] = useState(5.9);
  const [scheduleFee, setScheduleFee] = useState(9.9);
  useEffect(() => {
    void listAffiliates().then(setRows).catch(() => setRows([]));
    void listPayouts().then(setPayouts).catch(() => setPayouts([]));
    void getSettings()
      .then((st) => {
        setPercent(st.affiliatePercent);
        if (Number.isFinite(st.anonymousFee)) setAnonFee(st.anonymousFee);
        if (Number.isFinite(st.scheduleFee)) setScheduleFee(st.scheduleFee);
      })
      .catch(() => {});
  }, []);
  return (
    <div>
      <h2>Saques pedidos</h2>
      <p className="mb-4 text-muted">
        Afiliados que solicitaram saque, com valor e chave PIX.
      </p>
      {payouts.length === 0 ? (
        <p className="text-sm text-muted">Nenhum afiliado solicitou saque ainda.</p>
      ) : (
        <ul className="grid gap-2">
          {payouts.map((p) => (
            <li key={p.id} className="rounded-xl border border-line bg-paper px-4 py-3">
              <p className="cart-kicker">{p.status === "paid" ? "Pago" : "Pendente"}</p>
              <strong>{p.display_name || p.user_id}</strong>
              <p className="mt-2 text-sm">
                Valor: <b>{formatMoney(p.amount_brl)}</b>
              </p>
              <p className="text-sm">
                Chave PIX ({p.pix_kind}): <code className="break-all">{p.pix_key}</code>
              </p>
              {p.status === "pending" ? (
                <button
                  type="button"
                  className="pay-submit mt-3"
                  onClick={() =>
                    void markPayoutPaid({ data: p.id }).then(() => listPayouts().then(setPayouts))
                  }
                >
                  Marcar como pago
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <form
        className="pay-card-form mb-6 mt-10 max-w-sm"
        onSubmit={(e) => {
          e.preventDefault();
          void saveSettings({ data: { affiliatePercent: percent, anonymousFee: anonFee, scheduleFee } }).then(
            () => setMsg("Preços salvos."),
          );
        }}
      >
        <label>
          Porcentagem a pagar
          <input type="number" min={0} max={80} value={percent} onChange={(e) => setPercent(Number(e.target.value))} />
        </label>
        <label>
          Carta anônima (R$)
          <input
            type="number"
            min={0}
            max={999}
            step={0.01}
            value={anonFee}
            onChange={(e) => setAnonFee(Number(e.target.value))}
          />
        </label>
        <label>
          Agendar chegada (R$)
          <input
            type="number"
            min={0}
            max={999}
            step={0.01}
            value={scheduleFee}
            onChange={(e) => setScheduleFee(Number(e.target.value))}
          />
        </label>
        <button className="pay-submit" type="submit">Salvar preços</button>
        {msg ? <p className="text-sm text-muted">{msg}</p> : null}
      </form>
      <h3 className="font-display text-2xl">Todos os afiliados</h3>
      <ul className="mt-3 grid gap-2">
        {rows.map((a) => (
          <li key={a.user_id} className="rounded-xl border border-line bg-paper px-4 py-3">
            <strong>{a.display_name || a.affiliate_code}</strong>
            <p className="text-sm text-muted">
              {a.affiliate_code} · {a.events} indicações · crédito {formatMoney(a.credit_brl)} · saldo{" "}
              {formatMoney(a.payable_brl ?? 0)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Notices() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof adminListNotices>>>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<"platform" | "update">("platform");
  const [msg, setMsg] = useState("");

  function reload() {
    void adminListNotices().then(setRows).catch(() => setRows([]));
  }

  useEffect(() => {
    reload();
  }, []);

  return (
    <div>
      <h2>Avisos</h2>
      <p className="mb-4 text-muted">
        Um aviso da plataforma ou uma atualização cai no sininho de cada conta. O clique só marca como lido.
      </p>
      <form
        className="pay-card-form max-w-md"
        onSubmit={(event) => {
          event.preventDefault();
          setMsg("");
          void adminPublishNotice({ data: { title, body, kind } })
            .then(() => {
              setTitle("");
              setBody("");
              setMsg("Publicado. Entra no sininho na próxima abertura.");
              reload();
            })
            .catch(() => setMsg("Não foi possível publicar."));
        }}
      >
        <label>
          Título
          <input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={80} />
        </label>
        <label>
          Texto
          <input value={body} onChange={(event) => setBody(event.target.value)} maxLength={400} />
        </label>
        <label>
          Tipo
          <select value={kind} onChange={(event) => setKind(event.target.value === "update" ? "update" : "platform")}>
            <option value="platform">Aviso da plataforma</option>
            <option value="update">Atualização</option>
          </select>
        </label>
        <button className="pay-submit" type="submit">
          Publicar
        </button>
        {msg ? <p className="text-sm text-muted">{msg}</p> : null}
      </form>
      <ul className="mt-6 grid gap-2">
        {rows.map((row) => (
          <li key={row.id} className="rounded-xl border border-line bg-paper px-4 py-3">
            <p className="cart-kicker">{row.kind === "update" ? "Atualização" : "Aviso"}</p>
            <strong>{row.title}</strong>
            {row.body ? <p className="text-sm text-muted">{row.body}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AdminLogin({ onOk }: { onOk: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="mx-auto max-w-sm px-5 py-16">
      <p className="text-xs uppercase tracking-widest text-rose">Administração</p>
      <h1 className="mt-2 font-logo text-4xl italic sm:text-5xl">O escritório.</h1>
      <form
        className="pay-card-form mt-8"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          void adminLogin({ data: { username, password } })
            .then((r) => {
              setBusy(false);
              if (r.ok) onOk();
              else setError(r.message);
            })
            .catch((err: unknown) => {
              setBusy(false);
              setError(err instanceof Error ? err.message : "Não foi possível entrar");
            });
        }}
      >
        <label>
          Usuário
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        </label>
        <label>
          Senha
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </label>
        {error ? <p className="text-sm text-rose">{error}</p> : null}
        <button className="pay-submit" type="submit" disabled={busy}>
          {busy ? "Entrando…" : "Entrar"}
        </button>
      </form>
      <p className="mt-6 text-sm text-muted">
        Ou <a className="underline" href="/login?next=%2Fadmin">entre com o Google da marca</a> e volte aqui.
      </p>
    </main>
  );
}

function PasswordPanel() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState("");
  return (
    <div>
      <h2>Senha</h2>
      <p className="mb-4 text-muted">Troque a senha do usuário admin.</p>
      <form
        className="pay-card-form max-w-sm"
        onSubmit={(e) => {
          e.preventDefault();
          void changeAdminPassword({ data: { current, next } }).then((r) => {
            setMsg(r.ok ? "Senha atualizada." : r.message);
            if (r.ok) {
              setCurrent("");
              setNext("");
            }
          });
        }}
      >
        <label>
          Senha atual
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </label>
        <label>
          Nova senha
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} minLength={4} required />
        </label>
        <button className="pay-submit" type="submit">Alterar senha</button>
        {msg ? <p className="text-sm text-muted">{msg}</p> : null}
      </form>
    </div>
  );
}
