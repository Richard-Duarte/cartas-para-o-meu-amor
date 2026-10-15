import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { DeliveryJourney } from "@/components/delivery/DeliveryJourney";
import { trackMeta } from "@/components/delivery/journey";
import { LetterSheet } from "@/components/letters/LetterSheet";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { downloadLetterPng } from "@/lib/download-letter";
import { getLetter, letterFromRecord, letterProgress, rememberLetter, seedDemoLetter, shareUrl, shownFromName, type Letter } from "@/lib/letters";
import { LetterReply } from "@/components/letters/LetterReply";
import { openSharedLetter } from "@/lib/server/shop";
import { cn } from "@/lib/utils";

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
  const [forceOpen, setForceOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const sheetRef = useRef<HTMLDivElement>(null);
  const delivered = letterProgress(letter, now).arrived;
  const showLetter = delivered || forceOpen;
  const url = shareUrl(letter.id);
  const wa = `https://wa.me/?text=${encodeURIComponent(`Uma carta está a caminho. Acompanhe: ${url}`)}`;

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
    const node = sheetRef.current;
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

  return (
    <div className="track-screen min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-[72rem] px-5 py-8 sm:py-10">
        <p className="track-kicker">Acompanhar</p>
        <h1 className="track-title break-words">
          {shownFromName(letter, role === "sender" ? "sender" : "public")} → {letter.toName}
        </h1>
        <p className="track-meta">
          {meta.from}
          {" → "}
          {meta.to}
          {" · "}
          {meta.animal}
          {meta.price ? ` · ${meta.price}` : ""}
        </p>

        <div className="share-bar">
          <button type="button" onClick={copyLink}>
            {copied ? "Link copiado" : "Copiar link"}
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
        </div>
        {downloadError ? <p className="mt-2 text-sm text-rose">{downloadError}</p> : null}
        {!delivered ? (
          <p className="mt-2 text-sm text-muted">O download destrava quando a carta chegar.</p>
        ) : null}

        <DeliveryJourney letter={letter} onDelivered={() => setNow(Date.now())} />

        <div className={cn("mt-8", showLetter && "letter-arrive")}>
          {showLetter ? (
            <LetterSheet
              ref={sheetRef}
              designId={letter.designId ?? "classico"}
              fromName={shownFromName(letter, "public")}
              toName={letter.toName}
              body={letter.body}
              pages={letter.pages}
              kind={letter.kind}
              drawingDataUrl={letter.drawingDataUrl}
              className="mx-auto max-w-md"
            />
          ) : (
            <div className="rounded-xl border border-line bg-paper p-6">
              <p className="text-muted">A carta destrava quando o mensageiro chega.</p>
              <button
                type="button"
                className="mt-4 min-h-11 rounded-full border border-ink px-5 text-sm"
                onClick={() => setForceOpen(true)}
              >
                Abrir agora (demo)
              </button>
            </div>
          )}
        </div>

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
