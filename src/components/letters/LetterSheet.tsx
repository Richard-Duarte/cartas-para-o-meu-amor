import { forwardRef } from "react";
import { getDesign, type DesignId } from "@/lib/designs";
import { type LetterPage } from "@/lib/pages";
import { cn } from "@/lib/utils";

type Props = {
  designId: DesignId;
  fromName: string;
  toName: string;
  body: string;
  pages?: LetterPage[];
  drawingDataUrl?: string;
  kind?: "text" | "drawing";
  className?: string;
};

export const LetterSheet = forwardRef<HTMLDivElement, Props>(function LetterSheet(
  {
    designId,
    fromName,
    toName,
    body,
    pages,
    drawingDataUrl,
    kind = "text",
    className,
  },
  ref,
) {
  const design = getDesign(designId);
  const sheets = pages?.length ? pages : [null];

  return (
    <div ref={ref} className={cn("letter-pack", className)}>
      {sheets.map((page, i) => (
        <article
          key={page?.id ?? "body"}
          data-letter-page={i + 1}
          className={cn("letter-sheet", design.ink === "light" && "is-light")}
          style={{
            fontFamily: design.fontFamily,
            backgroundImage: `url(${design.src})`,
          }}
        >
          <div className="letter-sheet-inner">
            <p className="letter-sheet-meta">
              De {fromName || "Você"}
              <span> · </span>
              Para {toName || "Meu amor"}
              {sheets.length > 1 ? <span> · Página {i + 1}</span> : null}
            </p>
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
                        width: `${Math.max(b.w, 8)}%`,
                        height: `${Math.max(b.h, 8)}%`,
                        objectFit: "contain",
                        transform: `scaleX(${b.flipX ? -1 : 1})`,
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
                        width: `${b.w}%`,
                        fontSize: `${b.size}px`,
                        fontFamily: b.fontFamily || design.fontFamily,
                        fontWeight: b.weight || 400,
                        fontStyle: b.italic ? "italic" : "normal",
                        textDecoration: b.underline ? "underline" : "none",
                        textAlign: b.align || "left",
                        color: b.color || undefined,
                        lineHeight: b.lineHeight || 1.35,
                        letterSpacing: `${b.letterSpacing || 0}em`,
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
            <p className="letter-sheet-mark">{design.name}</p>
          </div>
        </article>
      ))}
    </div>
  );
});
