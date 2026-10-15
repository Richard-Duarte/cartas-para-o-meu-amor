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
};

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
  return newBlock({ y: 12, size: 36, weight: 700, h: 12, text: "", fontFamily });
}

export function subheadingBlock(fontFamily?: string): TextBlock {
  return newBlock({ y: 28, size: 24, weight: 600, h: 12, text: "", fontFamily });
}

export function bodyBlock(fontFamily?: string): TextBlock {
  return newBlock({ y: 42, size: 18, weight: 400, h: 28, text: "", fontFamily });
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
