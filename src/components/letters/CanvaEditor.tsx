"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlignCenter,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignJustify,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Bold,
  ImagePlus,
  Italic,
  LayoutTemplate,
  Maximize2,
  Minimize2,
  Plus,
  Sticker,
  X,
  Trash2,
  Type,
  Underline,
} from "lucide-react";
import { DESIGNS, getDesign } from "@/lib/designs";
import { formatBrl } from "@/lib/cart";
import {
  EDITOR_FONT_GROUPS,
  alignOnPage,
  bodyBlock,
  headingBlock,
  newPage,
  snapBlock,
  stickerBlock,
  subheadingBlock,
  type Guide,
  type LetterPage,
  type TextBlock,
} from "@/lib/pages";
import { STICKER_GROUPS, STICKERS } from "@/lib/stickers";
import { cn } from "@/lib/utils";

type Panel = "design" | "text" | "stickers" | "font" | "size";

function usePresence(open: boolean, ms = 340) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!open) {
      setShown(false);
      const timer = window.setTimeout(() => setMounted(false), ms);
      return () => window.clearTimeout(timer);
    }
    setMounted(true);
    return undefined;
  }, [open, ms]);
  useEffect(() => {
    if (!mounted || !open) return;
    const frame = window.requestAnimationFrame(() => setShown(true));
    return () => window.cancelAnimationFrame(frame);
  }, [mounted, open]);
  return { mounted, shown };
}

type Props = {
  designId: string;
  onDesignId: (id: string) => void;
  pages: LetterPage[];
  onChange: (pages: LetterPage[]) => void;
  fromName: string;
  toName: string;
  onFromName: (v: string) => void;
  onToName: (v: string) => void;
  onContinue: () => void;
  canContinue: boolean;
};

export function CanvaEditor({
  designId,
  onDesignId,
  pages,
  onChange,
  fromName,
  toName,
  onFromName,
  onToName,
  onContinue,
  canContinue,
}: Props) {
  const design = getDesign(designId);
  const [panel, setPanel] = useState<Panel | null>("design");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [stickerPop, setStickerPop] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const designSheet = usePresence(pickerOpen);
  const stickerSheet = usePresence(stickerPop);
  const fullSheet = usePresence(previewOpen);
  const [pageI, setPageI] = useState(0);
  const [active, setActive] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [zoom, setZoom] = useState(100);
  const zoomRef = useRef(100);
  zoomRef.current = zoom;
  const [query, setQuery] = useState("");
  const [stickerQ, setStickerQ] = useState("");
  const [stickerGroup, setStickerGroup] = useState<(typeof STICKER_GROUPS)[number]["id"] | "todos">("todos");
  const uploadRef = useRef<HTMLInputElement>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const history = useRef<LetterPage[][]>([]);
  const workspace = useRef<HTMLDivElement>(null);
  const sheetRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const page = pages[pageI] ?? pages[0];
  const selected = page?.blocks.find((b) => b.id === active);
  const floatTools = panel === "text" || panel === "font" || panel === "size";

  useEffect(() => {
    document.body.classList.toggle("canva-full-open", previewOpen);
    document.documentElement.classList.toggle("canva-full-open", previewOpen);
    if (!previewOpen) {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.body.classList.remove("canva-full-open");
      document.documentElement.classList.remove("canva-full-open");
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [previewOpen]);
  const light = design.ink === "light";
  const ink = light ? "#f6ede4" : "#1a1410";

  function commit(nextPages: LetterPage[]) {
    history.current = [...history.current.slice(-29), pages];
    onChange(nextPages);
  }

  function patchPageAt(index: number, next: LetterPage) {
    commit(pages.map((p, i) => (i === index ? next : p)));
  }

  function patchBlock(id: string, partial: Partial<TextBlock>, index = pageI) {
    const target = pages[index];
    if (!target) return;
    patchPageAt(index, {
      ...target,
      blocks: target.blocks.map((b) => (b.id === id ? { ...b, ...partial } : b)),
    });
  }

  function applyType(partial: Partial<TextBlock>) {
    if (selected && selected.kind !== "sticker") {
      patchBlock(selected.id, partial);
      return;
    }
    if (partial.fontFamily == null && partial.color == null) return;
    const target = pages[pageI];
    if (!target) return;
    patchPageAt(pageI, {
      ...target,
      blocks: target.blocks.map((b) =>
        b.kind === "sticker"
          ? b
          : {
              ...b,
              ...(partial.fontFamily != null ? { fontFamily: partial.fontFamily } : {}),
              ...(partial.color != null ? { color: partial.color } : {}),
            },
      ),
    });
  }

  function closeStickers() {
    setStickerPop(false);
    setPanel((current) => (current === "stickers" ? null : current));
  }

  function placeSticker(src: string) {
    addBlock(stickerBlock(src));
    closeStickers();
  }

  function addBlock(block: TextBlock) {
    const target = pages[pageI] ?? pages[0];
    if (!target) return;
    patchPageAt(pageI, { ...target, blocks: [...target.blocks, block] });
    setActive(block.id);
    setEditing(block.kind !== "sticker");
  }

  function addPageAfter(index: number) {
    const p = newPage();
    const next = [...pages.slice(0, index + 1), p, ...pages.slice(index + 1)];
    commit(next);
    setPageI(index + 1);
    setActive(null);
    window.setTimeout(() => {
      sheetRefs.current[p.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 40);
  }

  function undo() {
    const prev = history.current.pop();
    if (prev) onChange(prev);
  }

  function goPage(i: number) {
    setPageI(i);
    setActive(null);
    setEditing(false);
    const id = pages[i]?.id;
    if (id) sheetRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  useEffect(() => {
    if (window.matchMedia("(max-width: 860px)").matches) setPickerOpen(true);
  }, []);

  function pickDesign(id: string) {
    onDesignId(id);
    if (window.matchMedia("(max-width: 860px)").matches) setPickerOpen(false);
  }

  function openDesigns() {
    setPanel("design");
    if (window.matchMedia("(max-width: 860px)").matches) setPickerOpen(true);
  }

  function openStickers() {
    if (window.matchMedia("(max-width: 860px)").matches) {
      setStickerPop(true);
      return;
    }
    setPanel("stickers");
  }

  function addPhotoSticker(file: File) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 900;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const png = file.type === "image/png" || file.type === "image/webp";
      addBlock(stickerBlock(canvas.toDataURL(png ? "image/png" : "image/jpeg", 0.88)));
      URL.revokeObjectURL(url);
      closeStickers();
    };
    img.src = url;
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
        return;
      }
      if (editing) return;
      if ((e.key === "Backspace" || e.key === "Delete") && active && page) {
        e.preventDefault();
        patchPageAt(pageI, { ...page, blocks: page.blocks.filter((b) => b.id !== active) });
        setActive(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    const el = workspace.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      e.preventDefault();
      el.scrollBy({ top: e.deltaY * 0.9, left: e.deltaX * 0.9 });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const el = workspace.current;
    if (!el) return;
    let startDist = 0;
    let startZoom = zoomRef.current;
    const dist = (touches: TouchList) => {
      if (touches.length < 2) return 0;
      const a = touches[0];
      const b = touches[1];
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    };
    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      startDist = dist(e.touches);
      startZoom = zoomRef.current;
    };
    const onMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || startDist < 8) return;
      e.preventDefault();
      const next = Math.round(Math.min(200, Math.max(50, startZoom * (dist(e.touches) / startDist))));
      setZoom(next);
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("gesturestart", (e) => e.preventDefault());
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
    };
  }, []);

  useEffect(() => {
    const root = workspace.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!vis) return;
        const i = Number((vis.target as HTMLElement).dataset.page);
        if (!Number.isNaN(i)) setPageI(i);
      },
      { root, threshold: 0.55 },
    );
    Object.values(sheetRefs.current).forEach((n) => n && io.observe(n));
    return () => io.disconnect();
  }, [pages.length]);

  const filteredDesigns = DESIGNS.filter(
    (d) =>
      !query ||
      d.name.toLowerCase().includes(query.toLowerCase()) ||
      d.tagline.toLowerCase().includes(query.toLowerCase()),
  );
  const filteredStickers = STICKERS.filter((s) => {
    const g = stickerGroup === "todos" || s.group === stickerGroup;
    const q = !stickerQ || s.name.toLowerCase().includes(stickerQ.toLowerCase());
    return g && q;
  });

  return (
    <div className={cn("canva", floatTools && "is-float-tools")}>
      <div className="canva-top">
        <div className="canva-top-left">
          <button type="button" onClick={undo} className="canva-icon-btn" title="Desfazer">
            ↺
          </button>
          {selected ? (
            <button
              type="button"
              className="canva-icon-btn"
              title="Apagar"
              onClick={() => {
                if (!page) return;
                patchPageAt(pageI, { ...page, blocks: page.blocks.filter((b) => b.id !== selected.id) });
                setActive(null);
              }}
            >
              <Trash2 size={14} />
            </button>
          ) : null}
          <label className="canva-mini">
            De
            <input value={fromName} onChange={(e) => onFromName(e.target.value)} />
          </label>
          <label className="canva-mini">
            Para
            <input value={toName} onChange={(e) => onToName(e.target.value)} />
          </label>
        </div>
        <Toolbar
          block={selected}
          fallbackFont={design.fontFamily}
          fallbackColor={ink}
          disabled={!selected}
          fontAlways
          onChange={applyType}
          onAlignPage={(where) => selected && patchBlock(selected.id, alignOnPage(selected, where))}
        />
        <button type="button" className="canva-share" disabled={!canContinue} onClick={onContinue}>
          Continuar
        </button>
      </div>

      <div className={cn("canva-body", !panel && "is-panel-closed")}>
        <nav className="canva-rail" aria-label="Ferramentas">
          <button type="button" className={cn(panel === "design" && "is-on")} onClick={openDesigns}>
            <LayoutTemplate size={18} />
            Design
          </button>
          <button type="button" className={cn(panel === "text" && "is-on")} onClick={() => setPanel("text")}>
            <Type size={18} />
            Texto
          </button>
          <button type="button" className={cn((panel === "stickers" || stickerPop) && "is-on")} onClick={openStickers}>
            <Sticker size={18} />
            Adesivos
          </button>
          <button type="button" className={cn(panel === "font" && "is-on")} onClick={() => setPanel("font")}>
            <Type size={18} />
            Fonte
          </button>
          <button type="button" className={cn(panel === "size" && "is-on")} onClick={() => setPanel("size")}>
            Tamanho
          </button>
        </nav>

        <aside className="canva-panel">
          {panel === "design" ? (
            <>
              <p className="canva-panel-title">Templates</p>
              <input
                className="canva-search"
                placeholder="Buscar papéis"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="canva-thumbs">
                {filteredDesigns.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className={cn("canva-thumb", d.id === designId && "is-on")}
                    onClick={() => pickDesign(d.id)}
                  >
                    <LetterThumb
                      src={d.src}
                      blocks={page?.blocks ?? []}
                      ink={ink}
                      font={design.fontFamily}
                      fromName={fromName}
                      toName={toName}
                    />
                    <span>
                      {d.name}
                      <i>{d.paid ? formatBrl(d.priceBrl) : "Grátis"}</i>
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : null}
          {panel === "text" ? (
            <>
              <p className="canva-panel-title">Texto</p>
              <p className="canva-panel-note">Fonte padrão deste papel: {design.fontFamily.split(",")[0]}</p>
              <button
                type="button"
                className="canva-add-type is-h"
                style={{ fontFamily: design.fontFamily }}
                onClick={() => addBlock(headingBlock())}
              >
                Adicionar um título
              </button>
              <button
                type="button"
                className="canva-add-type is-s"
                style={{ fontFamily: design.fontFamily }}
                onClick={() => addBlock(subheadingBlock())}
              >
                Adicionar um subtítulo
              </button>
              <button
                type="button"
                className="canva-add-type is-b"
                style={{ fontFamily: design.fontFamily }}
                onClick={() => addBlock(bodyBlock())}
              >
                Adicionar um pouco de texto
              </button>
            </>
          ) : null}
          {panel === "stickers" ? (
            <>
              <p className="canva-panel-title">Adesivos</p>
              <button type="button" className="canva-upload" onClick={() => uploadRef.current?.click()}>
                <ImagePlus size={16} />
                Foto da galeria
              </button>
              <input
                ref={uploadRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) addPhotoSticker(file);
                  e.target.value = "";
                }}
              />
              <input
                className="canva-search"
                placeholder="Buscar adesivos"
                value={stickerQ}
                onChange={(e) => setStickerQ(e.target.value)}
              />
              <div className="canva-chips">
                <button
                  type="button"
                  className={cn(stickerGroup === "todos" && "is-on")}
                  onClick={() => setStickerGroup("todos")}
                >
                  Todos
                </button>
                {STICKER_GROUPS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className={cn(stickerGroup === g.id && "is-on")}
                    onClick={() => setStickerGroup(g.id)}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
              <div className="canva-stickers">
                {filteredStickers.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="canva-sticker"
                    title={s.name}
                    onClick={() => placeSticker(s.src)}
                  >
                    <img src={s.src} alt="" />
                    <span>{s.name}</span>
                  </button>
                ))}
              </div>
            </>
          ) : null}
          {panel === "font" || panel === "size" ? (
            <>
              <p className="canva-panel-title">{panel === "font" ? "Fonte" : "Tamanho"}</p>
              {panel === "font" ? (
                <p className="canva-panel-note">
                  {selected && selected.kind !== "sticker"
                    ? "A fonte troca no texto selecionado."
                    : "Sem texto selecionado, a fonte vale para a página."}
                </p>
              ) : null}
              <Toolbar
                block={selected}
                fallbackFont={design.fontFamily}
                fallbackColor={ink}
                disabled={!selected}
                fontAlways={panel === "font"}
                onChange={applyType}
                onAlignPage={(where) => selected && patchBlock(selected.id, alignOnPage(selected, where))}
              />
            </>
          ) : null}
        </aside>

        <div
          className="canva-workspace"
          ref={workspace}
          onPointerDown={() => {
            setActive(null);
            setEditing(false);
            setGuides([]);
          }}
        >
          {pages.map((p, i) => (
            <div
              key={p.id}
              className={cn("canva-sheet", i === pageI && "is-current")}
              data-page={i}
              ref={(n) => {
                sheetRefs.current[p.id] = n;
              }}
            >
              <span className="canva-sheet-num">{i + 1}</span>
              <div
                className={cn("canva-page", light && "is-light")}
                style={{
                  backgroundImage: `url(${design.src})`,
                  fontFamily: design.fontFamily,
                  color: ink,
                  ["--canva-zoom" as string]: String(zoom / 100),
                  width: `min(${(420 * zoom) / 100}px, ${0.86 * zoom}vw)`,
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setPageI(i);
                }}
              >
                {p.blocks.map((b) => (
                  <CanvasItem
                    key={b.id}
                    block={b}
                    color={b.color || ink}
                    font={b.fontFamily || design.fontFamily}
                    active={active === b.id && i === pageI}
                    editing={editing && active === b.id && i === pageI}
                    others={p.blocks.filter((x) => x.id !== b.id)}
                    onSelect={() => {
                      setPageI(i);
                      setActive(b.id);
                      setEditing(false);
                    }}
                    onEdit={() => {
                      if (b.kind === "sticker") return;
                      setPageI(i);
                      setActive(b.id);
                      setEditing(true);
                    }}
                    onChange={(partial) => patchBlock(b.id, partial, i)}
                    onGuides={setGuides}
                  />
                ))}
                {i === pageI
                  ? guides.map((g, gi) => (
                      <i
                        key={`${g.axis}-${g.pos}-${gi}`}
                        className={cn("canva-guide", g.axis === "v" ? "is-v" : "is-h")}
                        style={g.axis === "v" ? { left: `${g.pos}%` } : { top: `${g.pos}%` }}
                      />
                    ))
                  : null}
              </div>
              <button type="button" className="canva-add-page" onClick={() => addPageAfter(i)}>
                <Plus size={14} /> Nova página
              </button>
            </div>
          ))}
        </div>

        <aside className="canva-pager" aria-label="Páginas">
          {pages.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className={cn(i === pageI && "is-on")}
              onClick={() => goPage(i)}
              style={{ backgroundImage: `url(${design.src})` }}
            >
              <span>{i + 1}</span>
            </button>
          ))}
          <button type="button" className="is-add" onClick={() => addPageAfter(pages.length - 1)} aria-label="Nova página">
            <Plus size={14} />
          </button>
        </aside>

        <div className="canva-bottom">
        <p className="canva-page-label">
          Página {pageI + 1} de {pages.length}
        </p>
        <button type="button" className="canva-full-btn" onClick={() => setPreviewOpen(true)}>
          <Maximize2 size={15} />
          Tela cheia
        </button>
        <label className="canva-zoom">
          {zoom}%
          <input type="range" min={50} max={200} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
        </label>
        </div>
      </div>

      {fullSheet.mounted ? (
        <div className={cn("canva-full sheet-pop", fullSheet.shown && "is-in")} role="dialog" aria-label="Carta em tela cheia">
          <div className="canva-full-veil" aria-hidden="true" />
          <header className="canva-full-bar">
            <p>Sua carta</p>
            <button
              type="button"
              onClick={() => {
                setPreviewOpen(false);
                document.body.style.overflow = "";
                document.documentElement.style.overflow = "";
              }}
            >
              <Minimize2 size={18} />
              Fechar
            </button>
          </header>
          <div className="canva-full-scroll">
            {pages.map((p, i) => (
              <div
                key={`full-${p.id}`}
                className={cn("canva-sheet", i === pageI && "is-current")}
              >
                <div
                  className={cn("canva-page", light && "is-light")}
                  style={{
                    backgroundImage: `url(${design.src})`,
                    fontFamily: design.fontFamily,
                    color: ink,
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setPageI(i);
                  }}
                >
                  {p.blocks.map((b) => (
                    <CanvasItem
                      key={b.id}
                      block={b}
                      color={b.color || ink}
                      font={b.fontFamily || design.fontFamily}
                      active={active === b.id && i === pageI}
                      editing={editing && active === b.id && i === pageI}
                      others={p.blocks.filter((x) => x.id !== b.id)}
                      onSelect={() => {
                        setPageI(i);
                        setActive(b.id);
                        setEditing(false);
                      }}
                      onEdit={() => {
                        if (b.kind === "sticker") return;
                        setPageI(i);
                        setActive(b.id);
                        setEditing(true);
                      }}
                      onChange={(partial) => patchBlock(b.id, partial, i)}
                      onGuides={setGuides}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <nav className="canva-dock" aria-label="Ferramentas da carta">
            <div className="canva-dock-tabs">
              {(
                [
                  ["design", "Design"],
                  ["stickers", "Adesivos"],
                  ["text", "Texto"],
                  ["font", "Fonte"],
                  ["size", "Tamanho"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={cn(panel === id && "is-on")}
                  onClick={() => (id === "stickers" ? openStickers() : setPanel(id))}
                >
                  {label}
                </button>
              ))}
            </div>
            <div key={panel} className="canva-dock-pane">
              {panel === "design" ? (
                <div className="canva-thumbs">
                  {filteredDesigns.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      className={cn("canva-thumb", d.id === designId && "is-on")}
                      onClick={() => onDesignId(d.id)}
                    >
                      <LetterThumb
                        src={d.src}
                        blocks={page?.blocks ?? []}
                        ink={ink}
                        font={design.fontFamily}
                        fromName={fromName}
                        toName={toName}
                      />
                      <span>{d.name}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              {panel === "text" ? (
                <div className="canva-dock-stack">
                  <button type="button" className="canva-add-type is-h" onClick={() => addBlock(headingBlock())}>
                    Título
                  </button>
                  <button type="button" className="canva-add-type is-s" onClick={() => addBlock(subheadingBlock())}>
                    Subtítulo
                  </button>
                  <button type="button" className="canva-add-type is-b" onClick={() => addBlock(bodyBlock())}>
                    Texto
                  </button>
                </div>
              ) : null}
              {panel === "stickers" ? (
                <div className="canva-stickers">
                  {filteredStickers.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="canva-sticker"
                      onClick={() => placeSticker(s.src)}
                    >
                      <img src={s.src} alt="" />
                    </button>
                  ))}
                </div>
              ) : null}
              {panel === "font" || panel === "size" ? (
                <Toolbar
                  block={selected}
                  fallbackFont={design.fontFamily}
                  fallbackColor={ink}
                  disabled={!selected}
                  fontAlways={panel === "font"}
                  onChange={applyType}
                  onAlignPage={(where) => selected && patchBlock(selected.id, alignOnPage(selected, where))}
                />
              ) : null}
            </div>
          </nav>
        </div>
      ) : null}

      {designSheet.mounted ? (
        <div className={cn("canva-picker sheet-pop", designSheet.shown && "is-in")} role="dialog" aria-label="Escolher o papel">
          <header className="canva-picker-bar">
            <div>
              <p className="canva-picker-kicker">Papel</p>
              <h2>Escolha o template</h2>
            </div>
            <button type="button" className="canva-picker-min" onClick={() => setPickerOpen(false)}>
              <Minimize2 size={18} />
              Minimizar
            </button>
          </header>
          <input
            className="canva-search"
            placeholder="Buscar papéis"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="canva-picker-grid">
            {filteredDesigns.map((d) => (
              <button
                key={d.id}
                type="button"
                className={cn("canva-picker-card", d.id === designId && "is-on")}
                onClick={() => pickDesign(d.id)}
              >
                <LetterThumb
                  className="canva-picker-paper"
                  src={d.src}
                  blocks={page?.blocks ?? []}
                  ink={ink}
                  font={design.fontFamily}
                  fromName={fromName}
                  toName={toName}
                />
                <span>
                  {d.name}
                  <i>{d.paid ? formatBrl(d.priceBrl) : "Grátis"}</i>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {stickerSheet.mounted ? (
        <div className={cn("canva-picker sheet-pop", stickerSheet.shown && "is-in")} role="dialog" aria-label="Adesivos">
          <header className="canva-picker-bar">
            <div>
              <p className="canva-picker-kicker">Adesivos</p>
              <h2>Cole na carta</h2>
            </div>
            <button type="button" className="canva-picker-min" onClick={closeStickers}>
              Fechar
            </button>
          </header>
          <button type="button" className="canva-upload" onClick={() => uploadRef.current?.click()}>
            <ImagePlus size={16} />
            Foto da galeria
          </button>
          <input
            className="canva-search"
            placeholder="Buscar adesivos"
            value={stickerQ}
            onChange={(e) => setStickerQ(e.target.value)}
          />
          <div className="canva-chips">
            <button
              type="button"
              className={cn(stickerGroup === "todos" && "is-on")}
              onClick={() => setStickerGroup("todos")}
            >
              Todos
            </button>
            {STICKER_GROUPS.map((g) => (
              <button
                key={g.id}
                type="button"
                className={cn(stickerGroup === g.id && "is-on")}
                onClick={() => setStickerGroup(g.id)}
              >
                {g.label}
              </button>
            ))}
          </div>
          <div className="canva-stickers">
            {filteredStickers.map((s) => (
              <button
                key={s.id}
                type="button"
                className="canva-sticker"
                title={s.name}
                onClick={() => placeSticker(s.src)}
              >
                <img src={s.src} alt="" />
                <span>{s.name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LetterThumb({
  src,
  blocks,
  ink,
  font,
  fromName,
  toName,
  className,
}: {
  src: string;
  blocks: TextBlock[];
  ink: string;
  font: string;
  fromName: string;
  toName: string;
  className?: string;
}) {
  return (
    <span className={cn("paper-preview", className)} style={{ backgroundImage: `url(${src})` }}>
      {fromName || toName ? (
        <span className="paper-preview-names">
          {fromName || "…"} → {toName || "…"}
        </span>
      ) : null}
      {blocks.map((b) => {
        if (b.kind === "sticker" && b.src) {
          return (
            <img
              key={b.id}
              src={b.src}
              alt=""
              className="paper-preview-bit"
              style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` }}
            />
          );
        }
        if (!b.text.trim()) return null;
        return (
          <span
            key={b.id}
            className="paper-preview-bit paper-preview-text"
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: `${b.w}%`,
              height: `${b.h}%`,
              color: b.color || ink,
              fontFamily: b.fontFamily || font,
              fontWeight: b.weight,
              fontStyle: b.italic ? "italic" : "normal",
              textAlign: b.align,
              fontSize: `${Math.max(3.2, (b.size / 340) * 100)}cqw`,
            }}
          >
            {b.text}
          </span>
        );
      })}
    </span>
  );
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function hexToHsv(hex: string) {
  const raw = hex.replace("#", "");
  const full = (raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw).padEnd(6, "0").slice(0, 6);
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n)) return { h: 348, s: 0.64, v: 0.91 };
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

function hsvToHex(h: number, s: number, v: number) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const byte = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${byte(r)}${byte(g)}${byte(b)}`;
}

function ColorWell({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const [open, setOpen] = useState(false);
  const sheet = usePresence(open);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const hsv = hexToHsv(value || "#1a1410");
  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;
  const [box, setBox] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => {
      const target = e.target as Node;
      if (btn.current?.contains(target) || pop.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [open]);

  function drag(kind: "sv" | "h", target: HTMLElement, ev: PointerEvent) {
    const rect = target.getBoundingClientRect();
    const current = hsvRef.current;
    if (kind === "sv") {
      const s = clamp01((ev.clientX - rect.left) / rect.width);
      const v = 1 - clamp01((ev.clientY - rect.top) / rect.height);
      onChange(hsvToHex(current.h, s, v));
    } else {
      const next = clamp01((ev.clientX - rect.left) / rect.width) * 360;
      onChange(hsvToHex(next, Math.max(current.s, 0.01), Math.max(current.v, 0.01)));
    }
  }

  function bind(kind: "sv" | "h", e: React.PointerEvent<HTMLElement>) {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    drag(kind, target, e.nativeEvent);
    const move = (ev: PointerEvent) => drag(kind, target, ev);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <>
      <button
        ref={btn}
        type="button"
        className="canva-color"
        title="Cor da fonte"
        aria-label="Cor da fonte"
        style={{ background: value || "#1a1410" }}
        onClick={() => {
          const rect = btn.current?.getBoundingClientRect();
          if (rect) {
            const width = 248;
            const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
            const top = Math.min(rect.bottom + 8, window.innerHeight - 250);
            setBox({ top, left });
          }
          setOpen((v) => !v);
        }}
      />
      {sheet.mounted
        ? createPortal(
            <div
              ref={pop}
              className={cn("canva-color-pop sheet-pop", sheet.shown && "is-in")}
              style={{ top: box.top, left: box.left }}
              role="dialog"
              aria-label="Escolher cor"
            >
              <div
                className="canva-color-sv"
                style={{
                  background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hsvToHex(hsv.h, 1, 1)})`,
                }}
                onPointerDown={(e) => bind("sv", e)}
              >
                <i style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }} />
              </div>
              <div className="canva-color-hue" onPointerDown={(e) => bind("h", e)}>
                <i style={{ left: `${(hsv.h / 360) * 100}%` }} />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function FontPicker({
  value,
  fallback,
  disabled,
  onChange,
}: {
  value: string;
  fallback: string;
  disabled: boolean;
  onChange: (fontFamily: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuSheet = usePresence(open);
  const [menu, setMenu] = useState({ top: 0, left: 0 });
  const root = useRef<HTMLDivElement>(null);
  const current =
    EDITOR_FONT_GROUPS.flatMap((g) => g.fonts).find((f) => f.id === value)?.label ||
    value.split(",")[0].replace(/"/g, "");

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className={cn("canva-font", open && "is-open")} ref={root}>
      <button
        type="button"
        disabled={disabled}
        className="canva-font-btn"
        title="Fonte"
        style={{ fontFamily: value }}
        onClick={() => {
          const r = root.current?.getBoundingClientRect();
          if (r) {
            const width = 240;
            const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
            setMenu({ top: r.bottom + 6, left });
          }
          setOpen((v) => !v);
        }}
      >
        {current}
      </button>
      {menuSheet.mounted ? (
        <div className={cn("canva-font-menu sheet-pop", menuSheet.shown && "is-in")} role="listbox" style={{ top: menu.top, left: menu.left }}>
          <button
            type="button"
            style={{ fontFamily: fallback }}
            className={cn(value === fallback && "is-on")}
            onClick={() => {
              onChange(fallback);
              setOpen(false);
            }}
          >
            Papel · {fallback.split(",")[0]}
          </button>
          {EDITOR_FONT_GROUPS.map((g) => (
            <div key={g.label} className="canva-font-group">
              <p>{g.label}</p>
              {g.fonts.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="option"
                  aria-selected={value === f.id}
                  className={cn(value === f.id && "is-on")}
                  style={{ fontFamily: f.id }}
                  onClick={() => {
                    onChange(f.id);
                    setOpen(false);
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Toolbar({
  block,
  fallbackFont,
  fallbackColor,
  disabled,
  fontAlways,
  onChange,
  onAlignPage,
}: {
  block?: TextBlock;
  fallbackFont: string;
  fallbackColor: string;
  disabled: boolean;
  fontAlways?: boolean;
  onChange: (partial: Partial<TextBlock>) => void;
  onAlignPage: (where: "left" | "center" | "right" | "top" | "middle" | "bottom") => void;
}) {
  const isSticker = block?.kind === "sticker";
  return (
    <div className={cn("canva-toolbar", disabled && !fontAlways && "is-off")}>
      {fontAlways ? (
        <FontPicker
          disabled={false}
          value={block && block.kind !== "sticker" ? block.fontFamily || fallbackFont : fallbackFont}
          fallback={fallbackFont}
          onChange={(fontFamily) => onChange({ fontFamily })}
        />
      ) : null}
      {fontAlways || !isSticker ? (
        <ColorWell
          value={(block && block.kind !== "sticker" && block.color) || fallbackColor}
          onChange={(color) => onChange({ color })}
        />
      ) : null}
      {!isSticker ? (
        <>
          {fontAlways ? null : (
          <FontPicker
            disabled={disabled}
            value={block?.fontFamily || fallbackFont}
            fallback={fallbackFont}
            onChange={(fontFamily) => onChange({ fontFamily })}
          />
          )}
          <input
            type="number"
            disabled={disabled}
            min={10}
            max={96}
            value={block?.size ?? 22}
            onChange={(e) => onChange({ size: Number(e.target.value) })}
          />
          <button type="button" disabled={disabled} className={cn(block?.weight === 700 && "is-on")} onClick={() => onChange({ weight: block?.weight === 700 ? 400 : 700 })}>
            <Bold size={14} />
          </button>
          <button type="button" disabled={disabled} className={cn(block?.italic && "is-on")} onClick={() => onChange({ italic: !block?.italic })}>
            <Italic size={14} />
          </button>
          <button type="button" disabled={disabled} className={cn(block?.underline && "is-on")} onClick={() => onChange({ underline: !block?.underline })}>
            <Underline size={14} />
          </button>
          <span className="canva-tool-split" />
          <button type="button" disabled={disabled} className={cn((block?.align || "left") === "left" && "is-on")} onClick={() => onChange({ align: "left" })} title="Alinhar texto à esquerda">
            <AlignLeft size={14} />
          </button>
          <button type="button" disabled={disabled} className={cn(block?.align === "center" && "is-on")} onClick={() => onChange({ align: "center" })} title="Centralizar texto">
            <AlignCenter size={14} />
          </button>
          <button type="button" disabled={disabled} className={cn(block?.align === "right" && "is-on")} onClick={() => onChange({ align: "right" })} title="Alinhar texto à direita">
            <AlignRight size={14} />
          </button>
          <button type="button" disabled={disabled} className={cn(block?.align === "justify" && "is-on")} onClick={() => onChange({ align: "justify" })} title="Justificar">
            <AlignJustify size={14} />
          </button>
          <input
            className="canva-ls"
            type="number"
            step={0.02}
            min={-0.1}
            max={0.4}
            disabled={disabled}
            value={block?.letterSpacing ?? 0}
            onChange={(e) => onChange({ letterSpacing: Number(e.target.value) })}
            title="Espaçamento"
          />
        </>
      ) : (
        <button type="button" disabled={disabled} className={cn(block?.flipX && "is-on")} onClick={() => onChange({ flipX: !block?.flipX })}>
          Espelhar
        </button>
      )}
      <span className="canva-tool-split" />
      <button type="button" disabled={disabled} onClick={() => onAlignPage("left")} title="Alinhar à esquerda da página">
        <AlignHorizontalJustifyStart size={14} />
      </button>
      <button type="button" disabled={disabled} onClick={() => onAlignPage("center")} title="Centralizar na página">
        <AlignHorizontalJustifyCenter size={14} />
      </button>
      <button type="button" disabled={disabled} onClick={() => onAlignPage("right")} title="Alinhar à direita da página">
        <AlignHorizontalJustifyEnd size={14} />
      </button>
      <button type="button" disabled={disabled} onClick={() => onAlignPage("top")} title="Alinhar ao topo">
        <AlignVerticalJustifyStart size={14} />
      </button>
      <button type="button" disabled={disabled} onClick={() => onAlignPage("middle")} title="Meio da página">
        <AlignVerticalJustifyCenter size={14} />
      </button>
      <button type="button" disabled={disabled} onClick={() => onAlignPage("bottom")} title="Alinhar à base">
        <AlignVerticalJustifyEnd size={14} />
      </button>
    </div>
  );
}

function CanvasItem({
  block,
  color,
  font,
  active,
  editing,
  others,
  onSelect,
  onEdit,
  onChange,
  onGuides,
}: {
  block: TextBlock;
  color: string;
  font: string;
  active: boolean;
  editing: boolean;
  others: TextBlock[];
  onSelect: () => void;
  onEdit: () => void;
  onChange: (partial: Partial<TextBlock>) => void;
  onGuides: (guides: Guide[]) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    kind: "move" | "se" | "e";
    x: number;
    y: number;
    bx: number;
    by: number;
    bw: number;
    bh: number;
  } | null>(null);
  const isSticker = block.kind === "sticker" || Boolean(block.src && !block.text && block.kind !== "text");

  function begin(kind: "move" | "se" | "e", e: React.PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    const parent = box.current?.parentElement?.getBoundingClientRect();
    if (!parent) return;
    drag.current = { kind, x: e.clientX, y: e.clientY, bx: block.x, by: block.y, bw: block.w, bh: block.h };
    onSelect();
    const move = (ev: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = ((ev.clientX - d.x) / parent.width) * 100;
      const dy = ((ev.clientY - d.y) / parent.height) * 100;
      if (d.kind === "move") {
        const snapped = snapBlock(block, others, d.bx + dx, d.by + dy);
        onGuides(snapped.guides);
        onChange({ x: snapped.x, y: snapped.y });
      } else if (d.kind === "se") {
        onChange({
          w: clamp(d.bw + dx, 8, 100 - d.bx),
          h: clamp(d.bh + dy, 8, 100 - d.by),
        });
      } else {
        onChange({ w: clamp(d.bw + dx, 8, 100 - d.bx) });
      }
    };
    const up = () => {
      drag.current = null;
      onGuides([]);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  useEffect(() => {
    if (editing && textRef.current) {
      textRef.current.innerText = block.text || "";
      textRef.current.focus();
    }
  }, [editing]);

  return (
    <div
      ref={box}
      className={cn("canva-box", active && "is-active", editing && "is-editing", isSticker && "is-sticker")}
      style={{
        left: `${block.x}%`,
        top: `${block.y}%`,
        width: `${block.w}%`,
        height: `${block.h}%`,
        transform: `rotate(${block.rotate || 0}deg) scaleX(${block.flipX ? -1 : 1})`,
      }}
      onPointerDown={(e) => begin("move", e)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onEdit();
      }}
    >
      {isSticker ? (
        <img src={block.src} alt="" className="canva-box-sticker" draggable={false} />
      ) : (
        <div
          ref={textRef}
          className="canva-box-text"
          contentEditable={editing}
          suppressContentEditableWarning
          onPointerDown={(e) => {
            if (editing) e.stopPropagation();
          }}
          onInput={(e) => onChange({ text: (e.currentTarget as HTMLDivElement).innerText })}
          style={{
            fontFamily: font,
            fontSize: `${block.size}px`,
            fontWeight: block.weight || 400,
            fontStyle: block.italic ? "italic" : "normal",
            textDecoration: block.underline ? "underline" : "none",
            textAlign: block.align || "left",
            color,
            lineHeight: block.lineHeight || 1.35,
            letterSpacing: `${block.letterSpacing || 0}em`,
            justifyContent: block.valign === "middle" ? "center" : block.valign === "bottom" ? "flex-end" : "flex-start",
          }}
        >
          {editing ? null : block.text || "Digite aqui"}
        </div>
      )}
      {active ? (
        <>
          <i className="canva-handle is-se" onPointerDown={(e) => begin("se", e)} />
          <i className="canva-handle is-e" onPointerDown={(e) => begin("e", e)} />
          <i className="canva-handle is-ne" />
          <i className="canva-handle is-nw" />
          <i className="canva-handle is-sw" />
        </>
      ) : null}
    </div>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
