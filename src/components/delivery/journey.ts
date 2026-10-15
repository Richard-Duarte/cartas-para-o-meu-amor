import { addressLine } from "@/lib/address";
import { formatArrival } from "@/lib/delivery";
import { letterProgress, shownFromName, type Letter } from "@/lib/letters";
import { FLIES, getCity, getMessenger, messengerModelId, type Geo } from "@/lib/messengers";

export type JourneySnapshot = {
  progress: number;
  arrived: boolean;
  waiting: boolean;
  label: string;
};

export function letterEndpoints(letter: Letter): {
  from: Geo & { label: string };
  to: Geo & { label: string };
} {
  const fromCity = getCity(letter.fromCityId);
  const toCity = getCity(letter.toCityId);
  const from = letter.fromGeo ?? fromCity.geo;
  const to = letter.toGeo ?? toCity.geo;
  const fromName = shownFromName(letter, "public").trim() || letter.fromName?.trim() || "Origem";
  const toName = letter.toName?.trim().replace(/,$/, "") || "Destino";
  return {
    from: { ...from, label: fromName },
    to: { ...to, label: toName },
  };
}

export function trackMeta(letter: Letter) {
  const from = letter.fromAddress?.street
    ? addressLine(letter.fromAddress)
    : getCity(letter.fromCityId).name;
  const to = letter.toAddress?.street
    ? addressLine(letter.toAddress)
    : getCity(letter.toCityId).name;
  const price =
    letter.paidBrl != null
      ? `lacre de ${letter.paidBrl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
      : "";
  return { from, to, animal: getMessenger(letter.messengerId).name, price };
}

export function journeySnapshot(letter: Letter, now = Date.now()): JourneySnapshot {
  const stats = letterProgress(letter, now);
  const { to } = letterEndpoints(letter);
  const flying = Boolean(FLIES[messengerModelId(letter.messengerId)]);
  const pct = Math.round(stats.progress * 100);
  let label: string;
  if (stats.arrived) label = `Chegou em ${to.label}`;
  else if (stats.waiting) label = `Ainda não saiu · sai ${formatArrival(new Date(stats.departAt))}`;
  else
    label = `${flying ? "Em voo" : "A caminho"} · ${pct}% · chega ${formatArrival(new Date(stats.arriveAt))}`;
  return { progress: stats.progress, arrived: stats.arrived, waiting: stats.waiting, label };
}

export function letterOverlay(letter: Letter) {
  const raw = (letter.body || "").trim();
  const chunks = raw
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  const paragraphs = chunks.length
    ? chunks
    : raw
      ? [raw]
      : letter.drawingDataUrl
        ? ["Um desenho para você."]
        : ["…"];
  const place = letter.toAddress?.city || getCity(letter.toCityId).name;
  const when = new Date(letter.startedAt).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
  });
  const name = letter.toName?.trim().replace(/,$/, "") || "Meu amor";
  return {
    date: `${place}, ${when}`,
    greeting: `${name},`,
    paragraphs,
    sign: shownFromName(letter, "public"),
    drawing: letter.drawingDataUrl || "",
  };
}
