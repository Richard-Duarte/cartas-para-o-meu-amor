import { estimateDelivery, MESSENGERS, type Geo, type MessengerId } from "./messengers";

/** Viagem mais curta que isto não recebe aviso de "está chegando". */
export const INSTANT_MS = 60 * 60 * 1000;

export const ANONYMOUS_FEE_BRL = 9.9;

/** Soma no valor do mensageiro quando a chegada é num dia escolhido. */
export const SCHEDULE_FEE_BRL = 4.9;

let anonymousFeeBrl = ANONYMOUS_FEE_BRL;

export function getAnonymousFee() {
  return anonymousFeeBrl;
}

export function setAnonymousFee(value: number) {
  if (!Number.isFinite(value) || value < 0) return;
  anonymousFeeBrl = Math.round(value * 100) / 100;
}

const TZ = "America/Sao_Paulo";

export type ArrivalPlan = {
  hours: number;
  km: number;
  departAt: Date;
  arriveAt: Date;
  instant: boolean;
  fits: boolean;
};

export function dayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Relógio de parede em São Paulo (UTC−3, sem horário de verão). */
export function saoPauloDate(day: string, hour: number, minute: number) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, hour + 3, minute, 0));
}

export function formatArrival(date: Date) {
  const day = date.toLocaleDateString("pt-BR", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const time = date.toLocaleTimeString("pt-BR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day} às ${time}`;
}

export function planArrival(opts: {
  messengerId: MessengerId;
  from: Geo;
  to: Geo;
  now?: Date;
  arriveOn?: string | null;
}): ArrivalPlan {
  const now = opts.now ?? new Date();
  const est = estimateDelivery({
    messengerId: opts.messengerId,
    from: opts.from,
    to: opts.to,
  });
  const travelMs = est.hours * 60 * 60 * 1000;
  const asap = new Date(now.getTime() + travelMs);

  if (!opts.arriveOn) {
    return {
      hours: est.hours,
      km: est.km,
      departAt: now,
      arriveAt: asap,
      instant: asap.getTime() - now.getTime() < INSTANT_MS,
      fits: true,
    };
  }

  const end = saoPauloDate(opts.arriveOn, 23, 59);
  end.setSeconds(59);
  if (asap.getTime() > end.getTime()) {
    return {
      hours: est.hours,
      km: est.km,
      departAt: now,
      arriveAt: asap,
      instant: false,
      fits: false,
    };
  }

  const preferred = saoPauloDate(opts.arriveOn, 18, 0);
  const arriveAt = preferred.getTime() >= asap.getTime() ? preferred : asap;
  return {
    hours: est.hours,
    km: est.km,
    departAt: new Date(arriveAt.getTime() - travelMs),
    arriveAt,
    instant: arriveAt.getTime() - now.getTime() < INSTANT_MS,
    fits: true,
  };
}

/** Quando avisar que está chegando. Nulo se a viagem é instantânea. */
export function approachNoticeAt(now: Date, departAt: Date, arriveAt: Date) {
  const remaining = arriveAt.getTime() - now.getTime();
  if (remaining < INSTANT_MS) return null;
  const lead = Math.min(6 * 60 * 60 * 1000, Math.max(60 * 60 * 1000, remaining * 0.15));
  const at = new Date(arriveAt.getTime() - lead);
  return at.getTime() < departAt.getTime() ? new Date(departAt.getTime()) : at;
}

export function earliestDay(from: Geo, to: Geo, now = new Date()) {
  let best = Number.POSITIVE_INFINITY;
  for (const m of MESSENGERS) {
    const plan = planArrival({ messengerId: m.id, from, to, now });
    best = Math.min(best, plan.arriveAt.getTime());
  }
  return dayKey(new Date(best));
}

export function latestDay(from: Geo, to: Geo, now = new Date()) {
  let best = 0;
  for (const m of MESSENGERS) {
    const plan = planArrival({ messengerId: m.id, from, to, now });
    best = Math.max(best, plan.arriveAt.getTime());
  }
  return dayKey(new Date(best));
}

export function whatsAppNumber(raw: string) {
  const d = raw.replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12 && d.length <= 13) return d;
  if (d.length === 10 || d.length === 11) return `55${d}`;
  return null;
}

export function cleanEmail(raw: string) {
  const v = raw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return null;
  return v;
}

/** E-mail e WhatsApp saem da conta de quem está logado, não do formulário. */
export function contactsReady() {
  return true;
}

export function anonymousLinkCopy(opts: {
  toName: string;
  when: string;
  url: string;
  instant: boolean;
}) {
  const whenLine = opts.instant
    ? "A carta já pode ser aberta."
    : `Quem leva chega por volta de ${opts.when}.`;
  return [
    `Oi, ${opts.toName}.`,
    ``,
    `Aqui é o Carta para o meu amor. Alguém escreveu uma carta para você e pediu para o nome não aparecer.`,
    whenLine,
    `O link, para abrir quando quiser:`,
    opts.url,
    ``,
    `Esta mensagem é só sobre a carta. Ninguém daqui pede senha, código ou pagamento.`,
  ].join("\n");
}

export function arrivingCopy(opts: {
  role: "sender" | "recipient";
  fromName: string;
  toName: string;
  messenger: string;
  when: string;
  place: string;
  url: string;
  anonymous: boolean;
}) {
  const place = opts.place ? `, em ${opts.place}` : "";
  if (opts.role === "sender") {
    return {
      subject: `A carta para ${opts.toName} está chegando`,
      text: [
        `Oi, ${opts.fromName}.`,
        ``,
        `A carta para ${opts.toName} está perto de chegar.`,
        `O ${opts.messenger} deve entregar por volta de ${opts.when}${place}.`,
        `Acompanhe por aqui:`,
        opts.url,
        ``,
        `Este aviso sai uma vez, no e-mail e no WhatsApp. Não pedimos senha nem pagamento.`,
      ].join("\n"),
    };
  }
  const who = opts.anonymous
    ? "Quem escreveu pediu para o nome não aparecer."
    : `${opts.fromName} escreveu esta carta.`;
  return {
    subject: "Uma carta está chegando para você",
    text: [
      `Oi, ${opts.toName}.`,
      ``,
      `A carta do Carta para o meu amor está perto de chegar.`,
      who,
      `O ${opts.messenger} deve entregar por volta de ${opts.when}${place}.`,
      `O mesmo link continua valendo:`,
      opts.url,
      ``,
      `Este aviso sai uma vez. Ninguém daqui pede senha, código ou pagamento.`,
    ].join("\n"),
  };
}
