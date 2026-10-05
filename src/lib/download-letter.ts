import { toPng } from "html-to-image";

function slug(value: string) {
  const s = value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return s || "carta";
}

function saveDataUrl(dataUrl: string, name: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function downloadLetterPng(root: HTMLElement, toName: string) {
  await document.fonts.ready;
  await Promise.all(
    [...root.querySelectorAll("img")].map((img) =>
      img.decode ? img.decode().catch(() => undefined) : Promise.resolve(),
    ),
  );
  const pages = [...root.querySelectorAll<HTMLElement>("[data-letter-page]")];
  const nodes = pages.length ? pages : [root];
  const pngs = await Promise.all(
    nodes.map((node) =>
      toPng(node, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#fbf6f0",
      }),
    ),
  );
  const filename = `carta-para-${slug(toName)}`;
  if (pngs.length === 1) {
    saveDataUrl(pngs[0], `${filename}.png`);
    return;
  }

  const images = await Promise.all(
    pngs.map(
      (src) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        }),
    ),
  );
  const gap = 28;
  const width = Math.max(...images.map((i) => i.width));
  const height = images.reduce((sum, i) => sum + i.height, 0) + gap * (images.length - 1);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível desenhar a carta");
  ctx.fillStyle = "#f6ede4";
  ctx.fillRect(0, 0, width, height);
  let y = 0;
  for (const img of images) {
    ctx.drawImage(img, (width - img.width) / 2, y);
    y += img.height + gap;
  }
  saveDataUrl(canvas.toDataURL("image/png"), `${filename}.png`);
}
