import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { authClient, signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { formatMoney } from "@/lib/cart";
import { letterFromRecord, letterProgress, type Letter } from "@/lib/letters";
import { getMessenger } from "@/lib/messengers";
import { accountAuthKind, saveAccountPassword } from "@/lib/server/account";
import {
  MIN_PAYOUT_BRL,
  myMailbox,
  myPayouts,
  myProfile,
  publicAffiliatePercent,
  requestPayout,
} from "@/lib/server/shop";

export const Route = createFileRoute("/conta")({ component: AccountPage });

function AccountPage() {
  const { user, isPending } = useCurrentUserState();
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof myProfile>> | null>(null);
  const [copied, setCopied] = useState(false);
  const [percent, setPercent] = useState(10);
  const [sent, setSent] = useState<Letter[]>([]);
  const [received, setReceived] = useState<Letter[]>([]);
  const [payouts, setPayouts] = useState<Awaited<ReturnType<typeof myPayouts>>>([]);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  useEffect(() => {
    if (!user) return;
    void myProfile().then(setProfile).catch(() => setProfile(null));
    void publicAffiliatePercent().then(setPercent).catch(() => {});
    void myMailbox()
      .then((box) => {
        setSent((box.sent ?? []).map(letterFromRecord));
        setReceived((box.received ?? []).map(letterFromRecord));
      })
      .catch(() => {
        setSent([]);
        setReceived([]);
      });
    void myPayouts().then(setPayouts).catch(() => setPayouts([]));
  }, [user]);

  if (isPending) {
    return (
      <div className="min-h-dvh">
        <SiteHeader />
        <main className="mx-auto max-w-lg px-5 py-16 text-muted">Abrindo sua conta…</main>
      </div>
    );
  }
  if (!user) return <RedirectToSignIn next="/conta" />;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = profile?.affiliate_code ? `${origin}/escrever?ref=${profile.affiliate_code}` : "";

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-5 py-16">
        <p className="text-xs uppercase tracking-widest text-rose">Minha conta</p>
        <h1 className="mt-2 font-logo text-4xl italic sm:text-5xl">Sua caixa de cartas.</h1>
        <p className="mt-3 text-muted">
          Enviadas, recebidas, e o crédito de quem chega pelo seu convite.
        </p>

        <ProfileSettings
          name={user.displayName}
          email={user.primaryEmail}
          image={user.profileImageUrl}
        />

        <button
          type="button"
          className="sign-out-btn"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            setSignOutError("");
            void signOut("/").catch(() => {
              setSigningOut(false);
              setSignOutError("Não foi possível sair. Tente de novo.");
            });
          }}
        >
          {signingOut ? "Saindo…" : "Sair"}
        </button>
        {signOutError ? <p className="mt-2 text-sm text-rose">{signOutError}</p> : null}

        <section className="mt-10">
          <h2 className="font-display text-2xl">Enviadas</h2>
          {sent.length === 0 ? (
            <p className="mt-3 text-muted">Você ainda não enviou nenhuma carta.</p>
          ) : (
            <ul className="mailbox-list mt-4">
              {sent.map((l) => (
                <MailCard key={l.id} letter={l} tone="sent" />
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl">Recebidas</h2>
          {received.length === 0 ? (
            <p className="mt-3 text-muted">Nenhuma carta chegou na sua conta ainda. Quem abrir o seu link deixa ela aqui.</p>
          ) : (
            <ul className="mailbox-list mt-4">
              {received.map((l) => (
                <MailCard key={l.id} letter={l} tone="received" />
              ))}
            </ul>
          )}
        </section>

        <div className="cart-card mt-12">
          <p className="cart-kicker">Afiliado</p>
          <h2>Seu link, seu crédito.</h2>
          <p className="mt-2 text-sm text-muted">
            Quem lacrar uma carta pelo seu link te paga {percent}% do valor em dinheiro,
            e ainda deixa crédito na loja.
          </p>
          <p className="cart-kicker mt-5">Crédito na loja</p>
          <b className="block font-display text-2xl">{formatMoney(profile?.credit_brl ?? 0)}</b>
          <p className="cart-kicker mt-5">A receber em dinheiro</p>
          <b className="block font-display text-2xl">{formatMoney(profile?.payable_brl ?? 0)}</b>
          <PayoutBox
            amount={profile?.payable_brl ?? 0}
            payouts={payouts}
            onDone={(nextAmount, nextPayouts) => {
              setProfile((prev) => (prev ? { ...prev, payable_brl: nextAmount } : prev));
              setPayouts(nextPayouts);
            }}
          />
          <p className="mt-4 text-sm text-muted">Código {profile?.affiliate_code ?? "…"}</p>
          <code className="mt-2 block break-all text-sm">{link || "Gerando…"}</code>
          <button type="button" className="pay-submit mt-4" onClick={() => void copy()} disabled={!link}>
            {copied ? "Link copiado" : "Copiar link"}
          </button>
        </div>
        <Link to="/escrever" className="mt-6 inline-block text-sm text-muted underline-offset-4 hover:underline">
          Escrever uma carta
        </Link>
      </main>
    </div>
  );
}

function PayoutBox({
  amount,
  payouts,
  onDone,
}: {
  amount: number;
  payouts: Awaited<ReturnType<typeof myPayouts>>;
  onDone: (amount: number, payouts: Awaited<ReturnType<typeof myPayouts>>) => void;
}) {
  const pending = payouts.find((p) => p.status === "pending");
  const [ask, setAsk] = useState(false);
  const [pixKind, setPixKind] = useState<"cpf" | "cnpj" | "email" | "celular" | "aleatoria">("aleatoria");
  const [pixKey, setPixKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (pending) {
    return (
      <p className="mt-3 text-sm text-muted">
        Saque de {formatMoney(pending.amount_brl)} solicitado. Chave PIX ({pending.pix_kind}): {pending.pix_key}.
        Assim que o pagamento sair, o status muda no escritório.
      </p>
    );
  }

  if (!ask) {
    return (
      <div className="mt-3">
        {amount >= MIN_PAYOUT_BRL ? (
          <button type="button" className="pay-submit" onClick={() => setAsk(true)}>
            Pedir saque
          </button>
        ) : (
          <p className="text-sm text-muted">
            O saque fica disponível a partir de {formatMoney(MIN_PAYOUT_BRL)}.
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      className="profile-pass"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        void requestPayout({ data: { pixKey, pixKind } })
          .then((r) => {
            setBusy(false);
            if (!r.ok) {
              setError(r.error);
              return;
            }
            setAsk(false);
            onDone(0, [
              {
                id: "local",
                amount_brl: r.amount,
                pix_key: pixKey,
                pix_kind: pixKind,
                status: "pending",
                created_at: new Date().toISOString(),
              },
              ...payouts,
            ]);
          })
          .catch(() => {
            setBusy(false);
            setError("Não foi possível pedir o saque.");
          });
      }}
    >
      <h3>Chave PIX</h3>
      <p className="text-sm text-muted">Informe a chave para receber {formatMoney(amount)}.</p>
      <label>
        Tipo
        <select value={pixKind} onChange={(e) => setPixKind(e.target.value as typeof pixKind)}>
          <option value="aleatoria">Aleatória</option>
          <option value="cpf">CPF</option>
          <option value="cnpj">CNPJ</option>
          <option value="email">E-mail</option>
          <option value="celular">Celular</option>
        </select>
      </label>
      <label>
        Chave
        <input value={pixKey} onChange={(e) => setPixKey(e.target.value)} required minLength={5} placeholder="Sua chave PIX" />
      </label>
      {error ? <p className="text-sm text-rose">{error}</p> : null}
      <button type="submit" className="pay-submit" disabled={busy}>
        {busy ? "Enviando…" : "Confirmar saque"}
      </button>
    </form>
  );
}


function ProfileSettings({
  name,
  email,
  image,
}: {
  name: string | null;
  email: string | null;
  image: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState(image);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const initial = (name || email || "A").charAt(0).toUpperCase();

  useEffect(() => {
    void accountAuthKind()
      .then((r) => setHasPassword(r.hasPassword))
      .catch(() => setHasPassword(false));
  }, []);

  function onPhoto(file: File) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const size = 256;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      const data = canvas.toDataURL("image/jpeg", 0.86);
      URL.revokeObjectURL(url);
      setBusy(true);
      void authClient
        .updateUser({ image: data })
        .then(({ error: err }) => {
          setBusy(false);
          if (err) setError(err.message ?? "Não foi possível salvar a foto.");
          else {
            setPhoto(data);
            setError("");
            setMsg("Foto atualizada.");
          }
        })
        .catch(() => {
          setBusy(false);
          setError("Não foi possível salvar a foto.");
        });
    };
    img.src = url;
  }

  async function onPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    if (next.length < 8) {
      setError("A senha precisa de pelo menos 8 caracteres.");
      return;
    }
    if (next !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setBusy(true);
    const r = await saveAccountPassword({
      data: { current: hasPassword ? current : undefined, next },
    }).catch(() => ({ ok: false as const, error: "Não foi possível salvar a senha." }));
    setBusy(false);
    if (!r.ok) {
      setError(r.error ?? "Não foi possível salvar a senha.");
      return;
    }
    setHasPassword(true);
    setCurrent("");
    setNext("");
    setConfirm("");
    setMsg(hasPassword ? "Senha alterada." : "Senha cadastrada. Você já pode entrar com e-mail.");
  }

  return (
    <section className="profile-card mt-10">
      <p className="cart-kicker">Perfil</p>
      <div className="profile-row">
        <button
          type="button"
          className="profile-avatar"
          onClick={() => fileRef.current?.click()}
          aria-label="Alterar foto de perfil"
        >
          {photo ? <img src={photo} alt="" /> : <span>{initial}</span>}
        </button>
        <div>
          <h2 className="font-display text-2xl">{name || "Sem nome"}</h2>
          <p className="text-sm text-muted">{email || "Sem e-mail"}</p>
          <button type="button" className="profile-photo-btn" onClick={() => fileRef.current?.click()} disabled={busy}>
            Alterar foto
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPhoto(file);
            e.target.value = "";
          }}
        />
      </div>

      {hasPassword === null ? null : (
        <form className="profile-pass" onSubmit={(e) => void onPassword(e)}>
          <h3>{hasPassword ? "Alterar senha" : "Cadastrar uma senha"}</h3>
          <p className="text-sm text-muted">
            {hasPassword
              ? "Troque a senha da sua conta."
              : "Você entrou com Google ou X. Cadastre uma senha para também entrar com e-mail."}
          </p>
          {hasPassword ? (
            <label>
              Senha atual
              <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
            </label>
          ) : null}
          <label>
            Nova senha
            <input type="password" value={next} onChange={(e) => setNext(e.target.value)} minLength={8} required />
          </label>
          <label>
            Confirmar senha
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required />
          </label>
          {error ? <p className="text-sm text-rose">{error}</p> : null}
          {msg ? <p className="text-sm">{msg}</p> : null}
          <button type="submit" className="pay-submit" disabled={busy}>
            {busy ? "Salvando…" : hasPassword ? "Salvar senha" : "Cadastrar senha"}
          </button>
        </form>
      )}
    </section>
  );
}

function MailCard({ letter, tone }: { letter: Letter; tone: "sent" | "received" }) {
  const m = getMessenger(letter.messengerId);
  const stats = letterProgress(letter);
  return (
    <li>
      <Link to="/acompanhar/$letterId" params={{ letterId: letter.id }} className="mailbox-card">
        <p className="cart-kicker">
          {tone === "sent" ? "Enviada" : "Recebida"} · {m.name}
        </p>
        <strong>
          {letter.fromName} → {letter.toName}
        </strong>
        <span>{stats.arrived ? "Chegou" : `A caminho · ${Math.round(stats.progress * 100)}%`}</span>
      </Link>
    </li>
  );
}
