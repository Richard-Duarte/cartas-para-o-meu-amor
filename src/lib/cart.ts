import { emptyAddress, type Address } from "./address";
import { getDesign, type DesignId } from "./designs";
import { newPage, type LetterPage } from "./pages";
import { couponCut, roundBrl, SECOND_SEND_RULE } from "./coupon-rules";
import { getAnonymousFee, getScheduleFee } from "./delivery";
import { getMessenger, messengerPhoto, type Geo, type MessengerId } from "./messengers";

export type CartLine = {
  id: string;
  kind: "paper" | "messenger" | "discount" | "extra";
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
  anonymous?: boolean;
  recipientPhone?: string;
  recipientEmail?: string;
  senderPhone?: string;
  scheduled?: boolean;
  arriveOn?: string;
  /** Resposta: id da carta respondida e o que o servidor deixou mostrar do outro lado. */
  replyTo?: ReplyContext;
};

export type ReplyContext = {
  letterId: string;
  /** Nome para mostrar ("Alguém especial" quando a carta era anônima). */
  toLabel: string;
  /** Cidade de destino, no máximo. Vazio quando não há endereço. */
  toCity: string;
  /** A outra pessoa tem endereço (carta não anônima com endereço). */
  hasAddress: boolean;
  /** A carta original era anônima: a resposta é sempre anônima (sem endereço, 2h). */
  anonymous?: boolean;
  /** Origem da resposta com nome = destino da carta original (o endereço de quem responde). */
  fromAddress?: Address;
  fromGeo?: Geo;
  /** Ponto aproximado (nível cidade) só para estimar a viagem. */
  approxGeo?: Geo;
};

/** Sem endereço: só a carta anônima (inclui toda resposta a carta anônima). */
export function draftAddressless(d: Pick<LetterDraft, "anonymous" | "replyTo">) {
  // Anônima ⇔ sem endereço. Não existe "sem endereço com nome".
  return Boolean(d.anonymous || d.replyTo?.anonymous);
}

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
    anonymous: false,
    recipientPhone: "",
    recipientEmail: "",
    senderPhone: "",
    scheduled: false,
    arriveOn: "",
  };
}

export function buildCart(
  designId: DesignId,
  messengerId: MessengerId,
  opts?: {
    percent?: number;
    amountBrl?: number;
    /** Código e regra do cupom aplicado (só para o texto da linha). */
    couponCode?: string;
    couponRule?: string | null;
    creditBrl?: number;
    anonymous?: boolean;
    scheduled?: boolean;
  },
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
  if (opts?.anonymous) {
    lines.push({
      id: "anonymous",
      kind: "extra",
      title: "Envio anônimo",
      detail: "O nome não aparece",
      priceBrl: getAnonymousFee(),
      image: "/envelope/seal.png",
    });
  }
  if (opts?.scheduled) {
    lines.push({
      id: "scheduled",
      kind: "extra",
      title: "Dia escolhido",
      detail: "Chegada na data marcada",
      priceBrl: getScheduleFee(),
      image: "/envelope/seal.png",
    });
  }
  let total = roundBrl(lines.reduce((sum, line) => sum + line.priceBrl, 0));
  const cut = couponCut(total, { percent: opts?.percent, amountBrl: opts?.amountBrl });
  const couponTitle = opts?.couponCode ? `Cupom ${opts.couponCode}` : "Cupom";
  const secondSend = opts?.couponRule === SECOND_SEND_RULE;
  if (opts?.percent) {
    lines.push({
      id: "coupon",
      kind: "discount",
      title: couponTitle,
      detail: secondSend ? "2º envio grátis" : `${opts.percent}%`,
      priceBrl: -cut.percentCut,
      image: paper.src,
    });
  }
  if (opts?.amountBrl) {
    lines.push({
      id: "coupon-fixed",
      kind: "discount",
      title: couponTitle,
      detail: formatBrl(opts.amountBrl),
      priceBrl: -cut.amountCut,
      image: paper.src,
    });
  }
  total = cut.total;
  if (opts?.creditBrl) {
    const cut = roundBrl(Math.min(total, opts.creditBrl));
    if (cut) {
      lines.push({
        id: "credit",
        kind: "discount",
        title: "Crédito de afiliado",
        detail: "Desbloqueio e desconto",
        priceBrl: -cut,
        image: paper.src,
      });
      total = roundBrl(total - cut);
    }
  }
  return { lines, total: Math.max(0, roundBrl(total)), paper, messenger };
}

export function readDraft(): LetterDraft | null {
  if (typeof window === "undefined") return null;
  try {
    // Aba atual primeiro; cópia no localStorage segura o rascunho se o navegador descartar a aba.
    const raw = sessionStorage.getItem(DRAFT_KEY) ?? localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as LetterDraft) : null;
  } catch {
    return null;
  }
}

export function writeDraft(draft: LetterDraft) {
  const raw = JSON.stringify(draft);
  sessionStorage.setItem(DRAFT_KEY, raw);
  try {
    localStorage.setItem(DRAFT_KEY, raw);
  } catch {
    /* sem espaço: a aba ainda tem o rascunho */
  }
}

export function clearDraft() {
  sessionStorage.removeItem(DRAFT_KEY);
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function pixDemoCode(total: number) {
  const cents = Math.round(total * 100)
    .toString()
    .padStart(4, "0");
  return `CARTA${cents}AMORDEMO`;
}
