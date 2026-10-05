"use client";

import { useRef, useState } from "react";
import { getDesign } from "@/lib/designs";
import { newBlock, newPage, type LetterPage } from "@/lib/pages";
import { cn } from "@/lib/utils";

type Props = {
  designId: string;
  pages: LetterPage[];
  onChange: (pages: LetterPage[]) => void;
};

export function PaperEditor({ designId, pages, onChange }: Props) {
  const design = getDesign(designId);
  const [pageI, setPageI] = useState(0);
  const [active, setActive] = useState<string | null>(pages[0]?.blocks[0]?.id ?? null);
  const page = pages[pageI] ?? pages[0];
  const light = design.ink === "light";

  function patchPage(next: LetterPage) {
    onChange(pages.map((p, i) => (i === pageI ? next : p)));
  }

  function patchBlock(id: string, partial: Partial<LetterPage["blocks"][number]>) {
    patchPage({
      ...page,
      blocks: page.blocks.map((b) => (b.id === id ? { ...b, ...partial } : b)),
    });
  }

  return (
    <div className="paper-editor">
      <div className="paper-editor-toolbar">
        <div className="flex flex-wrap gap-2">
          {pages.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className={cn("write-step", i === pageI && "is-on")}
              onClick={() => setPageI(i)}
            >
              Página {i + 1}
            </button>
          ))}
          <button
            type="button"
            className="write-step"
            onClick={() => {
              const p = newPage();
              onChange([...pages, p]);
              setPageI(pages.length);
              setActive(p.blocks[0].id);
            }}
          >
            + Página
          </button>
        </div>
        <button
          type="button"
          className="write-step"
          onClick={() => {
            const b = newBlock();
            patchPage({ ...page, blocks: [...page.blocks, b] });
            setActive(b.id);
          }}
        >
          + Texto
        </button>
      </div>

      <div
        className={cn("paper-stage", light && "is-light")}
        style={{
          backgroundImage: `url(${design.src})`,
          fontFamily: design.fontFamily,
        }}
        onPointerDown={() => setActive(null)}
      >
        {page.blocks.map((b) => (
          <TextNode
            key={b.id}
            block={b}
            active={active === b.id}
            onFocus={() => setActive(b.id)}
            onChange={(partial) => patchBlock(b.id, partial)}
            onRemove={() => {
              const next = page.blocks.filter((x) => x.id !== b.id);
              patchPage({ ...page, blocks: next.length ? next : [newBlock()] });
            }}
          />
        ))}
      </div>
      <p className="paper-editor-hint">
        Fonte do papel: {design.name}. Arraste o texto. O fundo vem limpo — a
        escrita é só a sua.
      </p>
    </div>
  );
}

function TextNode({
  block,
  active,
  onFocus,
  onChange,
  onRemove,
}: {
  block: LetterPage["blocks"][number];
  active: boolean;
  onFocus: () => void;
  onChange: (partial: Partial<LetterPage["blocks"][number]>) => void;
  onRemove: () => void;
}) {
  const drag = useRef<{ x: number; y: number; bx: number; by: number } | null>(null);

  function startDrag(e: React.PointerEvent) {
    if ((e.target as HTMLElement).tagName === "TEXTAREA") return;
    const parent = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
    drag.current = { x: e.clientX, y: e.clientY, bx: block.x, by: block.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    onFocus();
    const move = (ev: PointerEvent) => {
      if (!drag.current) return;
      const dx = ((ev.clientX - drag.current.x) / parent.width) * 100;
      const dy = ((ev.clientY - drag.current.y) / parent.height) * 100;
      onChange({
        x: Math.min(88, Math.max(2, drag.current.bx + dx)),
        y: Math.min(88, Math.max(2, drag.current.by + dy)),
      });
    };
    const up = () => {
      drag.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div
      className={cn("paper-block", active && "is-active")}
      style={{
        left: `${block.x}%`,
        top: `${block.y}%`,
        width: `${block.w}%`,
        fontSize: `${block.size}px`,
      }}
      onPointerDown={startDrag}
    >
      <textarea
        value={block.text}
        placeholder="Escreva aqui"
        rows={4}
        onPointerDown={(e) => {
          e.stopPropagation();
          onFocus();
        }}
        onChange={(e) => onChange({ text: e.target.value })}
      />
      {active ? (
        <div className="paper-block-tools" onPointerDown={(e) => e.stopPropagation()}>
          <input
            type="range"
            min={14}
            max={42}
            value={block.size}
            onChange={(e) => onChange({ size: Number(e.target.value) })}
            aria-label="Tamanho"
          />
          <button type="button" onClick={onRemove}>
            Tirar
          </button>
        </div>
      ) : null}
    </div>
  );
}
