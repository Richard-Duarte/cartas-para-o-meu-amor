import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { JourneyMap } from "@/components/map/JourneyMap";
import { LetterSheet } from "@/components/letters/LetterSheet";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { downloadLetterPng } from "@/lib/download-letter";
import { getLetter, letterFromRecord, rememberLetter, seedDemoLetter, shareUrl, shownFromName, type Letter } from "@/lib/letters";
import { getCity, getMessenger } from "@/lib/messengers";
import { addressLine } from "@/lib/address";
import { openSharedLetter } from "@/lib/server/shop";

export const Route = createFileRoute("/acompanhar/$letterId")({
  component: TrackPage,
});

function TrackPage() {
  const { letterId } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const [letter, setLetter] = useState<Letter | null | undefined>(undefined);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (letterId === "demo") {
      setLetter(seedDemoLetter());
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

  return <TrackView letter={letter} opened={opened} onArrived={() => setOpened(true)} />;
}

function TrackView({
  letter,
  opened,
  onArrived,
}: {
  letter: Letter;
  opened: boolean;
  onArrived: () => void;
}) {
  const m = getMessenger(letter.messengerId);
  const from = getCity(letter.fromCityId);
  const to = getCity(letter.toCityId);
  const [forceOpen, setForceOpen] = useState(false);
  const [liveLetter, setLiveLetter] = useState(letter);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const sheetRef = useRef<HTMLDivElement>(null);
  const showLetter = opened || forceOpen;
  const delivered = opened;
  const url = shareUrl(letter.id);
  const wa = `https://wa.me/?text=${encodeURIComponent(`Uma carta está a caminho. Acompanhe: ${url}`)}`;

  useEffect(() => {
    setLiveLetter(letter);
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
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-10">
        <p className="text-xs uppercase tracking-widest text-rose">Acompanhar</p>
        <h1 className="mt-2 break-words font-display text-3xl sm:text-4xl">
          {shownFromName(letter, "public")} → {letter.toName}
        </h1>
        <p className="mt-2 break-words text-muted">
          {letter.fromAddress?.street ? addressLine(letter.fromAddress) : from.name}
          {" → "}
          {letter.toAddress?.street ? addressLine(letter.toAddress) : to.name}
          {" · "}
          {m.name}
          {letter.paidBrl != null
            ? ` · lacre de ${letter.paidBrl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
            : ""}
        </p>

        <div className="share-bar">
          <button type="button" onClick={copyLink}>
            {copied ? "Link copiado" : "Copiar link"}
          </button>
          <a href={wa} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
          <button
            type="button"
            className="letter-download"
            disabled={!delivered || downloading}
            title={delivered ? "Baixar a carta em imagem" : "Disponível quando o mensageiro entregar"}
            onClick={() => void download()}
          >
            {downloading ? "Preparando…" : "Baixar carta"}
          </button>
        </div>
        {downloadError ? <p className="mt-2 text-sm text-rose">{downloadError}</p> : null}
        {!delivered ? (
          <p className="mt-2 text-sm text-muted">O download destrava quando a carta chegar.</p>
        ) : null}

        <div className="mt-8">
          <JourneyMap letter={liveLetter} onArrived={onArrived} />
        </div>

        {!opened && (
          <button
            type="button"
            className="mt-4 min-h-11 rounded-full border border-gold px-5 text-sm"
            onClick={() =>
              setLiveLetter({
                ...liveLetter,
                startedAt: Date.now() - liveLetter.demoDurationMs,
              })
            }
          >
            Pular para a chegada
          </button>
        )}

        <div className="mt-8">
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
      </main>
    </div>
  );
}
