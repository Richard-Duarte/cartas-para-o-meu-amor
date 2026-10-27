import { addressLine } from "@/lib/address";
import { formatArrivalCompact, formatRemaining } from "@/lib/delivery";
import { letterProgress, shownFromName, type Letter } from "@/lib/letters";
import { FLIES, getCity, getMessenger, messengerMode, messengerModelId, type Geo } from "@/lib/messengers";

export type JourneySnapshot = {
  progress: number;
  arrived: boolean;
  waiting: boolean;
  label: string;
};

export function letterEndpoints(letter: Letter): {
  from: Geo & { label: string; anonymous?: boolean };
  to: Geo & { label: string };
} {
  const fromCity = getCity(letter.fromCityId);
  const toCity = getCity(letter.toCityId);
  const from = letter.fromGeo ?? fromCity.geo;
  const to = letter.toGeo ?? toCity.geo;
  const fromName = shownFromName(letter, "public").trim() || letter.fromName?.trim() || "Origem";
  const toName = letter.toName?.trim().replace(/,$/, "") || "Destino";
  if (letter.addressless) {
    // Sem endereço: só rótulos para a cena; as coordenadas não são usadas.
    return {
      from: { ...fromCity.geo, label: letter.anonymous ? "Alguém especial" : fromName, anonymous: Boolean(letter.anonymous) },
      to: { ...toCity.geo, label: toName },
    };
  }
  return {
    from: { ...from, label: fromName },
    to: { ...to, label: toName },
  };
}

/** Cena da viagem sem endereço: céu para quem voa, estrada no campo para quem anda. */
export function journeyScene(letter: Letter): "sky" | "campo" | null {
  if (!letter.addressless) return null;
  return messengerMode(letter.messengerId) === "terra" ? "campo" : "sky";
}

export function trackMeta(letter: Letter) {
  // O servidor só manda cidade (ou nada) do lado que não é seu: mostra o que tiver.
  const place = (a: Letter["fromAddress"], cityId: string) =>
    a?.street ? addressLine(a) : a?.city ? [a.city, a.state].filter(Boolean).join(" — ") : getCity(cityId).name;
  const from = letter.addressless ? "Sem endereço" : place(letter.fromAddress, letter.fromCityId);
  const to = letter.addressless ? "Sem endereço · pela conta de quem recebe" : place(letter.toAddress, letter.toCityId);
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
  else if (stats.waiting) label = `Ainda não saiu · sai ${formatArrivalCompact(new Date(stats.departAt))}`;
  else if (letter.addressless)
    label = `${flying ? "Em voo" : "A caminho"} · ${pct}% · chega em ${formatRemaining(stats.arriveAt - now)}`;
  else
    label = `${flying ? "Em voo" : "A caminho"} · ${pct}% · chega ${formatArrivalCompact(new Date(stats.arriveAt))}`;
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
  const place = letter.addressless ? "" : letter.toAddress?.city || getCity(letter.toCityId).name;
  const when = new Date(letter.startedAt).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
  });
  const name = letter.toName?.trim().replace(/,$/, "") || "Meu amor";
  return {
    date: place ? `${place}, ${when}` : when,
    greeting: `${name},`,
    paragraphs,
    sign: shownFromName(letter, "public"),
    drawing: letter.drawingDataUrl || "",
  };
}
