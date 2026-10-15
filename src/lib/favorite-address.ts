import { emptyAddress, type Address } from "./address.ts";

const KEY = "cartas-favorite-addresses-v2";
const LEGACY_KEY = "cartas-favorite-addresses-v1";

export type FavoriteAddress = Address & {
  id: string;
  label: string;
  savedAt: number;
};

function storage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `fav-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function asFavorite(row: Partial<FavoriteAddress>, fallbackLabel: string): FavoriteAddress | null {
  if (!row || typeof row !== "object") return null;
  const addr = { ...emptyAddress(), ...row };
  if (!addr.street && !addr.cep && !addr.city) return null;
  return {
    ...addr,
    id: typeof row.id === "string" && row.id ? row.id : newId(),
    label: (row.label || fallbackLabel).trim() || fallbackLabel,
    savedAt: typeof row.savedAt === "number" ? row.savedAt : Date.now(),
  };
}

function migrateLegacy(): FavoriteAddress[] {
  const ls = storage();
  if (!ls) return [];
  try {
    const raw = ls.getItem(LEGACY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, Address>;
    if (!parsed || typeof parsed !== "object") return [];
    const out: FavoriteAddress[] = [];
    if (parsed.home) {
      const fav = asFavorite(parsed.home, "Casa");
      if (fav) out.push(fav);
    }
    if (parsed.work) {
      const fav = asFavorite(parsed.work, "Trabalho");
      if (fav) out.push(fav);
    }
    return out;
  } catch {
    return [];
  }
}

export function listFavoriteAddresses(): FavoriteAddress[] {
  const ls = storage();
  if (!ls) return [];
  try {
    const raw = ls.getItem(KEY);
    if (!raw) {
      const migrated = migrateLegacy();
      if (migrated.length) writeFavoriteAddresses(migrated);
      return migrated;
    }
    const parsed = JSON.parse(raw) as FavoriteAddress[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row, i) => asFavorite(row, `Favorito ${i + 1}`))
      .filter((row): row is FavoriteAddress => Boolean(row))
      .sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

function writeFavoriteAddresses(rows: FavoriteAddress[]) {
  const ls = storage();
  if (!ls) return;
  ls.setItem(KEY, JSON.stringify(rows));
}

export function saveFavoriteAddress(address: Address, label?: string): FavoriteAddress | null {
  if (!addressLooksFilled(address)) return null;
  const rows = listFavoriteAddresses();
  const name =
    (label || "").trim() ||
    [address.street, address.number].filter(Boolean).join(", ") ||
    address.city ||
    `Favorito ${rows.length + 1}`;
  const fav: FavoriteAddress = {
    ...emptyAddress(),
    ...address,
    id: newId(),
    label: name.slice(0, 48),
    savedAt: Date.now(),
  };
  writeFavoriteAddresses([fav, ...rows].slice(0, 20));
  return fav;
}

export function removeFavoriteAddress(id: string) {
  writeFavoriteAddresses(listFavoriteAddresses().filter((row) => row.id !== id));
}

export function addressLooksFilled(address: Address) {
  return Boolean(address.street.trim() || address.cep.trim() || address.city.trim());
}

export function favoriteSummary(fav: FavoriteAddress) {
  return [fav.street, fav.number, fav.neighborhood, fav.city, fav.state, fav.cep]
    .filter(Boolean)
    .join(" · ");
}

/** @deprecated use listFavoriteAddresses */
export type FavoriteSlot = "home" | "work";

/** @deprecated */
export function readFavoriteAddress(slot: FavoriteSlot) {
  const label = slot === "home" ? "Casa" : "Trabalho";
  return listFavoriteAddresses().find((f) => f.label === label) ?? listFavoriteAddresses()[0] ?? null;
}

/** @deprecated */
export function clearFavoriteAddress(_slot: FavoriteSlot) {
  /* no-op kept for testes antigos */
}
