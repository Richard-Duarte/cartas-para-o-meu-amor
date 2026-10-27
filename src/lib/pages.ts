export type TextAlign = "left" | "center" | "right" | "justify";
export type VAlign = "top" | "middle" | "bottom";
export type BlockKind = "text" | "sticker";

export type TextBlock = {
  id: string;
  kind: BlockKind;
  x: number;
  y: number;
  w: number;
  h: number;
  size: number;
  text: string;
  fontFamily?: string;
  weight: 400 | 600 | 700;
  italic: boolean;
  underline: boolean;
  align: TextAlign;
  valign: VAlign;
  color: string;
  lineHeight: number;
  letterSpacing: number;
  rotate: number;
  src?: string;
  flipX?: boolean;
  /** Texto que se ajusta ao conteúdo (largura até a margem, altura automática). */
  fit?: boolean;
};

/** Largura máxima (%) de um texto ajustado: até a margem direita, espelhando a esquerda (máx. 10%). */
export function fitMaxWidth(block: Pick<TextBlock, "x">) {
  const x = Math.max(0, block.x);
  return Math.max(20, 100 - x - Math.min(x, 10));
}

export type LetterPage = {
  id: string;
  blocks: TextBlock[];
};

export function newBlock(partial: Partial<TextBlock> = {}): TextBlock {
  return {
    id: crypto.randomUUID().slice(0, 8),
    kind: "text",
    x: 10,
    y: 18,
    w: 80,
    h: 16,
    size: 22,
    text: "",
    weight: 400,
    italic: false,
    underline: false,
    align: "left",
    valign: "top",
    color: "",
    lineHeight: 1.35,
    letterSpacing: 0,
    rotate: 0,
    ...partial,
  };
}

export function headingBlock(fontFamily?: string): TextBlock {
  return newBlock({ y: 12, size: 36, weight: 700, h: 12, text: "", fontFamily, fit: true });
}

export function subheadingBlock(fontFamily?: string): TextBlock {
  return newBlock({ y: 28, size: 24, weight: 600, h: 12, text: "", fontFamily, fit: true });
}

export function bodyBlock(fontFamily?: string): TextBlock {
  return newBlock({ y: 42, size: 18, weight: 400, h: 28, text: "", fontFamily, fit: true });
}

export function stickerBlock(src: string): TextBlock {
  return newBlock({
    kind: "sticker",
    src,
    x: 36,
    y: 36,
    w: 28,
    h: 22,
    text: "",
    size: 16,
  });
}

export function newPage(): LetterPage {
  return { id: crypto.randomUUID().slice(0, 8), blocks: [bodyBlock()] };
}

export function pagesPlainText(pages: LetterPage[]) {
  return pages
    .flatMap((p) => p.blocks.filter((b) => b.kind !== "sticker").map((b) => b.text.trim()))
    .filter(Boolean)
    .join("\n\n");
}

export type FontGroup = { label: string; fonts: { id: string; label: string }[] };

export const EDITOR_FONT_GROUPS: FontGroup[] = [
  {
    label: "Serif",
    fonts: [
      { id: "Fraunces, serif", label: "Fraunces" },
      { id: "Playfair Display, serif", label: "Playfair Display" },
      { id: "Cormorant Garamond, serif", label: "Cormorant Garamond" },
      { id: "EB Garamond, serif", label: "EB Garamond" },
      { id: "Libre Baskerville, serif", label: "Libre Baskerville" },
      { id: "Lora, serif", label: "Lora" },
      { id: "Spectral, serif", label: "Spectral" },
      { id: "Cinzel, serif", label: "Cinzel" },
      { id: "Yeseva One, serif", label: "Yeseva One" },
      { id: "Abril Fatface, serif", label: "Abril Fatface" },
    ],
  },
  {
    label: "Manuscrita",
    fonts: [
      { id: "Caveat, cursive", label: "Caveat" },
      { id: "Great Vibes, cursive", label: "Great Vibes" },
      { id: "Dancing Script, cursive", label: "Dancing Script" },
      { id: "Pacifico, cursive", label: "Pacifico" },
      { id: "Sacramento, cursive", label: "Sacramento" },
      { id: "Allura, cursive", label: "Allura" },
      { id: "Tangerine, cursive", label: "Tangerine" },
      { id: "Alex Brush, cursive", label: "Alex Brush" },
      { id: "Parisienne, cursive", label: "Parisienne" },
      { id: "Satisfy, cursive", label: "Satisfy" },
      { id: "Homemade Apple, cursive", label: "Homemade Apple" },
      { id: "Pinyon Script, cursive", label: "Pinyon Script" },
      { id: "Marck Script, cursive", label: "Marck Script" },
      { id: "Cookie, cursive", label: "Cookie" },
      { id: "Indie Flower, cursive", label: "Indie Flower" },
    ],
  },
  {
    label: "Sans",
    fonts: [
      { id: "Figtree, sans-serif", label: "Figtree" },
      { id: "Nunito, sans-serif", label: "Nunito" },
      { id: "Quicksand, sans-serif", label: "Quicksand" },
      { id: "Comfortaa, sans-serif", label: "Comfortaa" },
      { id: "Outfit, sans-serif", label: "Outfit" },
      { id: "DM Sans, sans-serif", label: "DM Sans" },
      { id: "Karla, sans-serif", label: "Karla" },
    ],
  },
];

export const EDITOR_FONTS = EDITOR_FONT_GROUPS.flatMap((g) => g.fonts);

export type Guide = { axis: "v" | "h"; pos: number };

/** Magnetic threshold in page % — near enough shows a guide and soft-snaps. */
export const SNAP_THRESHOLD = 1.15;

/**
 * Keep at least a sliver of the block on the page so it stays selectable,
 * but do not force a padded 0–92 box (that blocked free placement).
 */
export function clampBlockPosition(block: Pick<TextBlock, "w" | "h">, x: number, y: number) {
  const minVisible = 2;
  return {
    x: Math.min(100 - minVisible, Math.max(minVisible - block.w, x)),
    y: Math.min(100 - minVisible, Math.max(minVisible - block.h, y)),
  };
}

/**
 * Soft-snap while dragging: alignment guides appear near page center, margins
 * and other blocks, but the block can sit anywhere on (or slightly past) the page.
 */
export function snapBlock(
  block: TextBlock,
  others: TextBlock[],
  x: number,
  y: number,
  threshold = SNAP_THRESHOLD,
): { x: number; y: number; guides: Guide[] } {
  const guides: Guide[] = [];
  let nx = x;
  let ny = y;

  function tryV(pos: number, snappedX: number) {
    const midX = nx + block.w / 2;
    const right = nx + block.w;
    if (Math.abs(midX - pos) < threshold || Math.abs(nx - pos) < threshold || Math.abs(right - pos) < threshold) {
      nx = snappedX;
      if (!guides.some((g) => g.axis === "v" && g.pos === pos)) guides.push({ axis: "v", pos });
    }
  }
  function tryH(pos: number, snappedY: number) {
    const midY = ny + block.h / 2;
    const bottom = ny + block.h;
    if (Math.abs(midY - pos) < threshold || Math.abs(ny - pos) < threshold || Math.abs(bottom - pos) < threshold) {
      ny = snappedY;
      if (!guides.some((g) => g.axis === "h" && g.pos === pos)) guides.push({ axis: "h", pos });
    }
  }

  tryV(50, 50 - block.w / 2);
  tryH(50, 50 - block.h / 2);
  tryV(4, 4);
  tryV(96, 96 - block.w);
  tryH(4, 4);
  tryH(96, 96 - block.h);

  for (const o of others) {
    const oc = o.x + o.w / 2;
    const om = o.y + o.h / 2;
    tryV(o.x, o.x);
    tryV(o.x + o.w, o.x + o.w - block.w);
    tryV(oc, oc - block.w / 2);
    tryH(o.y, o.y);
    tryH(o.y + o.h, o.y + o.h - block.h);
    tryH(om, om - block.h / 2);
  }

  const clamped = clampBlockPosition(block, nx, ny);
  return { x: clamped.x, y: clamped.y, guides };
}

const CANVAS_KEEP_SELECTION =
  ".canva-box, .canva-page, .canva-add-page, .canva-handle, .canva-sheet-num, button, a, input, select, textarea, label, [contenteditable='true']";

/** Empty-canvas clicks clear selection; chrome / blocks / fields keep it. */
export function canvasBackgroundClick(
  target: EventTarget | { closest: (selector: string) => unknown } | null,
): boolean {
  if (!target || typeof (target as { closest?: unknown }).closest !== "function") return false;
  return !(target as { closest: (selector: string) => unknown }).closest(CANVAS_KEEP_SELECTION);
}

export function alignOnPage(
  block: TextBlock,
  where: "left" | "center" | "right" | "top" | "middle" | "bottom",
): Partial<TextBlock> {
  const pad = 4;
  if (where === "left") return { x: pad };
  if (where === "center") return { x: (100 - block.w) / 2 };
  if (where === "right") return { x: 100 - pad - block.w };
  if (where === "top") return { y: pad };
  if (where === "middle") return { y: (100 - block.h) / 2 };
  return { y: 100 - pad - block.h };
}

/** Largura de referência (px) do papel: o `size` dos textos é medido nela. */
export const PAGE_REF_WIDTH = 420;

/**
 * Tamanho da fonte relativo à largura do papel (unidade `cqw`), para a carta
 * ficar igual no editor, no zoom, na tela cheia, no celular e na carta entregue.
 * Cartas antigas guardam `size` em px de um papel de ~420px, então continuam
 * com o mesmo tamanho no desktop e só escalam junto com o papel.
 */
export function blockFontSize(size: number) {
  const n = Number.isFinite(size) && size > 0 ? size : 22;
  return `${Math.round((n / PAGE_REF_WIDTH) * 100 * 1000) / 1000}cqw`;
}

export type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export type BlockBox = { x: number; y: number; w: number; h: number; rotate: number };

/**
 * Redimensiona pelo puxador escolhido, mesmo com o bloco girado: o lado (ou
 * canto) oposto fica parado. Deltas em px da tela; resultado em % do papel.
 */
export function resizeBox(
  start: BlockBox,
  handle: ResizeHandle,
  dxPx: number,
  dyPx: number,
  pageW: number,
  pageH: number,
  opts: { keepRatio?: boolean; minPct?: number } = {},
): BlockBox {
  if (pageW <= 0 || pageH <= 0) return start;
  const rad = ((start.rotate || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  // Delta do ponteiro no eixo do próprio bloco.
  const lx = dxPx * cos + dyPx * sin;
  const ly = -dxPx * sin + dyPx * cos;
  const ex = handle.includes("e") ? 1 : handle.includes("w") ? -1 : 0;
  const ey = handle.includes("s") ? 1 : handle.includes("n") ? -1 : 0;
  const minPx = Math.max(6, (pageW * (opts.minPct ?? 4)) / 100);
  const w0 = (start.w / 100) * pageW;
  const h0 = (start.h / 100) * pageH;
  let w1 = Math.max(minPx, w0 + ex * lx);
  let h1 = Math.max(minPx, h0 + ey * ly);
  if (opts.keepRatio && ex !== 0 && ey !== 0 && w0 > 0 && h0 > 0) {
    const scale = Math.max(w1 / w0, h1 / h0, minPx / Math.min(w0, h0));
    w1 = w0 * scale;
    h1 = h0 * scale;
  }
  const dw = w1 - w0;
  const dh = h1 - h0;
  // O centro anda metade do crescimento, para o lado do puxador.
  const sx = (ex * dw) / 2;
  const sy = (ey * dh) / 2;
  const cx = (start.x / 100) * pageW + w0 / 2 + sx * cos - sy * sin;
  const cy = (start.y / 100) * pageH + h0 / 2 + sx * sin + sy * cos;
  return {
    x: ((cx - w1 / 2) / pageW) * 100,
    y: ((cy - h1 / 2) / pageH) * 100,
    w: (w1 / pageW) * 100,
    h: (h1 / pageH) * 100,
    rotate: start.rotate || 0,
  };
}

/**
 * Ângulo do bloco a partir do ponteiro (o puxador de giro fica em cima).
 * `step` trava em degraus (Shift = 15°); `snap` só puxa de leve para 0/45/90…
 */
export function rotationFromPointer(
  cx: number,
  cy: number,
  px: number,
  py: number,
  opts: { step?: number; snap?: boolean } = {},
) {
  let deg = (Math.atan2(py - cy, px - cx) * 180) / Math.PI + 90;
  if (opts.step && opts.step > 0) deg = Math.round(deg / opts.step) * opts.step;
  else if (opts.snap) {
    const near = Math.round(deg / 45) * 45;
    if (Math.abs(deg - near) < 3) deg = near;
  }
  deg = ((((deg + 180) % 360) + 360) % 360) - 180;
  return Math.round(deg * 10) / 10;
}

/** Ordem no array = camada na página (o último fica por cima). */
export function reorderBlock(blocks: TextBlock[], id: string, where: "front" | "back"): TextBlock[] {
  const target = blocks.find((b) => b.id === id);
  if (!target) return blocks;
  const rest = blocks.filter((b) => b.id !== id);
  return where === "front" ? [...rest, target] : [target, ...rest];
}

export function duplicateBlock(block: TextBlock): TextBlock {
  const offset = 4;
  return {
    ...block,
    id: crypto.randomUUID().slice(0, 8),
    x: Math.min(100 - 2, block.x + offset),
    y: Math.min(100 - 2, block.y + offset),
  };
}
