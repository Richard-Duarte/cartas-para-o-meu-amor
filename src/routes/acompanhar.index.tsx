import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { letterFromRecord, letterProgress, shownFromName, type Letter } from "@/lib/letters";
import { getMessenger } from "@/lib/messengers";
import { myMailbox } from "@/lib/server/shop";
import { PUBLIC_TRACKING } from "@/lib/public-tracking";

/** Aceita o link inteiro (…/acompanhar/abc123) ou só o código. */
function trackingCode(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  const fromLink = text.match(/acompanhar\/([A-Za-z0-9_-]{3,16})/);
  if (fromLink) return fromLink[1];
  const bare = text.replace(/^#/, "");
  return /^[A-Za-z0-9_-]{3,16}$/.test(bare) ? bare : null;
}

/** Colar o link ou digitar o código: funciona sem login. */
function TrackByCode() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      className="track-code pay-card-form"
      onSubmit={(e) => {
        e.preventDefault();
        const code = trackingCode(value);
        if (!code) {
          setError("Cole o link que você recebeu ou digite o código da carta.");
          return;
        }
        setError("");
        void navigate({ to: "/acompanhar/$letterId", params: { letterId: code } });
      }}
    >
      <label>
        Link ou código da carta
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Cole o link ou digite o código"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          aria-invalid={Boolean(error)}
        />
      </label>
      {error ? <p className="text-sm text-rose" role="alert">{error}</p> : null}
      <button type="submit" className="pay-submit">
        Ver no mapa
      </button>
    </form>
  );
}

export const Route = createFileRoute("/acompanhar/")({
  component: TrackInbox,
});

function TrackInbox() {
  const { user, isPending } = useCurrentUserState();
  const [sent, setSent] = useState<Letter[] | null>(null);
  const [received, setReceived] = useState<Letter[]>([]);

  useEffect(() => {
    if (!user) return;
    void myMailbox()
      .then((box) => {
        setSent((box.sent ?? []).map(letterFromRecord));
        setReceived((box.received ?? []).map(letterFromRecord));
      })
      .catch(() => {
        setSent([]);
        setReceived([]);
      });
  }, [user]);

  if (isPending || (user && sent === null)) {
    return (
      <div className="min-h-dvh">
        <SiteHeader />
        <main className="mx-auto max-w-lg px-5 py-16 text-muted">Procurando cartas a caminho…</main>
      </div>
    );
  }
  if (!user && !PUBLIC_TRACKING) return <RedirectToSignIn next="/acompanhar" />;
  if (!user) {
    return (
      <div className="min-h-dvh">
        <SiteHeader />
        <main className="mx-auto max-w-2xl px-5 py-12">
          <p className="text-xs uppercase tracking-widest text-rose">Acompanhar</p>
          <h1 className="mt-2 font-logo text-4xl italic leading-tight sm:text-5xl">Onde está a carta?</h1>
          <p className="mt-3 max-w-lg text-muted">
            Cole o link que chegou para você (ou digite o código) e veja o mensageiro a caminho. Não precisa entrar.
          </p>
          <div className="mt-8 max-w-lg">
            <TrackByCode />
          </div>
          <p className="mt-8 text-sm text-muted">
            Quer ver todas as suas cartas?{" "}
            <Link to="/login" search={{ next: "/acompanhar" }} className="text-rose underline">
              Entre na sua conta
            </Link>
            .
          </p>
        </main>
      </div>
    );
  }

  const box = sent ?? [];

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-5 py-12">
        <p className="text-xs uppercase tracking-widest text-rose">Acompanhar</p>
        <h1 className="mt-2 font-logo text-4xl italic leading-tight sm:text-5xl">Cartas no ar.</h1>
        <p className="mt-3 max-w-lg text-muted">
          Abra qualquer carta pelo link ou código, ou veja abaixo as suas — enviadas e recebidas.
        </p>

        <div className="mt-8 max-w-lg">
          <TrackByCode />
        </div>

        <h2 className="mt-10 font-display text-2xl">Minhas cartas</h2>
        <Link to="/escrever" className="closing-cta-btn mt-6 inline-flex">
          Escrever uma carta
        </Link>

        <section className="mt-10">
          <h2 className="font-display text-2xl">Enviadas</h2>
          {box.length === 0 ? (
            <p className="mt-3 text-muted">Nenhuma carta enviada ainda.</p>
          ) : (
            <ul className="mailbox-list mt-4">
              {box.map((l) => (
                <LetterCard key={l.id} letter={l} tone="sent" />
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl">Recebidas</h2>
          {received.length === 0 ? (
            <p className="mt-3 text-muted">Nenhuma carta recebida ainda.</p>
          ) : (
            <ul className="mailbox-list mt-4">
              {received.map((l) => (
                <LetterCard key={l.id} letter={l} tone="received" />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function LetterCard({ letter, tone }: { letter: Letter; tone: "sent" | "received" }) {
  const m = getMessenger(letter.messengerId);
  const stats = letterProgress(letter);
  return (
    <li>
      <Link to="/acompanhar/$letterId" params={{ letterId: letter.id }} className="mailbox-card">
        <p className="cart-kicker">{tone === "sent" ? "Enviada" : "Recebida"} · {m.name}</p>
        <strong>
          {shownFromName(letter, tone === "sent" ? "sender" : "public")} → {letter.toName}
        </strong>
        <span>{stats.arrived ? "Chegou" : `A caminho · ${Math.round(stats.progress * 100)}%`}</span>
      </Link>
    </li>
  );
}
