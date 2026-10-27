import { getDesign, type DesignId } from "@/lib/designs";
import { fitMaxWidth, PAGE_REF_WIDTH, type LetterPage, type TextBlock } from "@/lib/pages";

/**
 * Desenha a 1ª página da carta (papel + textos + adesivos) num canvas 3:4, para a folha
 * que sai do envelope ser a carta de verdade. Canvas 2D puro: rápido no iPhone e não
 * "suja" a textura WebGL (imagens de outro domínio só entram com CORS).
 */
export type SheetPainter = (canvas: HTMLCanvasElement) => Promise<boolean>;

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.decoding = "async";
    try {
      if (new URL(src, location.href).origin !== location.origin && !src.startsWith("data:")) {
        img.crossOrigin = "anonymous";
      }
    } catch {
      /* caminho relativo */
    }
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

function rasterSrc(src: string) {
  return src.replace(/\/blank-([a-z0-9-]+)\.svg$/i, "/$1.jpg").replace(/\.svg$/i, ".jpg");
}

function cover(g: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * s;
  const dh = img.naturalHeight * s;
  g.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function fontOf(b: TextBlock, px: number, fallback: string) {
  return `${b.italic ? "italic " : ""}${b.weight || 400} ${px}px ${b.fontFamily || fallback}`;
}

function wrap(g: CanvasRenderingContext2D, text: string, max: number) {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    const words = para.split(/(\s+)/);
    let line = "";
    for (const w of words) {
      const next = line + w;
      if (line && g.measureText(next).width > max) {
        out.push(line.trimEnd());
        line = w.trimStart();
        // palavra maior que a linha: quebra por letra
        while (g.measureText(line).width > max && line.length > 1) {
          let i = line.length - 1;
          while (i > 1 && g.measureText(line.slice(0, i)).width > max) i--;
          out.push(line.slice(0, i));
          line = line.slice(i);
        }
      } else line = next;
    }
    out.push(line);
  }
  return out;
}

export function hasPageContent(page?: LetterPage | null) {
  return Boolean(page?.blocks.some((b) => (b.kind === "sticker" ? Boolean(b.src) : b.text.trim())));
}

export function letterSheetPainter(designId: DesignId, page?: LetterPage | null): SheetPainter | undefined {
  if (!page || !hasPageContent(page)) return undefined;
  const design = getDesign(designId);
  const ink = design.ink === "light" ? "#fbf6f0" : "#1a1410";
  return async (canvas) => {
    const W = canvas.width;
    const H = canvas.height;
    const g = canvas.getContext("2d");
    if (!g) return false;
    // Fontes da carta antes de desenhar (senão sai em serif genérica).
    try {
      const fams = new Set(page.blocks.filter((b) => b.kind !== "sticker").map((b) => fontOf(b, 40, design.fontFamily)));
      await Promise.race([
        Promise.all([...fams].map((f) => document.fonts.load(f).catch(() => undefined))).then(() => document.fonts.ready),
        new Promise((r) => setTimeout(r, 2500)),
      ]);
    } catch {
      /* segue */
    }
    const [bg, ...stickers] = await Promise.all([
      loadImage(rasterSrc(design.src)).then((img) => img ?? loadImage(design.src)),
      ...page.blocks.map((b) => (b.kind === "sticker" && b.src ? loadImage(b.src) : Promise.resolve(null))),
    ]);
    g.save();
    g.fillStyle = "#fbf6f0";
    g.fillRect(0, 0, W, H);
    if (bg) cover(g, bg, W, H);
    if (design.ink === "light") {
      const grad = g.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "rgba(26,20,16,0.28)");
      grad.addColorStop(1, "rgba(26,20,16,0.62)");
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
    }
    // A área dos blocos é o "palco" 3:4 da carta; o papel cobre tudo.
    const pad = W * 0.04;
    const SW = W - pad * 2;
    const SH = SW * (4 / 3);
    const oy = (H - SH) / 2;
    const unit = SW / 100;
    page.blocks.forEach((b, i) => {
      const x = pad + b.x * unit;
      const y = oy + (b.y / 100) * SH;
      if (b.kind === "sticker") {
        const img = stickers[i];
        if (!img) return;
        const bw = Math.max(b.w, 1) * unit;
        const bh = (Math.max(b.h, 1) / 100) * SH;
        const s = Math.min(bw / img.naturalWidth, bh / img.naturalHeight);
        const dw = img.naturalWidth * s;
        const dh = img.naturalHeight * s;
        g.save();
        g.translate(x + bw / 2, y + bh / 2);
        g.rotate(((b.rotate || 0) * Math.PI) / 180);
        g.scale(b.flipX ? -1 : 1, 1);
        g.drawImage(img, -dw / 2, -dh / 2, dw, dh);
        g.restore();
        return;
      }
      if (!b.text.trim()) return;
      const px = ((Number.isFinite(b.size) && b.size > 0 ? b.size : 22) / PAGE_REF_WIDTH) * SW;
      g.font = fontOf(b, px, design.fontFamily);
      const ls = (b.letterSpacing || 0) * px;
      try {
        (g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${ls}px`;
      } catch {
        /* Safari antigo */
      }
      const padX = b.fit ? 0.35 * px : 0;
      const padY = b.fit ? 0.2 * px : 0;
      const maxW = (b.fit ? fitMaxWidth(b) : b.w) * unit - padX * 2;
      const lines = wrap(g, b.text, Math.max(maxW, px));
      const textW = b.fit ? Math.min(maxW, Math.max(...lines.map((l) => g.measureText(l).width))) : maxW;
      const lh = (b.lineHeight || 1.35) * px;
      const boxW = textW + padX * 2;
      const boxH = lines.length * lh + padY * 2;
      g.save();
      g.translate(x + boxW / 2, y + boxH / 2);
      g.rotate(((b.rotate || 0) * Math.PI) / 180);
      g.fillStyle = b.color || ink;
      g.textBaseline = "middle";
      const align = b.align === "justify" ? "left" : b.align || "left";
      g.textAlign = align;
      const left = -boxW / 2 + padX;
      const ax = align === "center" ? left + textW / 2 : align === "right" ? left + textW : left;
      lines.forEach((l, li) => {
        const ly = -boxH / 2 + padY + lh * li + lh / 2;
        g.fillText(l, ax, ly);
        if (b.underline) {
          const lw = g.measureText(l).width;
          const sx = align === "center" ? ax - lw / 2 : align === "right" ? ax - lw : ax;
          g.fillRect(sx, ly + px * 0.45, lw, Math.max(1, px * 0.06));
        }
      });
      g.restore();
    });
    g.restore();
    return true;
  };
}

/** Frente do envelope: "Para <nome>" em destaque e "De <nome>" menor. */
export function paintEnvelopeNames(canvas: HTMLCanvasElement, toName: string, fromName: string) {
  const g = canvas.getContext("2d");
  if (!g) return;
  const W = canvas.width;
  const H = canvas.height;
  g.clearRect(0, 0, W, H);
  g.textAlign = "center";
  g.textBaseline = "alphabetic";
  const fit = (text: string, font: (px: number) => string, start: number, max: number) => {
    let px = start;
    g.font = font(px);
    while (px > 12 && g.measureText(text).width > max) g.font = font(--px);
    return px;
  };
  const to = `Para: ${toName}`.slice(0, 40);
  g.fillStyle = "#7a2e40";
  const big = fit(to, (px) => `italic 600 ${px}px "Fraunces", "Cormorant Garamond", serif`, Math.round(H * 0.5), W * 0.94);
  g.fillText(to, W / 2, H * 0.52);
  if (fromName) {
    const from = `De: ${fromName}`.slice(0, 44);
    g.fillStyle = "rgba(90,62,50,0.85)";
    fit(from, (px) => `500 ${px}px "Fraunces", serif`, Math.round(big * 0.62), W * 0.9);
    g.fillText(from, W / 2, H * 0.9);
  }
}

/**
 * Resolve quando a tela assentou: rola o palco do envelope para a vista (abaixo do
 * cabeçalho), espera fontes, layout estável e o palco visível. Máx. ~4s.
 */
export function whenStageSettled(stage: HTMLElement | null): Promise<void> {
  if (!stage) return Promise.resolve();
  const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
  const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  const run = async () => {
    const header = document.querySelector<HTMLElement>(".site-header");
    const headerH = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
    const r = stage.getBoundingClientRect();
    const target = r.top + window.scrollY - headerH - 12;
    window.scrollTo({ top: Math.max(0, Math.min(target, window.scrollY + r.top)), behavior: "auto" });
    try {
      await Promise.race([document.fonts.ready, wait(2000)]);
    } catch {
      /* segue */
    }
    // layout estável: mesma posição/tamanho em quadros seguidos
    let prev = "";
    for (let i = 0; i < 30; i++) {
      await frame();
      const b = stage.getBoundingClientRect();
      const key = `${Math.round(b.top)}:${Math.round(b.height)}:${Math.round(b.width)}`;
      if (key === prev && b.height > 0) break;
      prev = key;
      await wait(40);
    }
    await new Promise<void>((resolve) => {
      if (typeof IntersectionObserver === "undefined") return resolve();
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.intersectionRatio >= 0.75)) {
            io.disconnect();
            resolve();
          }
        },
        { threshold: [0, 0.75, 1] },
      );
      io.observe(stage);
    });
  };
  return Promise.race([run(), wait(4000)]);
}
