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
  BringToFront,
  Check,
  ChevronLeft,
  Copy,
  ImagePlus,
  Italic,
  LayoutTemplate,
  Magnet,
  Maximize2,
  Minimize2,
  PanelBottomClose,
  PanelBottomOpen,
  Plus,
  RotateCcw,
  SendToBack,
  Sticker,
  Trash2,
  Type,
  Underline,
  Undo2,
  X,
} from "lucide-react";
import { DESIGNS, getDesign } from "@/lib/designs";
import { formatBrl } from "@/lib/cart";
import {
  EDITOR_FONT_GROUPS,
  alignOnPage,
  blockFontSize,
  bodyBlock,
  canvasBackgroundClick,
  clampBlockPosition,
  duplicateBlock,
  headingBlock,
  newPage,
  pagesPlainText,
  reorderBlock,
  resizeBox,
  rotationFromPointer,
  snapBlock,
  stickerBlock,
  subheadingBlock,
  type BlockBox,
  type Guide,
  type LetterPage,
  type ResizeHandle,
  type TextBlock,
} from "@/lib/pages";
import { STICKER_GROUPS, STICKERS } from "@/lib/stickers";
import { cn } from "@/lib/utils";
import { MeasuredBar } from "@/components/ui/MeasuredBar";

type Panel = "design" | "text" | "stickers" | "font" | "size";

/** O seletor de papel abre sozinho só na primeira carta; depois fica no botão "Papel". */
const PICKER_SEEN_KEY = "cartas-papel-visto";
const MOBILE_EDITOR = "(max-width: 860px)";

function isMobileEditor() {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_EDITOR).matches;
}

function pickerSeen() {
  try {
    return window.localStorage.getItem(PICKER_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markPickerSeen() {
  try {
    window.localStorage.setItem(PICKER_SEEN_KEY, "1");
  } catch {
    /* modo privado: abre de novo na próxima, sem problema */
  }
}

type FsDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
};
type FsElement = HTMLElement & { webkitRequestFullscreen?: () => void };

function fullscreenElement() {
  const doc = document as FsDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

/** Tela cheia de verdade quando o navegador deixa; no iPhone fica o overlay em CSS. */
function requestNativeFullscreen() {
  const root = document.documentElement as FsElement;
  try {
    if (typeof root.requestFullscreen === "function") {
      void root.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
    } else if (typeof root.webkitRequestFullscreen === "function") {
      root.webkitRequestFullscreen();
    }
  } catch {
    /* sem API (ou bloqueado no iframe): o overlay em CSS continua valendo */
  }
}

function exitNativeFullscreen() {
  const doc = document as FsDocument;
  try {
    if (doc.fullscreenElement && typeof doc.exitFullscreen === "function") {
      void doc.exitFullscreen().catch(() => {});
    } else if (doc.webkitFullscreenElement && typeof doc.webkitExitFullscreen === "function") {
      doc.webkitExitFullscreen();
    }
  } catch {
    /* já saiu */
  }
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

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
  /** Volta para o passo anterior (barra compacta do celular). */
  onBack?: () => void;
  /** Ex.: "Passo 2 de 5". */
  stepLabel?: string;
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
  onBack,
  stepLabel,
}: Props) {
  const design = getDesign(designId);
  const [panel, setPanel] = useState<Panel | null>("design");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [stickerPop, setStickerPop] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [dockOpen, setDockOpen] = useState(false);
  const [fullW, setFullW] = useState<number | null>(null);
  const [snapOn, setSnapOn] = useState(false);
  const nativeFs = useRef(false);
  const fullScroll = useRef<HTMLDivElement>(null);
  const fullSheetRefs = useRef<Record<string, HTMLDivElement | null>>({});
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

  // Tela cheia: trava o scroll da página por trás (inclusive no iOS, que ignora
  // overflow no body) e devolve tudo como estava ao sair.
  useEffect(() => {
    if (!previewOpen) return;
    const body = document.body;
    const html = document.documentElement;
    const scrollY = window.scrollY;
    const prev = {
      bodyOverflow: body.style.overflow,
      htmlOverflow: html.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };
    body.classList.add("canva-full-open");
    html.classList.add("canva-full-open");
    body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    return () => {
      body.classList.remove("canva-full-open");
      html.classList.remove("canva-full-open");
      body.style.overflow = prev.bodyOverflow;
      html.style.overflow = prev.htmlOverflow;
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      window.scrollTo(0, scrollY);
    };
  }, [previewOpen]);

  // Sincroniza com a tela cheia do navegador: ESC (ou o gesto do sistema)
  // sai do modo nativo e fecha o overlay junto, sem deixar estado preso.
  useEffect(() => {
    const onChange = () => {
      if (fullscreenElement()) {
        nativeFs.current = true;
        return;
      }
      if (!nativeFs.current) return;
      nativeFs.current = false;
      setPreviewOpen(false);
      setEditing(false);
      setGuides([]);
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
      if (nativeFs.current && fullscreenElement()) exitNativeFullscreen();
      nativeFs.current = false;
    };
  }, []);

  // A folha da tela cheia ocupa o maior tamanho que cabe (largura e altura), em 3:4.
  useEffect(() => {
    if (!fullSheet.mounted) return;
    const el = fullScroll.current;
    if (!el) return;
    const measure = () => {
      const styles = window.getComputedStyle(el);
      const padX = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
      const padY = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
      const availW = el.clientWidth - padX;
      const availH = el.clientHeight - padY;
      const next = Math.floor(Math.max(180, Math.min(availW, availH * 0.75, 860)));
      setFullW((prev) => (prev === next ? prev : next));
    };
    measure();
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [fullSheet.mounted, dockOpen]);

  // Ao abrir a tela cheia, começa na página que estava aberta no editor.
  useEffect(() => {
    if (!fullSheet.mounted) return;
    const id = pages[pageI]?.id;
    const frame = window.requestAnimationFrame(() => {
      if (id) fullSheetRefs.current[id]?.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
    // Só na abertura: trocar de página dentro da tela cheia não deve rolar de volta.
  }, [fullSheet.mounted]);

  const light = design.ink === "light";
  const ink = light ? "#f6ede4" : "#1a1410";

  function openFull() {
    setEditing(false);
    setGuides([]);
    // Abre limpo: só a folha. As ferramentas ficam a um toque.
    setDockOpen(false);
    setPanel((current) => current ?? "design");
    setPreviewOpen(true);
    // Precisa ser dentro do clique (gesto do usuário) para o navegador aceitar.
    if (!fullscreenElement()) requestNativeFullscreen();
  }

  function closeFull() {
    setPreviewOpen(false);
    setEditing(false);
    setGuides([]);
    if (nativeFs.current || fullscreenElement()) {
      nativeFs.current = false;
      exitNativeFullscreen();
    }
    const id = pages[pageI]?.id;
    window.setTimeout(() => {
      if (id) sheetRefs.current[id]?.scrollIntoView({ block: "center" });
    }, 60);
  }

  function commit(nextPages: LetterPage[], record = true) {
    if (record) history.current = [...history.current.slice(-29), pages];
    onChange(nextPages);
  }

  function patchPageAt(index: number, next: LetterPage, record = true) {
    commit(
      pages.map((p, i) => (i === index ? next : p)),
      record,
    );
  }

  function patchBlock(id: string, partial: Partial<TextBlock>, index = pageI, record = true) {
    const target = pages[index];
    if (!target) return;
    patchPageAt(
      index,
      {
        ...target,
        blocks: target.blocks.map((b) => (b.id === id ? { ...b, ...partial } : b)),
      },
      record,
    );
  }

  function removeSelected() {
    if (!page || !active) return;
    patchPageAt(pageI, { ...page, blocks: page.blocks.filter((b) => b.id !== active) });
    setActive(null);
    setEditing(false);
  }

  function duplicateSelected() {
    if (!page || !selected) return;
    const copy = duplicateBlock(selected);
    patchPageAt(pageI, { ...page, blocks: [...page.blocks, copy] });
    setActive(copy.id);
    setEditing(false);
  }

  function layerSelected(where: "front" | "back") {
    if (!page || !selected) return;
    patchPageAt(pageI, { ...page, blocks: reorderBlock(page.blocks, selected.id, where) });
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
    // No celular a folha de ferramentas fecha para o texto novo aparecer inteiro.
    if (!previewOpen && isMobileEditor()) setPanel((current) => (current === "text" ? null : current));
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

  const startedWriting = useRef(false);

  /** Carta vazia: o primeiro texto já abre pronto para digitar (no computador, com o cursor nele). */
  function startWriting() {
    if (startedWriting.current) return;
    startedWriting.current = true;
    if (pagesPlainText(pages).length > 0) return;
    const first = pages[0]?.blocks.find((b) => b.kind !== "sticker");
    if (!first || isMobileEditor()) return;
    setPageI(0);
    setActive(first.id);
    setEditing(true);
  }

  useEffect(() => {
    if (isMobileEditor() && !pickerSeen()) {
      setPickerOpen(true);
      return;
    }
    startWriting();
    // Só na abertura do editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function closePicker() {
    markPickerSeen();
    setPickerOpen(false);
    startWriting();
  }

  function pickDesign(id: string) {
    onDesignId(id);
    if (isMobileEditor()) closePicker();
  }

  function openDesigns() {
    setPanel("design");
    if (isMobileEditor()) setPickerOpen(true);
  }

  function openStickers() {
    if (isMobileEditor()) {
      setStickerPop(true);
      return;
    }
    setPanel("stickers");
  }

  /** Abas da barra de baixo no celular: tocar de novo fecha a folha. */
  function togglePanel(next: Panel) {
    setPanel((current) => (current === next ? null : next));
  }

  function clearSelection() {
    setActive(null);
    setEditing(false);
    setGuides([]);
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
      if (e.key === "Escape") {
        if (editing) {
          // Sai do modo digitar, mas o bloco segue selecionado.
          setEditing(false);
          return;
        }
        if (active) {
          setActive(null);
          setGuides([]);
          return;
        }
        if (previewOpen) closeFull();
        return;
      }
      // Digitando (no texto da carta ou num campo): o navegador cuida do desfazer e das teclas.
      if (editing || isTypingTarget(e.target)) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
        return;
      }
      if (!active || !page) return;
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        removeSelected();
        return;
      }
      const step = e.shiftKey ? 2 : 0.5;
      const delta =
        e.key === "ArrowLeft"
          ? { x: -step, y: 0 }
          : e.key === "ArrowRight"
            ? { x: step, y: 0 }
            : e.key === "ArrowUp"
              ? { x: 0, y: -step }
              : e.key === "ArrowDown"
                ? { x: 0, y: step }
                : null;
      const block = page.blocks.find((b) => b.id === active);
      if (delta && block) {
        e.preventDefault();
        patchBlock(block.id, clampBlockPosition(block, block.x + delta.x, block.y + delta.y));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

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
    const onGesture = (e: Event) => e.preventDefault();
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("gesturestart", onGesture);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("gesturestart", onGesture);
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
    <div className={cn("canva", floatTools && "is-float-tools", selected && "has-selection", editing && "is-typing")}>
      {/* Sempre montado: o botão "Foto da galeria" funciona no painel, na folha do celular e na tela cheia. */}
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
      <div className="canva-top">
        {onBack ? (
          <button type="button" className="canva-back" onClick={onBack} aria-label="Voltar para os nomes">
            <ChevronLeft size={20} />
            <span>Voltar</span>
          </button>
        ) : null}
        {stepLabel ? (
          <p className="canva-steplabel">
            <span>{stepLabel}</span>
            <strong>Escreva a carta</strong>
          </p>
        ) : null}
        <div className="canva-top-left">
          <button type="button" onClick={undo} className="canva-icon-btn" title="Desfazer" aria-label="Desfazer">
            <Undo2 size={16} />
          </button>
          {selected ? (
            <SelectionActions
              block={selected}
              onRemove={removeSelected}
              onDuplicate={duplicateSelected}
              onLayer={layerSelected}
              onResetRotation={() => patchBlock(selected.id, { rotate: 0 })}
            />
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
          <button type="button" className="canva-panel-close" onClick={() => setPanel(null)} aria-label="Fechar ferramentas">
            <X size={18} />
          </button>
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
              <p className="canva-panel-note">
                Arraste para qualquer lugar da folha. Os cantos mudam o tamanho, a bolinha de cima gira. Toque de
                novo (ou dois cliques) para escrever.
              </p>
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
          onPointerDown={(e) => {
            // Só o fundo vazio desmarca. Clique no papel, no texto ou nas
            // ferramentas mantém o bloco ativo (só sai do modo digitar).
            if (!canvasBackgroundClick(e.target)) {
              setEditing(false);
              return;
            }
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
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setPageI(i);
                  // Clique no papel vazio: para de digitar, mas mantém o bloco
                  // selecionado para continuar formatando / movendo.
                  if ((e.target as HTMLElement).closest(".canva-box")) return;
                  setEditing(false);
                }}
              >
                {p.blocks.map((b) => (
                  <CanvasItem
                    key={b.id}
                    block={b}
                    color={b.color || ink}
                    font={b.fontFamily || design.fontFamily}
                    active={active === b.id && i === pageI}
                    editing={!previewOpen && editing && active === b.id && i === pageI}
                    others={p.blocks.filter((x) => x.id !== b.id)}
                    snap={snapOn}
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
                    onChange={(partial, record) => patchBlock(b.id, partial, i, record)}
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

        {selected ? (
          <MeasuredBar
            spaceVar="--canva-context-space"
            mode="height"
            className="canva-context"
            role="toolbar"
            aria-label="Editar o elemento selecionado"
          >
            <div className="canva-context-scroll">
              <SelectionActions
                block={selected}
                onRemove={removeSelected}
                onDuplicate={duplicateSelected}
                onLayer={layerSelected}
                onResetRotation={() => patchBlock(selected.id, { rotate: 0 })}
              />
              <Toolbar
                block={selected}
                fallbackFont={design.fontFamily}
                fallbackColor={ink}
                disabled={false}
                onChange={applyType}
                onAlignPage={(where) => selected && patchBlock(selected.id, alignOnPage(selected, where))}
              />
              <button
                type="button"
                className={cn("canva-snap-btn", snapOn && "is-on")}
                aria-pressed={snapOn}
                title="Guias magnéticas"
                onClick={() => setSnapOn((v) => !v)}
              >
                <Magnet size={15} />
                Ímã
              </button>
            </div>
            <button type="button" className="canva-context-done" onClick={clearSelection} aria-label="Concluir edição">
              <Check size={18} />
            </button>
          </MeasuredBar>
        ) : null}

        <div className="canva-bottom">
        <p className="canva-page-label">
          Página {pageI + 1} de {pages.length}
        </p>
        <button
          type="button"
          className={cn("canva-snap-btn", snapOn && "is-on")}
          aria-pressed={snapOn}
          title="Guias magnéticas: puxam o elemento para o centro e as margens"
          onClick={() => setSnapOn((v) => !v)}
        >
          <Magnet size={15} />
          {snapOn ? "Ímã ligado" : "Ímã"}
        </button>
        <button type="button" className="canva-full-btn" onClick={openFull}>
          <Maximize2 size={15} />
          Tela cheia
        </button>
        <label className="canva-zoom">
          {zoom}%
          <input type="range" min={50} max={200} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
        </label>
        </div>
      </div>

      <nav className="canva-tabbar" aria-label="Ferramentas da carta">
        <button type="button" className={cn(pickerOpen && "is-on")} onClick={openDesigns}>
          <LayoutTemplate size={20} />
          <span>Papel</span>
        </button>
        <button type="button" className={cn(panel === "text" && "is-on")} onClick={() => togglePanel("text")}>
          <Type size={20} />
          <span>Texto</span>
        </button>
        <button type="button" className={cn(stickerPop && "is-on")} onClick={openStickers}>
          <Sticker size={20} />
          <span>Adesivos</span>
        </button>
        <button type="button" className={cn(panel === "font" && "is-on")} onClick={() => togglePanel("font")}>
          <Bold size={20} />
          <span>Fonte</span>
        </button>
        <button type="button" onClick={openFull}>
          <Maximize2 size={20} />
          <span>Ampliar</span>
        </button>
        <button type="button" className="canva-tabbar-next" disabled={!canContinue} onClick={onContinue}>
          Continuar
        </button>
      </nav>

      {fullSheet.mounted
        ? createPortal(
            <div
              className={cn("canva-full sheet-pop", fullSheet.shown && "is-in")}
              role="dialog"
              aria-modal="true"
              aria-label="Carta em tela cheia"
            >
              <div className="canva-full-veil" aria-hidden="true" />
              <header className="canva-full-bar">
                <p>
                  <span className="canva-full-title">Sua carta</span>
                  <span className="canva-full-count">
                    {pageI + 1}/{pages.length}
                    <span className="canva-full-label"> páginas</span>
                  </span>
                </p>
                <div className="canva-full-actions">
                  {selected ? (
                    <SelectionActions
                      block={selected}
                      onRemove={removeSelected}
                      onDuplicate={duplicateSelected}
                      onLayer={layerSelected}
                      onResetRotation={() => patchBlock(selected.id, { rotate: 0 })}
                    />
                  ) : null}
                  <button
                    type="button"
                    className="canva-full-tools"
                    aria-pressed={dockOpen}
                    aria-label={dockOpen ? "Esconder ferramentas" : "Mostrar ferramentas"}
                    onClick={() => setDockOpen((v) => !v)}
                  >
                    {dockOpen ? <PanelBottomClose size={18} /> : <PanelBottomOpen size={18} />}
                    <span className="canva-full-label">{dockOpen ? "Esconder ferramentas" : "Ferramentas"}</span>
                  </button>
                  <button type="button" className="canva-full-close" onClick={closeFull} aria-label="Sair da tela cheia">
                    <Minimize2 size={18} />
                    <span className="canva-full-label">Fechar</span>
                  </button>
                </div>
              </header>
              <div
                className="canva-full-scroll"
                ref={fullScroll}
                onPointerDown={(e) => {
                  if (!canvasBackgroundClick(e.target)) return;
                  setActive(null);
                  setEditing(false);
                  setGuides([]);
                }}
              >
                {pages.map((p, i) => (
                  <div
                    key={`full-${p.id}`}
                    className={cn("canva-sheet", i === pageI && "is-current")}
                    ref={(n) => {
                      fullSheetRefs.current[p.id] = n;
                    }}
                  >
                    <div
                      className={cn("canva-page", light && "is-light")}
                      style={{
                        backgroundImage: `url(${design.src})`,
                        fontFamily: design.fontFamily,
                        color: ink,
                        width: fullW ? `${fullW}px` : undefined,
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setPageI(i);
                        if ((e.target as HTMLElement).closest(".canva-box")) return;
                        setEditing(false);
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
                          snap={snapOn}
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
                          onChange={(partial, record) => patchBlock(b.id, partial, i, record)}
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
                  </div>
                ))}
                <button type="button" className="canva-add-page" onClick={() => addPageAfter(pages.length - 1)}>
                  <Plus size={14} /> Nova página
                </button>
              </div>
              {dockOpen ? (
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
                        onClick={() => setPanel(id)}
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
                      <>
                        <button type="button" className="canva-upload" onClick={() => uploadRef.current?.click()}>
                          <ImagePlus size={16} />
                          Foto da galeria
                        </button>
                        <div className="canva-stickers">
                          {filteredStickers.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              className="canva-sticker"
                              title={s.name}
                              onClick={() => addBlock(stickerBlock(s.src))}
                            >
                              <img src={s.src} alt="" />
                            </button>
                          ))}
                        </div>
                      </>
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
                    {panel === null ? (
                      <p className="canva-panel-note">Escolha uma aba para editar a carta.</p>
                    ) : null}
                  </div>
                </nav>
              ) : null}
            </div>,
            document.body,
          )
        : null}

      {designSheet.mounted ? (
        <div className={cn("canva-picker sheet-pop", designSheet.shown && "is-in")} role="dialog" aria-label="Escolher o papel">
          <header className="canva-picker-bar">
            <div>
              <p className="canva-picker-kicker">Papel</p>
              <h2>Escolha o template</h2>
            </div>
            <button type="button" className="canva-picker-min" onClick={closePicker}>
              <Check size={18} />
              Pronto
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
  const menuRef = useRef<HTMLDivElement>(null);
  const current =
    EDITOR_FONT_GROUPS.flatMap((g) => g.fonts).find((f) => f.id === value)?.label ||
    value.split(",")[0].replace(/"/g, "");

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => {
      const target = e.target as Node;
      if (root.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
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
            const height = Math.min(352, window.innerHeight * 0.7);
            const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
            // Perto do rodapé (dock da tela cheia), abre para cima.
            const top = r.bottom + 6 + height > window.innerHeight - 8 ? Math.max(8, r.top - 6 - height) : r.bottom + 6;
            setMenu({ top, left });
          }
          setOpen((v) => !v);
        }}
      >
        {current}
      </button>
      {/* Portal no body: dentro da tela cheia (backdrop-filter) o menu fixo ficava fora do lugar. */}
      {menuSheet.mounted ? createPortal(
        <div
          ref={menuRef}
          className={cn("canva-font-menu sheet-pop", menuSheet.shown && "is-in")}
          role="listbox"
          style={{ top: menu.top, left: menu.left }}
        >
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
        </div>,
        document.body,
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

function SelectionActions({
  block,
  onRemove,
  onDuplicate,
  onLayer,
  onResetRotation,
}: {
  block: TextBlock;
  onRemove: () => void;
  onDuplicate: () => void;
  onLayer: (where: "front" | "back") => void;
  onResetRotation: () => void;
}) {
  return (
    <div className="canva-sel-actions" role="group" aria-label="Elemento selecionado">
      <button type="button" className="canva-icon-btn" title="Duplicar" aria-label="Duplicar" onClick={onDuplicate}>
        <Copy size={14} />
      </button>
      <button
        type="button"
        className="canva-icon-btn"
        title="Trazer para frente"
        aria-label="Trazer para frente"
        onClick={() => onLayer("front")}
      >
        <BringToFront size={14} />
      </button>
      <button
        type="button"
        className="canva-icon-btn"
        title="Enviar para trás"
        aria-label="Enviar para trás"
        onClick={() => onLayer("back")}
      >
        <SendToBack size={14} />
      </button>
      {block.rotate ? (
        <button
          type="button"
          className="canva-icon-btn"
          title="Desfazer giro"
          aria-label="Desfazer giro"
          onClick={onResetRotation}
        >
          <RotateCcw size={14} />
        </button>
      ) : null}
      <button type="button" className="canva-icon-btn" title="Apagar" aria-label="Apagar" onClick={onRemove}>
        <Trash2 size={14} />
      </button>
    </div>
  );
}

const RESIZE_HANDLES: ResizeHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

type GestureKind = "move" | "rotate" | ResizeHandle;

function CanvasItem({
  block,
  color,
  font,
  active,
  editing,
  others,
  snap,
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
  snap: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onChange: (partial: Partial<TextBlock>, record?: boolean) => void;
  onGuides: (guides: Guide[]) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  /** Posição "ao vivo" durante o arraste: só vira histórico/rascunho ao soltar. */
  const [live, setLive] = useState<Partial<TextBlock> | null>(null);
  const liveRef = useRef<Partial<TextBlock> | null>(null);
  const stopGesture = useRef<(() => void) | null>(null);
  const typed = useRef(false);
  const isSticker = block.kind === "sticker" || Boolean(block.src && !block.text && block.kind !== "text");
  const shown = live ? { ...block, ...live } : block;

  useEffect(() => () => stopGesture.current?.(), []);

  function begin(kind: GestureKind, e: React.PointerEvent) {
    if (!e.isPrimary || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.stopPropagation();
    e.preventDefault();
    const el = box.current;
    const page = el?.parentElement;
    if (!el || !page) return;
    const pw = page.clientWidth;
    const ph = page.clientHeight;
    if (!pw || !ph) return;
    stopGesture.current?.();
    const wasActive = active;
    onSelect();
    const pointerId = e.pointerId;
    const startX = e.clientX;
    const startY = e.clientY;
    // Tamanho real na tela (o texto pode ter crescido além do mínimo salvo).
    const start: BlockBox = {
      x: block.x,
      y: block.y,
      w: (el.offsetWidth / pw) * 100,
      h: (el.offsetHeight / ph) * 100,
      rotate: block.rotate || 0,
    };
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let moved = false;
    let frame = 0;
    let pending: PointerEvent | null = null;

    const apply = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved && Math.hypot(dx, dy) < 3) return;
      moved = true;
      let next: Partial<TextBlock>;
      if (kind === "move") {
        const nx = start.x + (dx / pw) * 100;
        const ny = start.y + (dy / ph) * 100;
        if (snap && !ev.altKey) {
          const snapped = snapBlock({ ...block, w: start.w, h: start.h }, others, nx, ny);
          onGuides(snapped.guides);
          next = { x: snapped.x, y: snapped.y };
        } else {
          next = clampBlockPosition({ w: start.w, h: start.h }, nx, ny);
        }
      } else if (kind === "rotate") {
        next = {
          rotate: rotationFromPointer(cx, cy, ev.clientX, ev.clientY, {
            step: ev.shiftKey ? 15 : undefined,
            snap,
          }),
        };
      } else {
        // Adesivo/foto mantém a proporção nos cantos (Shift solta); texto é livre (Shift trava).
        const keepRatio = isSticker ? !ev.shiftKey : ev.shiftKey;
        const r = resizeBox(start, kind, dx, dy, pw, ph, { keepRatio, minPct: isSticker ? 4 : 8 });
        next = { x: r.x, y: r.y, w: r.w, h: r.h };
      }
      liveRef.current = next;
      setLive(next);
    };

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      pending = ev;
      if (!frame) {
        frame = window.requestAnimationFrame(() => {
          frame = 0;
          if (pending) apply(pending);
        });
      }
    };

    const detach = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      stopGesture.current = null;
    };

    function finish(ev: PointerEvent) {
      if (ev.pointerId !== pointerId) return;
      if (frame && pending) apply(pending);
      detach();
      onGuides([]);
      const result = liveRef.current;
      liveRef.current = null;
      setLive(null);
      if (moved && result) {
        onChange(result);
        return;
      }
      // Toque sem arrastar: no celular já entra no modo digitar (um toque só); no mouse,
      // o primeiro clique seleciona e o segundo (ou dois cliques) escreve.
      if (!moved && kind === "move" && !isSticker && ev.type === "pointerup" && (wasActive || ev.pointerType !== "mouse")) {
        // Foca ainda dentro do gesto: o iPhone só abre o teclado assim.
        const t = textRef.current;
        if (t) {
          t.contentEditable = "true";
          try {
            t.focus({ preventScroll: true });
          } catch {
            /* foco volta no efeito abaixo */
          }
        }
        onEdit();
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    stopGesture.current = () => {
      detach();
      liveRef.current = null;
    };
  }

  useEffect(() => {
    if (editing && textRef.current) {
      typed.current = false;
      textRef.current.innerText = block.text || "";
      textRef.current.focus();
      // Cursor no fim do texto.
      const sel = window.getSelection();
      if (sel) {
        const range = document.createRange();
        range.selectNodeContents(textRef.current);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }, [editing]);

  return (
    <div
      ref={box}
      className={cn(
        "canva-box",
        active && "is-active",
        editing && "is-editing",
        isSticker ? "is-sticker" : "is-text",
        live && "is-dragging",
      )}
      style={{
        left: `${shown.x}%`,
        top: `${shown.y}%`,
        width: `${shown.w}%`,
        // Texto cresce com o conteúdo (h é o mínimo); adesivo tem caixa fixa.
        ...(isSticker ? { height: `${shown.h}%` } : { minHeight: `${shown.h}%` }),
        transform: shown.rotate ? `rotate(${shown.rotate}deg)` : undefined,
      }}
      onPointerDown={(e) => {
        if (editing) {
          // Em modo digitar, o clique no bloco não inicia arraste nem tira a seleção.
          e.stopPropagation();
          return;
        }
        begin("move", e);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onEdit();
      }}
    >
      {isSticker ? (
        <img
          src={block.src}
          alt=""
          className="canva-box-sticker"
          draggable={false}
          style={block.flipX ? { transform: "scaleX(-1)" } : undefined}
        />
      ) : (
        <div
          ref={textRef}
          className="canva-box-text"
          data-placeholder="Escreva aqui…"
          contentEditable={editing}
          suppressContentEditableWarning
          onPointerDown={(e) => {
            if (editing) e.stopPropagation();
          }}
          onInput={(e) => {
            // Um passo de desfazer por sessão de digitação, não um por tecla.
            onChange({ text: (e.currentTarget as HTMLDivElement).innerText }, !typed.current);
            typed.current = true;
          }}
          style={{
            fontFamily: font,
            fontSize: blockFontSize(block.size),
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
      {/* Puxadores também enquanto digita: no celular um toque já escreve, e dá para
          redimensionar ou girar sem sair do texto. */}
      {active ? (
        <>
          {RESIZE_HANDLES.map((h) => (
            <i
              key={h}
              className={cn("canva-handle", `is-${h}`)}
              aria-hidden="true"
              onPointerDown={(e) => begin(h, e)}
            />
          ))}
          <i className="canva-rotate" aria-hidden="true" title="Girar" onPointerDown={(e) => begin("rotate", e)} />
        </>
      ) : null}
    </div>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
