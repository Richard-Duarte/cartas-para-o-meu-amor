import { formatDateBr } from "@/lib/dates";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { letterArrivalState, markArrivalSeen } from "@/lib/server/letter-views";
import { DeliveryJourney, type DeliveryJourneyHandle } from "@/components/delivery/DeliveryJourney";
import { trackMeta } from "@/components/delivery/journey";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { downloadLetterPng } from "@/lib/download-letter";
import { forgetLetter, getLetter, letterFromRecord, letterProgress, markSentHere, rememberLetter, seedDemoLetter, sentHere, shareUrl, shownFromName, type Letter } from "@/lib/letters";
import { LinkViewBadge } from "@/components/letters/LinkViewBadge";
import { LetterReply } from "@/components/letters/LetterReply";
import { letterThread, openPublicLetter, openSharedLetter } from "@/lib/server/shop";
import { PUBLIC_TRACKING } from "@/lib/public-tracking";
import { trackingShareHead } from "@/lib/share-meta";
export const Route = createFileRoute("/acompanhar/$letterId")({
  // Prévia do link (WhatsApp, iMessage, Instagram, Facebook, X, Telegram): sai no HTML do
  // servidor e é a mesma para toda carta. Nunca mostra conteúdo, remetente ou destinatário.
  head: ({ params }) => trackingShareHead(params.letterId),
  component: TrackPage,
});

function TrackPage() {
  const { letterId } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const [letter, setLetter] = useState<Letter | null | undefined>(undefined);
  const [role, setRole] = useState<"sender" | "recipient" | "viewer">("viewer");
  /** Login de teste (ver isTestLogin no servidor): simula chegada e baixa antes de chegar. */
  const [tester, setTester] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  /** O servidor já disse quem é esta pessoa para esta carta (remetente/destinatária/visualiza). */
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (letterId === "demo") {
      const params = new URLSearchParams(window.location.search);
      const delivered = params.get("chegou") === "1";
      const messengerId = params.get("mensageiro") || undefined;
      setLetter((current) => {
        if (!delivered && current?.id === "demo" && (!messengerId || current.messengerId === messengerId)) {
          return current;
        }
        const seeded = seedDemoLetter({ delivered, messengerId });
        // Demo da viagem sem endereço (anônima): ?anonimo=1&progresso=0.5
        if (params.get("anonimo") !== "1") return seeded;
        const p = Math.max(0, Math.min(1, Number(params.get("progresso") ?? (delivered ? 1 : 0.02)) || 0));
        const trip = 2 * 60 * 60 * 1000;
        const departAt = Date.now() - p * trip;
        return {
          ...seeded,
          anonymous: true,
          addressless: true,
          fromName: "",
          fromAddress: undefined,
          toAddress: undefined,
          fromGeo: undefined,
          toGeo: undefined,
          startedAt: departAt,
          departAt,
          arriveAt: departAt + trip,
        };
      });
      if (params.get("resposta") === "1") setRole("recipient");
      return;
    }
    if (isPending) return;
    const local = getLetter(letterId);
    if (local) setLetter(local);
    if (!user && !PUBLIC_TRACKING) {
      if (!local) setLetter(undefined);
      return;
    }
    // Sem login (fase de testes): visão pública de quem só visualiza pelo link.
    setResolved(false);
    const open = user ? openSharedLetter({ data: letterId }) : openPublicLetter({ data: { id: letterId, mine: sentHere(letterId) } });
    void open
      .then((r) => {
        // Carta fora do ar (conta de quem enviou bloqueada): some daqui e do cache, sem mostrar nada dela.
        if ("unavailable" in r && r.unavailable) {
          forgetLetter(letterId);
          setUnavailable(true);
          setLetter(null);
          return;
        }
        setUnavailable(false);
        if (r.role === "sender" || r.role === "recipient" || r.role === "viewer") setRole(r.role);
        // Este navegador é de quem enviou: abrir o link depois, mesmo sem login, não conta como visto.
        if (r.role === "sender") markSentHere(letterId);
        setTester("tester" in r && r.tester === true);
        setResolved(true);
        if (r.letter) {
          const mapped = letterFromRecord(r.letter);
          rememberLetter(mapped);
          setLetter(mapped);
        } else if (!local) setLetter(null);
      })
      .catch(() => {
        setResolved(true);
        if (!local) setLetter(null);
      });
  }, [letterId, user, isPending]);

  if (isPending) {
    return (
      <div className="min-h-dvh">
        <SiteHeader />
        <main className="mx-auto max-w-lg px-5 py-16 text-muted">Abrindo o mapa…</main>
      </div>
    );
  }
  if (!user && letterId !== "demo" && !PUBLIC_TRACKING) {
    return <RedirectToSignIn next={`/acompanhar/${letterId}`} />;
  }

  if (letter === undefined) {
    return (
      <div className="min-h-dvh">
        <SiteHeader />
        <main className="mx-auto max-w-lg px-5 py-16 text-muted">Carregando a carta…</main>
      </div>
    );
  }

  if (!letter && unavailable) {
    return (
      <div className="min-h-dvh">
        <SiteHeader />
        <main className="mx-auto max-w-lg px-5 py-16" data-testid="letter-unavailable">
          <h1 className="font-display text-3xl">Esta carta não está disponível</h1>
          <p className="mt-3 text-muted">Ela não pode ser aberta no momento.</p>
          <Link to="/" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-rose px-6 text-paper">
            Voltar ao início
          </Link>
        </main>
      </div>
    );
  }

  if (!letter) {
    return (
      <div className="min-h-dvh">
        <SiteHeader />
        <main className="mx-auto max-w-lg px-5 py-16">
          <h1 className="font-display text-3xl">Carta não encontrada</h1>
          <p className="mt-3 text-muted">O link pode ter expirado, ou ela ainda não foi enviada.</p>
          <Link to="/acompanhar" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-rose px-6 text-paper">
            Minhas cartas
          </Link>
        </main>
      </div>
    );
  }

  const signedIn = Boolean(user) || letter.id === "demo";
  return (
    <TrackView
      letter={letter}
      role={signedIn ? role : "viewer"}
      signedIn={signedIn}
      resolved={resolved || letter.id === "demo"}
      tester={(signedIn && tester) || letter.id === "demo"}
    />
  );
}

/** Sem login: a primeira chegada fica guardada só neste aparelho (nada vai para o servidor). */
const ARRIVAL_KEY = "cartas-chegada-vista:";
function localArrivalSeen(id: string) {
  try {
    return window.localStorage.getItem(ARRIVAL_KEY + id) === "1";
  } catch {
    return true;
  }
}

/**
 * A animação de entrega é de cada pessoa: quem RECEBE (a conta destinatária, ou quem abre
 * o link sem entrar) vê a chegada completa na primeira vez que abre a carta já entregue.
 * Quem enviou, o admin e outra conta qualquer veem a carta já parada, e nada do que fazem
 * é gravado — então não "gastam" a animação de quem recebe.
 */
function useFirstArrival(letter: Letter, role: "sender" | "recipient" | "viewer", signedIn: boolean, resolved: boolean) {
  const [first, setFirst] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    if (letter.id === "demo") return setFirst(false);
    if (!resolved) return;
    if (!signedIn) return setFirst(!localArrivalSeen(letter.id));
    if (role !== "recipient") return setFirst(false);
    let dead = false;
    void letterArrivalState({ data: letter.id })
      .then((r) => {
        if (!dead) setFirst(Boolean(r?.firstArrival));
      })
      .catch(() => {
        if (!dead) setFirst(false);
      });
    return () => {
      dead = true;
    };
  }, [letter.id, role, signedIn, resolved]);

  const consume = () => {
    if (letter.id === "demo") return;
    if (!signedIn) {
      try {
        window.localStorage.setItem(ARRIVAL_KEY + letter.id, "1");
      } catch {
        /* ignore */
      }
      return;
    }
    if (role === "recipient") void markArrivalSeen({ data: letter.id }).catch(() => {});
  };
  return { firstArrival: first, consumeArrival: consume };
}

function TrackView({
  letter,
  role,
  signedIn = true,
  resolved = true,
  tester = false,
}: {
  letter: Letter;
  role: "sender" | "recipient" | "viewer";
  /** false = abriu pelo link sem entrar (PUBLIC_TRACKING). */
  signedIn?: boolean;
  /** false enquanto o servidor ainda não respondeu quem é esta pessoa. */
  resolved?: boolean;
  /** Login de teste: "Simular chegada" e baixar a carta mesmo antes de chegar. */
  tester?: boolean;
}) {
  const { firstArrival, consumeArrival } = useFirstArrival(letter, role, signedIn, resolved);
  const meta = trackMeta(letter);
  const [now, setNow] = useState(() => Date.now());
  const [opened, setOpened] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const journeyRef = useRef<DeliveryJourneyHandle>(null);
  const delivered = letterProgress(letter, now).arrived;
  const showLetter = delivered || opened;
  // Baixar/Imprimir antes de chegar: SÓ logins de teste (isTestLogin no servidor:
  // PAYMENT_BYPASS_EMAILS verificado/social ou ADMIN_EMAILS via Google). Quem enviou e quem
  // aguarda pelo link só baixam depois que a carta chega.
  const canDownload = delivered || tester;
  const url = shareUrl(letter.id);
  const wa = `https://wa.me/?text=${encodeURIComponent(`Uma carta está a caminho. Acompanhe: ${url}`)}`;
  const fromLabel = shownFromName(letter, role === "sender" ? "sender" : "public");
  // Qualquer destinatário (inclusive de uma resposta) pode responder depois de abrir a carta.
  // Sem login o botão aparece, mas pede para entrar antes (e volta para esta carta).
  const loginHref = `/login?next=${encodeURIComponent(`/acompanhar/${letter.id}`)}`;
  const replyHref = !showLetter
    ? undefined
    : !signedIn
      ? loginHref
      : role === "recipient"
        ? `/escrever?responder=${encodeURIComponent(letter.id)}`
        : undefined;
  const [thread, setThread] = useState<{ id: string; mine: boolean; label: string; startedAt: string }[]>([]);
  const inThread = Boolean(letter.threadId || letter.replyToLetterId);

  useEffect(() => {
    if (letter.id === "demo" || role === "viewer") return;
    let dead = false;
    void letterThread({ data: letter.id })
      .then((rows) => {
        if (!dead && Array.isArray(rows)) setThread(rows);
      })
      .catch(() => {});
    return () => {
      dead = true;
    };
  }, [letter.id, role, inThread]);

  useEffect(() => {
    if (letterProgress(letter).arrived) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [letter]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  async function download() {
    const node = document.querySelector<HTMLElement>(".delivery-preview .letter-pack");
    if (!node || !canDownload) return;
    setDownloadError("");
    setDownloading(true);
    try {
      await downloadLetterPng(node, letter.toName);
    } catch {
      setDownloadError("Não deu para gerar o arquivo. Tente de novo.");
    } finally {
      setDownloading(false);
    }
  }

  function printLetter() {
    if (!canDownload) return;
    window.print();
  }

  return (
    <div className="track-screen min-h-dvh">
      <SiteHeader />
      <main className="track-main">
        {/* Mapa e status primeiro; título compacto em cima e ações logo abaixo do mapa. */}
        <header className="track-hero">
          <p className="track-kicker">{delivered ? "Chegou" : "A caminho"}</p>
          <h1 className="track-title">
            {delivered ? "A carta chegou" : "Uma carta está a caminho"}
          </h1>
          <p className="track-sub">
            <span className="track-names">
              {fromLabel} → {letter.toName}
            </span>
          </p>
        </header>

        {firstArrival === undefined ? (
          <div className="delivery-slot" aria-busy="true" aria-label="Viagem do mensageiro" />
        ) : (
          <DeliveryJourney
            ref={journeyRef}
            letter={letter}
            allowDownload={canDownload}
            allowSimulate={tester}
            onDelivered={() => setNow(Date.now())}
            onOpened={() => {
              setOpened(true);
              consumeArrival();
            }}
            replyHref={replyHref}
            firstArrival={firstArrival}
          />
        )}

        <section className="track-after" aria-label="Detalhes e compartilhar">
          {/* Rota de cima para baixo: sai (ponto) → linha → entrega (pino). Mesma ordem do passo 5. */}
          {letter.addressless ? (
            <div className="addr-none track-addr-none" role="note">
              <span className="addr-none-icon" aria-hidden="true">✉</span>
              <div>
                <p className="addr-none-title">Carta anônima · entrega pela conta de quem recebe</p>
                <p className="addr-none-eta">Viagem de 2h.</p>
              </div>
            </div>
          ) : (
          <ol className="track-route" aria-label="Rota da carta">
            <li className="track-route-stop is-from">
              <span className="track-route-mark" aria-hidden="true" />
              <span className="track-route-label">De onde sai</span>
              <span className="track-route-addr">{meta.from}</span>
            </li>
            <li className="track-route-stop is-to">
              <span className="track-route-mark" aria-hidden="true" />
              <span className="track-route-label">De onde entrega</span>
              <span className="track-route-addr">{meta.to}</span>
            </li>
          </ol>
          )}
          <p className="track-meta">
            {meta.animal}
          </p>
          {/* Só quem enviou vê se a carta já foi aberta pelo link. */}
          {role === "sender" && letter.id !== "demo" ? <LinkViewBadge letter={letter} /> : null}
          <div className="share-bar track-share">
            <button type="button" onClick={copyLink}>
              {copied ? "Link copiado ✓" : "Copiar link"}
            </button>
            <a href={wa} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
            {canDownload ? (
              <button
                type="button"
                className="letter-download"
                disabled={downloading}
                onClick={() => void download()}
              >
                {downloading ? "Preparando…" : delivered ? "Baixar carta" : "Baixar carta (teste)"}
              </button>
            ) : null}
            {canDownload ? (
              <button type="button" onClick={printLetter}>
                Imprimir
              </button>
            ) : null}
          </div>
          {downloadError ? <p className="track-note track-note-error">{downloadError}</p> : null}
          {!canDownload ? (
            <p className="track-note">O download destrava quando a carta chegar.</p>
          ) : null}
        </section>

        {thread.length > 1 ? (
          <section className="track-thread" aria-label="Conversa">
            <h2 className="font-display text-xl">Conversa</h2>
            <ol className="thread-list">
              {thread.map((item) => (
                <li key={item.id}>
                  <a href={`/acompanhar/${encodeURIComponent(item.id)}`} aria-current={item.id === letter.id ? "page" : undefined}>
                    <span>{item.mine ? "Você" : item.label}</span>
                    <small>
                      {formatDateBr(item.startedAt)}
                    </small>
                  </a>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
        {!signedIn ? (
          <p className="track-note track-signin-note">
            Você está vendo sem entrar. Para responder ou guardar a carta, <a href={loginHref}>entre na sua conta</a>.
          </p>
        ) : null}
        {letter.id !== "demo" && signedIn ? (
          <LetterReply letterId={letter.id} canWrite={role === "recipient" && showLetter} />
        ) : null}
      </main>
    </div>
  );
}
