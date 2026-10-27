import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { DeliveryJourney, type DeliveryJourneyHandle } from "@/components/delivery/DeliveryJourney";
import { trackMeta } from "@/components/delivery/journey";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { downloadLetterPng } from "@/lib/download-letter";
import { getLetter, letterFromRecord, letterProgress, rememberLetter, seedDemoLetter, shareUrl, shownFromName, type Letter } from "@/lib/letters";
import { LetterReply } from "@/components/letters/LetterReply";
import { openSharedLetter } from "@/lib/server/shop";
export const Route = createFileRoute("/acompanhar/$letterId")({
  component: TrackPage,
});

function TrackPage() {
  const { letterId } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const [letter, setLetter] = useState<Letter | null | undefined>(undefined);
  const [role, setRole] = useState<"sender" | "recipient" | "viewer">("viewer");

  useEffect(() => {
    if (letterId === "demo") {
      const params = new URLSearchParams(window.location.search);
      const delivered = params.get("chegou") === "1";
      const messengerId = params.get("mensageiro") || undefined;
      setLetter((current) => {
        if (!delivered && current?.id === "demo" && (!messengerId || current.messengerId === messengerId)) {
          return current;
        }
        return seedDemoLetter({ delivered, messengerId });
      });
      return;
    }
    const local = getLetter(letterId);
    if (local) setLetter(local);
    if (!user) {
      if (!local) setLetter(undefined);
      return;
    }
    void openSharedLetter({ data: letterId })
      .then((r) => {
        if (r.role === "sender" || r.role === "recipient" || r.role === "viewer") setRole(r.role);
        if (r.letter) {
          const mapped = letterFromRecord(r.letter);
          rememberLetter(mapped);
          setLetter(mapped);
        } else if (!local) setLetter(null);
      })
      .catch(() => {
        if (!local) setLetter(null);
      });
  }, [letterId, user]);

  if (isPending) {
    return (
      <div className="min-h-dvh">
        <SiteHeader />
        <main className="mx-auto max-w-lg px-5 py-16 text-muted">Abrindo o mapa…</main>
      </div>
    );
  }
  if (!user && letterId !== "demo") {
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

  return <TrackView letter={letter} role={role} />;
}

function TrackView({
  letter,
  role,
}: {
  letter: Letter;
  role: "sender" | "recipient" | "viewer";
}) {
  const meta = trackMeta(letter);
  const [now, setNow] = useState(() => Date.now());
  const [opened, setOpened] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const journeyRef = useRef<DeliveryJourneyHandle>(null);
  const delivered = letterProgress(letter, now).arrived;
  const showLetter = delivered || opened;
  const url = shareUrl(letter.id);
  const wa = `https://wa.me/?text=${encodeURIComponent(`Uma carta está a caminho. Acompanhe: ${url}`)}`;
  const fromLabel = shownFromName(letter, role === "sender" ? "sender" : "public");

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
    if (!node || !delivered) return;
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
    if (!delivered) return;
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

        <DeliveryJourney
          ref={journeyRef}
          letter={letter}
          allowDownload={delivered}
          onDelivered={() => setNow(Date.now())}
          onOpened={() => setOpened(true)}
        />

        <section className="track-after" aria-label="Detalhes e compartilhar">
          {/* Rota de cima para baixo: sai (ponto) → linha → entrega (pino). Mesma ordem do passo 5. */}
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
          <p className="track-meta">
            {meta.animal}
            {meta.price ? ` · ${meta.price}` : ""}
          </p>
          <div className="share-bar track-share">
            <button type="button" onClick={copyLink}>
              {copied ? "Link copiado ✓" : "Copiar link"}
            </button>
            <a href={wa} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
            {delivered ? (
              <button
                type="button"
                className="letter-download"
                disabled={downloading}
                onClick={() => void download()}
              >
                {downloading ? "Preparando…" : "Baixar carta"}
              </button>
            ) : null}
            {delivered ? (
              <button type="button" onClick={printLetter}>
                Imprimir
              </button>
            ) : null}
          </div>
          {downloadError ? <p className="track-note track-note-error">{downloadError}</p> : null}
          {!delivered ? (
            <p className="track-note">O download destrava quando a carta chegar.</p>
          ) : null}
        </section>

        {letter.id !== "demo" && role === "recipient" && !showLetter ? (
          <p className="reply-wait">O comentário abre quando você ler a carta.</p>
        ) : null}
        {letter.id !== "demo" ? (
          <LetterReply letterId={letter.id} canWrite={role === "recipient" && showLetter} />
        ) : null}
      </main>
    </div>
  );
}
