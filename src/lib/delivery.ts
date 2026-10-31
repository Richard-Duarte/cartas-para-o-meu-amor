import { formatDateTimeBr } from "./dates";
import { estimateDelivery, MESSENGERS, type Geo, type MessengerId } from "./messengers";

/** Viagem mais curta que isto não recebe aviso de "está chegando". */
export const INSTANT_MS = 60 * 60 * 1000;

export const ANONYMOUS_FEE_BRL = 5.9;

/** Soma no valor do mensageiro quando a chegada é num dia escolhido (padrão; o banco manda). */
export const SCHEDULE_FEE_BRL = 9.9;

let anonymousFeeBrl = ANONYMOUS_FEE_BRL;
let scheduleFeeBrl = SCHEDULE_FEE_BRL;

/** Taxa de "Agendar chegada" vinda do catálogo (app_settings.schedule_fee). */
export function getScheduleFee() {
  return scheduleFeeBrl;
}

export function setScheduleFee(value: number) {
  if (!Number.isFinite(value) || value < 0) return;
  scheduleFeeBrl = Math.round(value * 100) / 100;
}

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

/** "sexta, 30/10/2026 às 03:00" (data sempre dd/mm/aaaa). */
export function formatArrival(date: Date) {
  const weekday = date.toLocaleDateString("pt-BR", { timeZone: TZ, weekday: "long" }).replace(/-feira$/i, "");
  return `${weekday}, ${formatDateTimeBr(date)}`;
}

/**
 * Versão média, que cabe numa linha do celular: "terça, 27 de out. às 02:25".
 * Tira o "-feira" e abrevia o mês.
 */
export function formatArrivalCompact(date: Date) {
  const weekday = date
    .toLocaleDateString("pt-BR", { timeZone: TZ, weekday: "long" })
    .replace(/-feira$/i, "");
  return `${weekday}, ${formatDateTimeBr(date)}`;
}

/** Versão curta para listas: "sáb., 31/10 às 18:00". */
export function formatArrivalShort(date: Date) {
  return formatDateTimeBr(date);
}

/** Carta sem endereço (anônima, ou para quem não tem endereço): chega sempre em 2h. */
export const ADDRESSLESS_TRIP_MS = 2 * 60 * 60 * 1000;

export function planArrival(opts: {
  messengerId: MessengerId;
  from: Geo;
  to: Geo;
  now?: Date;
  arriveOn?: string | null;
  /** Sem endereço: 2h fixas, qualquer mensageiro, sem dia marcado. */
  addressless?: boolean;
}): ArrivalPlan {
  const now = opts.now ?? new Date();
  if (opts.addressless) {
    return {
      hours: 2,
      km: 0,
      departAt: now,
      arriveAt: new Date(now.getTime() + ADDRESSLESS_TRIP_MS),
      instant: false,
      fits: true,
    };
  }
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

  const target = parseArriveOn(opts.arriveOn);
  if (!target) {
    return { hours: est.hours, km: est.km, departAt: now, arriveAt: asap, instant: false, fits: false };
  }
  if (target.time) {
    // Dia E hora marcados: chega exatamente nesse horário (tolerância de 1 min).
    const exact = saoPauloDate(target.day, target.time.h, target.time.m);
    // Horário escolhido e pago é sempre honrado: se o bicho não daria tempo, ele sai agora e "acelera".
    const onTime = asap.getTime() <= exact.getTime() + 60_000;
    const fits = exact.getTime() > now.getTime() - 60_000;
    const arriveAt = onTime ? new Date(Math.max(exact.getTime(), asap.getTime())) : fits ? exact : asap;
    return {
      hours: est.hours,
      km: est.km,
      departAt: onTime ? new Date(arriveAt.getTime() - travelMs) : now,
      arriveAt,
      instant: fits && arriveAt.getTime() - now.getTime() < INSTANT_MS,
      fits,
    };
  }

  const end = saoPauloDate(target.day, 23, 59);
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

  const preferred = saoPauloDate(target.day, 18, 0);
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

/**
 * `arriveOn` aceita "AAAA-MM-DD" (só o dia: chega às 18h ou assim que der) ou
 * "AAAA-MM-DDTHH:MM" (dia e hora exatos, horário de Brasília). Outro formato → null.
 */
export function parseArriveOn(value: string) {
  const m = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(value.trim());
  if (!m) return null;
  if (m[2] === undefined) return { day: m[1], time: null };
  const h = Number(m[2]);
  const min = Number(m[3]);
  if (h > 23 || min > 59) return null;
  return { day: m[1], time: { h, m: min } };
}

/**
 * Primeiro dia+hora que ESTE mensageiro consegue cumprir: 18:00 do dia em que ele pode chegar,
 * ou o primeiro quarto de hora depois da chegada mais cedo. Sempre "AAAA-MM-DDTHH:MM" (BRT).
 */
export function defaultArriveOn(messengerId: MessengerId, from: Geo, to: Geo, now = new Date()) {
  const asap = planArrival({ messengerId, from, to, now }).arriveAt;
  const day = dayKey(asap);
  if (asap.getTime() <= saoPauloDate(day, 18, 0).getTime()) return `${day}T18:00`;
  const q = 15 * 60_000;
  const t = new Date(Math.ceil((asap.getTime() + 60_000) / q) * q);
  const brt = new Date(t.getTime() - 3 * 3600_000);
  return `${dayKey(t)}T${String(brt.getUTCHours()).padStart(2, "0")}:${String(brt.getUTCMinutes()).padStart(2, "0")}`;
}

/** Sugestão de horário para um dia: 18:00, ou o primeiro quarto de hora depois que algum mensageiro chega. */
export function suggestTime(day: string, from: Geo, to: Geo, now = new Date()) {
  let best = Number.POSITIVE_INFINITY;
  for (const m of MESSENGERS) best = Math.min(best, planArrival({ messengerId: m.id, from, to, now }).arriveAt.getTime());
  const six = saoPauloDate(day, 18, 0).getTime();
  if (best <= six) return "18:00";
  const q = 15 * 60_000;
  const t = new Date(Math.ceil(best / q) * q);
  if (dayKey(t) !== day) return "23:59";
  const brt = new Date(t.getTime() - 3 * 3600_000);
  return `${String(brt.getUTCHours()).padStart(2, "0")}:${String(brt.getUTCMinutes()).padStart(2, "0")}`;
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

/** "1h 23min" / "12min" / "menos de 1min" até a chegada. */
export function formatRemaining(ms: number) {
  if (ms <= 0) return "agora";
  const min = Math.ceil(ms / 60000);
  if (min < 1) return "menos de 1min";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m}min`;
  return m ? `${h}h ${m}min` : `${h}h`;
}
