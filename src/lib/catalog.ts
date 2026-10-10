import { replaceDesigns, type Design } from "./designs";
import { setAnonymousFee } from "./delivery";
import { replaceMessengers, type Messenger } from "./messengers";
import { listCatalog } from "./server/shop";

export async function bootCatalog() {
  try {
    const data = await listCatalog();
    const templates: Design[] = data.templates.map((t, i) => ({
      id: t.id,
      name: t.name,
      tagline: t.tagline,
      src: t.src,
      tilt: i % 2 ? 2.2 : -2.2,
      paid: t.paid,
      priceBrl: t.price_brl,
      ink: t.ink === "light" ? "light" : "dark",
      fontFamily: t.font_family,
    }));
    const messengers: Messenger[] = data.messengers.map((m) => ({
      id: m.id,
      name: m.name,
      tagline: m.tagline,
      flavor: m.flavor,
      speedKmh: Number(m.speed_kmh),
      basePriceBrl: m.price_brl,
      token: m.token,
      arrival: "land-flap",
      arrivalCopy: "",
      etaHint: "",
      photoSrc: m.photo_src || undefined,
      previewSrc: m.preview_src || undefined,
      mapSrc: m.map_src || undefined,
      arriveSrc: m.arrive_src || undefined,
    }));
    replaceDesigns(templates);
    replaceMessengers(messengers);
    if (typeof data.anonymousFee === "number") setAnonymousFee(data.anonymousFee);
  } catch {
    /* seed in client modules remains */
  }
}
