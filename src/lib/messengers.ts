export type MessengerId = string;

export type ArrivalFx =
  | "land-flap"
  | "rear-up"
  | "bow"
  | "nest-drop"
  | "glide-fold"
  | "stretch-yawn"
  | "touchdown";

export type Messenger = {
  id: MessengerId;
  name: string;
  tagline: string;
  flavor: string;
  speedKmh: number;
  basePriceBrl: number;
  token: string;
  arrival: ArrivalFx;
  arrivalCopy: string;
  etaHint: string;
  photoSrc?: string;
  previewSrc?: string;
  mapSrc?: string;
  arriveSrc?: string;
};

export const MESSENGERS: Messenger[] = [
  {
    id: "plane",
    name: "Avião",
    tagline: "Cruzeiro direto.",
    flavor: "A carta atravessa o céu em linha quase reta.",
    speedKmh: 750,
    basePriceBrl: 39,
    token: "plane",
    arrival: "touchdown",
    arrivalCopy: "Pouso suave. A carta desembarca.",
    etaHint: "minutos a horas",
  },
  {
    id: "pigeon",
    name: "Pombo-correio",
    tagline: "O clássico alado.",
    flavor: "Rápido, fiel, um pouco dramático no pouso.",
    speedKmh: 70,
    basePriceBrl: 14,
    token: "pigeon",
    arrival: "land-flap",
    arrivalCopy: "O pombo bate as asas e pousa no parapeito.",
    etaHint: "horas",
  },
  {
    id: "stork",
    name: "Cegonha",
    tagline: "Leva com cuidado.",
    flavor: "Voo alto e cerimonioso. Entrega como um presente.",
    speedKmh: 45,
    basePriceBrl: 22,
    token: "stork",
    arrival: "nest-drop",
    arrivalCopy: "A cegonha desce e deixa a carta no ninho.",
    etaHint: "meio dia",
  },
  {
    id: "swan",
    name: "Cisne",
    tagline: "Elegante demais.",
    flavor: "Desliza como se o mapa fosse um lago.",
    speedKmh: 32,
    basePriceBrl: 26,
    token: "swan",
    arrival: "glide-fold",
    arrivalCopy: "O cisne recolhe as asas e a carta flutua até você.",
    etaHint: "1–2 dias",
  },
  {
    id: "horse",
    name: "Cavalo",
    tagline: "Galope constante.",
    flavor: "Estrada, poeira dourada, chegada altiva.",
    speedKmh: 28,
    basePriceBrl: 24,
    token: "horse",
    arrival: "rear-up",
    arrivalCopy: "O cavalo empina e a carta cai da algibeira.",
    etaHint: "1–3 dias",
  },
  {
    id: "donkey",
    name: "Jegue",
    tagline: "Devagar e teimoso.",
    flavor: "Não tem pressa. A espera faz parte da carta.",
    speedKmh: 8,
    basePriceBrl: 16,
    token: "donkey",
    arrival: "bow",
    arrivalCopy: "O jegue para, abaixa a cabeça e a carta escorrega.",
    etaHint: "vários dias",
  },
  {
    id: "turtle",
    name: "Tartaruga",
    tagline: "A mais lenta. A mais lembrada.",
    flavor: "Quem escolhe a tartaruga quer que a saudade dure.",
    speedKmh: 1.2,
    basePriceBrl: 11,
    token: "turtle",
    arrival: "stretch-yawn",
    arrivalCopy: "A tartaruga chega, estica o pescoço, entrega sem pressa.",
    etaHint: "semanas",
  },
];

export function getMessenger(id: MessengerId) {
  return MESSENGERS.find((m) => m.id === id) ?? MESSENGERS[0];
}

export function replaceMessengers(rows: Messenger[]) {
  if (!rows.length) return;
  MESSENGERS.splice(0, MESSENGERS.length, ...rows);
}

export type Geo = { lat: number; lng: number };

export const CITIES: { id: string; name: string; geo: Geo }[] = [
  { id: "sp", name: "São Paulo", geo: { lat: -23.55, lng: -46.63 } },
  { id: "rj", name: "Rio de Janeiro", geo: { lat: -22.9, lng: -43.17 } },
  { id: "bh", name: "Belo Horizonte", geo: { lat: -19.92, lng: -43.94 } },
  { id: "rec", name: "Recife", geo: { lat: -8.05, lng: -34.88 } },
  { id: "cwb", name: "Curitiba", geo: { lat: -25.43, lng: -49.27 } },
  { id: "lis", name: "Lisboa", geo: { lat: 38.72, lng: -9.14 } },
  { id: "par", name: "Paris", geo: { lat: 48.86, lng: 2.35 } },
];

export function getCity(id: string) {
  return CITIES.find((c) => c.id === id) ?? CITIES[0];
}

export function haversineKm(a: Geo, b: Geo) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s1 =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s1)));
}

export function estimateDelivery(opts: {
  messengerId: MessengerId;
  from: Geo;
  to: Geo;
}) {
  const m = getMessenger(opts.messengerId);
  const km = Math.max(1, haversineKm(opts.from, opts.to));
  const hours = m.id === "plane" && km < 80 ? 0.35 : km / m.speedKmh;
  return { km, hours, durationMs: hours * 60 * 60 * 1000 };
}

/** Preview-only compressed duration so journeys are watchable. */
export function demoDurationMs(speedKmh: number) {
  const fastest = 750;
  const slowest = 1.2;
  const t = Math.log(fastest / speedKmh) / Math.log(fastest / slowest);
  return Math.round((12 + t * 68) * 1000);
}

export function formatEta(hours: number) {
  if (hours < 1) return `${Math.max(5, Math.round(hours * 60))} min`;
  if (hours < 24) return `${hours.toFixed(1).replace(".", ",")} h`;
  const d = hours / 24;
  return `${d.toFixed(1).replace(".", ",")} dias`;
}

export const MESSENGER_CYCLE: MessengerId[] = MESSENGERS.map((m) => m.id);

export function messengerPhoto(id: MessengerId) {
  const m = MESSENGERS.find((x) => x.id === id);
  return m?.photoSrc || `/messengers/previews/${id}.jpg`;
}

export function messengerPreview(id: MessengerId) {
  const m = MESSENGERS.find((x) => x.id === id);
  return m?.previewSrc || `/messengers/previews/${id}.mp4`;
}

export function messengerGif(id: MessengerId) {
  return `/messengers/${id}.gif`;
}

export function messengerArrivalGif(id: MessengerId) {
  const m = MESSENGERS.find((x) => x.id === id);
  return m?.arriveSrc || `/messengers/${id}-arrive.webp`;
}

export const FLIES: Record<string, boolean> = {
  pigeon: true,
  stork: true,
  swan: true,
  plane: true,
  horse: false,
  donkey: false,
  turtle: false,
};
