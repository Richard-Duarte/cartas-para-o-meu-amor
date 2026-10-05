import { type Address } from "./address";
import { type DesignId } from "./designs";
import {
  demoDurationMs,
  estimateDelivery,
  getCity,
  getMessenger,
  type Geo,
  type MessengerId,
} from "./messengers";
import { pagesPlainText, type LetterPage } from "./pages";

export type LetterKind = "text" | "drawing";

export type Letter = {
  id: string;
  fromName: string;
  toName: string;
  body: string;
  kind?: LetterKind;
  drawingDataUrl?: string;
  designId?: DesignId;
  messengerId: MessengerId;
  fromCityId: string;
  toCityId: string;
  pages?: LetterPage[];
  fromAddress?: Address;
  toAddress?: Address;
  fromGeo?: Geo;
  toGeo?: Geo;
  paidBrl?: number;
  paidMethod?: string;
  couponCode?: string;
  affiliateCode?: string;
  startedAt: number;
  demoDurationMs: number;
  senderUserId?: string;
  recipientUserId?: string | null;
};

export type LetterRecord = {
  id: string;
  user_id: string;
  recipient_user_id: string | null;
  from_name: string;
  to_name: string;
  pages_json: string;
  template_id: string;
  messenger_id: string;
  from_address_json: string;
  to_address_json: string;
  from_geo_json: string;
  to_geo_json: string;
  paid_brl: number;
  coupon_code: string | null;
  affiliate_code: string | null;
  started_at: string;
  demo_duration_ms: number;
};

const KEY = "cartas-para-o-meu-amor:letters:v1";

function readAll(): Letter[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Letter[]) : [];
  } catch {
    return [];
  }
}

function writeAll(letters: Letter[]) {
  localStorage.setItem(KEY, JSON.stringify(letters));
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function letterFromRecord(row: LetterRecord): Letter {
  const pages = parseJson<LetterPage[]>(row.pages_json, []);
  return {
    id: row.id,
    fromName: row.from_name,
    toName: row.to_name,
    body: pagesPlainText(pages) || "…",
    pages,
    designId: (row.template_id as DesignId) || "classico",
    messengerId: row.messenger_id,
    fromCityId: "sp",
    toCityId: "rj",
    fromAddress: parseJson(row.from_address_json, undefined),
    toAddress: parseJson(row.to_address_json, undefined),
    fromGeo: parseJson(row.from_geo_json, undefined),
    toGeo: parseJson(row.to_geo_json, undefined),
    paidBrl: row.paid_brl,
    couponCode: row.coupon_code ?? undefined,
    affiliateCode: row.affiliate_code ?? undefined,
    startedAt: new Date(row.started_at).getTime() || Date.now(),
    demoDurationMs: row.demo_duration_ms || 20000,
    senderUserId: row.user_id,
    recipientUserId: row.recipient_user_id,
  };
}

export function saveLetter(input: Omit<Letter, "id" | "startedAt" | "demoDurationMs"> & { id?: string }) {
  const messenger = getMessenger(input.messengerId);
  const letter: Letter = {
    ...input,
    id: input.id ?? crypto.randomUUID().slice(0, 8),
    startedAt: Date.now(),
    demoDurationMs: demoDurationMs(messenger.speedKmh),
  };
  rememberLetter(letter);
  return letter;
}

export function rememberLetter(letter: Letter) {
  writeAll([letter, ...readAll().filter((l) => l.id !== letter.id)].slice(0, 40));
  return letter;
}

export function getLetter(id: string) {
  return readAll().find((l) => l.id === id);
}

export function letterProgress(letter: Letter, now = Date.now()) {
  const from = letter.fromGeo ?? getCity(letter.fromCityId).geo;
  const to = letter.toGeo ?? getCity(letter.toCityId).geo;
  const real = estimateDelivery({
    messengerId: letter.messengerId,
    from,
    to,
  });
  const progress = Math.min(1, Math.max(0, (now - letter.startedAt) / letter.demoDurationMs));
  return {
    ...real,
    progress,
    arrived: progress >= 1,
    remainingDemoMs: Math.max(0, letter.demoDurationMs - (now - letter.startedAt)),
  };
}

export function seedDemoLetter(): Letter {
  const existing = readAll().find((l) => l.id === "demo");
  if (existing && !letterProgress(existing).arrived) return existing;
  const letter: Letter = {
    id: "demo",
    fromName: "Você",
    toName: "Meu amor",
    body: "Escrevi isto pensando em você. A carta vem a caminho — escolha o mensageiro e acompanhe no mapa.",
    designId: "rosa",
    messengerId: "pigeon",
    fromCityId: "sp",
    toCityId: "rj",
    startedAt: Date.now() - 6000,
    demoDurationMs: demoDurationMs(70),
  };
  writeAll([letter, ...readAll().filter((l) => l.id !== "demo")]);
  return letter;
}

export function shareUrl(letterId: string) {
  if (typeof window === "undefined") return `/acompanhar/${letterId}`;
  return `${window.location.origin}/acompanhar/${letterId}`;
}
