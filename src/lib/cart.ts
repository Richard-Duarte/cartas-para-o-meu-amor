import { emptyAddress, type Address } from "./address";
import { getDesign, type DesignId } from "./designs";
import { newPage, type LetterPage } from "./pages";
import { getMessenger, messengerPhoto, type Geo, type MessengerId } from "./messengers";

export type CartLine = {
  id: string;
  kind: "paper" | "messenger" | "discount";
  title: string;
  detail: string;
  priceBrl: number;
  image: string;
};

export type LetterDraft = {
  fromName: string;
  toName: string;
  pages: LetterPage[];
  designId: DesignId;
  messengerId: MessengerId;
  fromAddress: Address;
  toAddress: Address;
  fromGeo?: Geo;
  toGeo?: Geo;
  couponCode?: string;
  affiliateCode?: string;
};

const DRAFT_KEY = "cartas-para-o-meu-amor:draft:v2";

export function formatBrl(n: number) {
  if (n <= 0) return "Grátis";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatMoney(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function emptyDraft(): LetterDraft {
  return {
    fromName: "Você",
    toName: "Meu amor",
    pages: [newPage()],
    designId: "classico",
    messengerId: "pigeon",
    fromAddress: emptyAddress(),
    toAddress: emptyAddress(),
  };
}

export function buildCart(
  designId: DesignId,
  messengerId: MessengerId,
  opts?: { percent?: number; amountBrl?: number; creditBrl?: number },
) {
  const paper = getDesign(designId);
  const messenger = getMessenger(messengerId);
  const lines: CartLine[] = [
    {
      id: `paper:${paper.id}`,
      kind: "paper",
      title: `Papel ${paper.name}`,
      detail: paper.paid ? paper.tagline : "Cortesia — papel livre",
      priceBrl: paper.paid ? paper.priceBrl : 0,
      image: paper.src,
    },
    {
      id: `messenger:${messenger.id}`,
      kind: "messenger",
      title: messenger.name,
      detail: messenger.tagline,
      priceBrl: messenger.basePriceBrl,
      image: messengerPhoto(messenger.id),
    },
  ];
  let total = lines.reduce((sum, line) => sum + line.priceBrl, 0);
  if (opts?.percent) {
    const cut = Math.round(total * (opts.percent / 100));
    lines.push({
      id: "coupon",
      kind: "discount",
      title: "Cupom",
      detail: `${opts.percent}%`,
      priceBrl: -cut,
      image: paper.src,
    });
    total -= cut;
  }
  if (opts?.amountBrl) {
    const cut = Math.min(total, opts.amountBrl);
    lines.push({
      id: "coupon-fixed",
      kind: "discount",
      title: "Cupom",
      detail: formatBrl(opts.amountBrl),
      priceBrl: -cut,
      image: paper.src,
    });
    total -= cut;
  }
  if (opts?.creditBrl) {
    const cut = Math.min(total, opts.creditBrl);
    if (cut) {
      lines.push({
        id: "credit",
        kind: "discount",
        title: "Crédito de afiliado",
        detail: "Desbloqueio e desconto",
        priceBrl: -cut,
        image: paper.src,
      });
      total -= cut;
    }
  }
  return { lines, total: Math.max(0, total), paper, messenger };
}

export function readDraft(): LetterDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as LetterDraft) : null;
  } catch {
    return null;
  }
}

export function writeDraft(draft: LetterDraft) {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function clearDraft() {
  sessionStorage.removeItem(DRAFT_KEY);
}

export function pixDemoCode(total: number) {
  const cents = Math.round(total * 100)
    .toString()
    .padStart(4, "0");
  return `CARTA${cents}AMORDEMO`;
}
