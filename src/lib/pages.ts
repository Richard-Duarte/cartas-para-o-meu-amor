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

export function snapBlock(
  block: TextBlock,
  others: TextBlock[],
  x: number,
  y: number,
): { x: number; y: number; guides: Guide[] } {
  const SNAP = 1.15;
  const guides: Guide[] = [];
  let nx = x;
  let ny = y;
  const midX = nx + block.w / 2;
  const midY = ny + block.h / 2;
  const right = nx + block.w;
  const bottom = ny + block.h;

  function v(pos: number, apply: () => void) {
    if (Math.abs(midX - pos) < SNAP || Math.abs(nx - pos) < SNAP || Math.abs(right - pos) < SNAP) {
      apply();
      guides.push({ axis: "v", pos });
    }
  }
  function h(pos: number, apply: () => void) {
    if (Math.abs(midY - pos) < SNAP || Math.abs(ny - pos) < SNAP || Math.abs(bottom - pos) < SNAP) {
      apply();
      guides.push({ axis: "h", pos });
    }
  }

  v(50, () => {
    nx = 50 - block.w / 2;
  });
  h(50, () => {
    ny = 50 - block.h / 2;
  });
  v(4, () => {
    nx = 4;
  });
  v(96, () => {
    nx = 96 - block.w;
  });
  h(4, () => {
    ny = 4;
  });
  h(96, () => {
    ny = 96 - block.h;
  });

  for (const o of others) {
    const oc = o.x + o.w / 2;
    const om = o.y + o.h / 2;
    v(o.x, () => {
      nx = o.x;
    });
    v(o.x + o.w, () => {
      nx = o.x + o.w - block.w;
    });
    v(oc, () => {
      nx = oc - block.w / 2;
    });
    h(o.y, () => {
      ny = o.y;
    });
    h(o.y + o.h, () => {
      ny = o.y + o.h - block.h;
    });
    h(om, () => {
      ny = om - block.h / 2;
    });
  }

  return {
    x: Math.min(92, Math.max(0, nx)),
    y: Math.min(92, Math.max(0, ny)),
    guides,
  };
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
