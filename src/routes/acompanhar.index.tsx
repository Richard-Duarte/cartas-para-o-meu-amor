import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { letterFromRecord, letterProgress, shownFromName, type Letter } from "@/lib/letters";
import { getMessenger } from "@/lib/messengers";
import { myMailbox } from "@/lib/server/shop";

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
  if (!user) return <RedirectToSignIn next="/acompanhar" />;

  const box = sent ?? [];
  const inFlight = box.filter((l) => !letterProgress(l).arrived);
  const incoming = received.filter((l) => !letterProgress(l).arrived);

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-5 py-12">
        <p className="text-xs uppercase tracking-widest text-rose">Acompanhar</p>
        <h1 className="mt-2 font-logo text-4xl italic leading-tight sm:text-5xl">Cartas no ar.</h1>
        <p className="mt-3 max-w-lg text-muted">
          O mapa só abre o que é seu — enviadas por você ou recebidas no seu nome.
        </p>

        <section className="mt-10">
          <h2 className="font-display text-2xl">Em andamento</h2>
          {inFlight.length + incoming.length === 0 ? (
            <p className="mt-3 text-muted">Nenhuma carta a caminho agora.</p>
          ) : (
            <ul className="mailbox-list mt-4">
              {inFlight.map((l) => (
                <LetterCard key={l.id} letter={l} tone="sent" />
              ))}
              {incoming.map((l) => (
                <LetterCard key={l.id} letter={l} tone="received" />
              ))}
            </ul>
          )}
        </section>

        <Link to="/escrever" className="closing-cta-btn mt-10 inline-flex">
          Escrever uma carta
        </Link>
        <Link to="/conta" className="mt-4 block text-sm text-muted underline-offset-4 hover:underline">
          Ver enviadas e recebidas
        </Link>
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
