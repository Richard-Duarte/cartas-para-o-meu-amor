import { useEffect, useRef, useState } from "react";
import { getDesign, type DesignId } from "@/lib/designs";
import { downloadLetterPng } from "@/lib/download-letter";
import { blockFontSize, fitMaxWidth, type LetterPage } from "@/lib/pages";
import { cn } from "@/lib/utils";

type Props = {
  designId: DesignId;
  fromName: string;
  toName: string;
  body: string;
  pages?: LetterPage[];
  drawingDataUrl?: string;
  kind?: "text" | "drawing";
  date?: string;
  className?: string;
  allowDownload?: boolean;
  shareHref?: string;
  shareText?: string;
};

export function LetterDocument({
  designId,
  fromName,
  toName,
  body,
  pages,
  drawingDataUrl,
  kind = "text",
  date,
  className,
  allowDownload = false,
  shareHref,
  shareText = "Uma carta está a caminho.",
}: Props) {
  const packRef = useRef<HTMLDivElement>(null);
  const design = getDesign(designId);
  const sheets = pages?.length ? pages : [null];
  const from = fromName || "Você";
  const to = toName || "Meu amor";
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  async function download() {
    const node = packRef.current;
    if (!node || !allowDownload) return;
    setDownloadError("");
    setDownloading(true);
    try {
      await downloadLetterPng(node, to);
    } catch {
      setDownloadError("Não deu para gerar o arquivo. Tente de novo.");
    } finally {
      setDownloading(false);
    }
  }

  function printLetter() {
    if (!allowDownload) return;
    window.print();
  }

  async function copyLink() {
    if (!shareHref) return;
    try {
      await navigator.clipboard.writeText(shareHref);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  async function nativeShare() {
    if (!shareHref || !navigator.share) return;
    try {
      await navigator.share({
        title: "Carta para o meu amor",
        text: shareText,
        url: shareHref,
      });
    } catch {
      /* cancelled */
    }
  }

  const wa = shareHref
    ? `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareHref}`)}`
    : "";
  const showActions = allowDownload || Boolean(shareHref);

  return (
    <div className={cn("letter-read", className)}>
      <div ref={packRef} className="letter-pack" data-letter-ui="document">
        {sheets.map((page, i) => (
          <article
            key={page?.id ?? "body"}
            data-letter-page={i + 1}
            aria-label={sheets.length > 1 ? `Página ${i + 1} de ${sheets.length}` : undefined}
            className={cn("letter-sheet", design.ink === "light" && "is-light")}
            style={{
              fontFamily: design.fontFamily,
              backgroundImage: `url(${design.src})`,
            }}
          >
            <div className="letter-sheet-inner">
              {date && i === 0 ? <p className="letter-sheet-date">{date}</p> : null}
              {/* De/Para ficam no envelope; sem número de página nem nome do papel na carta. */}
              {page ? (
                <div className="letter-sheet-stage">
                  {page.blocks.map((b) =>
                    b.kind === "sticker" && b.src ? (
                      <img
                        key={b.id}
                        src={b.src}
                        alt=""
                        className="letter-sheet-abs letter-sheet-sticker"
                        style={{
                          left: `${b.x}%`,
                          top: `${b.y}%`,
                          width: `${Math.max(b.w, 1)}%`,
                          height: `${Math.max(b.h, 1)}%`,
                          objectFit: "contain",
                          transform: `rotate(${b.rotate || 0}deg) scaleX(${b.flipX ? -1 : 1})`,
                        }}
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : b.kind === "sticker" ? null : (
                      <p
                        key={b.id}
                        className="letter-sheet-abs"
                        style={{
                          left: `${b.x}%`,
                          top: `${b.y}%`,
                          ...(b.fit
                            ? { width: "max-content", maxWidth: `${fitMaxWidth(b)}%`, padding: "0.2em 0.35em" }
                            : { width: `${b.w}%`, minHeight: `${b.h}%` }),
                          // Relativo à largura da folha: fica onde foi colocado em qualquer tela.
                          fontSize: blockFontSize(b.size),
                          fontFamily: b.fontFamily || design.fontFamily,
                          fontWeight: b.weight || 400,
                          fontStyle: b.italic ? "italic" : "normal",
                          textDecoration: b.underline ? "underline" : "none",
                          textAlign: b.align || "left",
                          color: b.color || undefined,
                          lineHeight: b.lineHeight || 1.35,
                          letterSpacing: `${b.letterSpacing || 0}em`,
                          transform: `rotate(${b.rotate || 0}deg)`,
                        }}
                      >
                        {b.text}
                      </p>
                    ),
                  )}
                </div>
              ) : kind === "drawing" && drawingDataUrl ? (
                <img src={drawingDataUrl} alt="" className="letter-sheet-draw" />
              ) : (
                <p className="letter-sheet-body">{body.trim()}</p>
              )}
              {i === sheets.length - 1 ? (
                <p className="letter-sheet-sign">
                  Com todo o carinho,
                  <br />
                  <em>{from}</em>
                </p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      {showActions ? (
        <div className="share-bar letter-actions">
          {allowDownload ? (
            <button type="button" className="letter-download" disabled={downloading} onClick={() => void download()}>
              {downloading ? "Preparando…" : "Baixar carta"}
            </button>
          ) : null}
          {allowDownload ? (
            <button type="button" onClick={printLetter}>
              Imprimir
            </button>
          ) : null}
          {shareHref ? (
            <button type="button" onClick={() => void copyLink()}>
              {copied ? "Link copiado" : "Copiar link"}
            </button>
          ) : null}
          {shareHref ? (
            <a href={wa} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          ) : null}
          {shareHref && canShare ? (
            <button type="button" onClick={() => void nativeShare()}>
              Compartilhar
            </button>
          ) : null}
        </div>
      ) : null}
      {downloadError ? <p className="letter-action-error">{downloadError}</p> : null}
    </div>
  );
}
