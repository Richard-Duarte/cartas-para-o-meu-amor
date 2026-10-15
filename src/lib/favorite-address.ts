import { emptyAddress, type Address } from "./address.ts";

const KEY = "cartas-favorite-addresses-v1";

export type FavoriteSlot = "home" | "work";

type Store = Partial<Record<FavoriteSlot, Address>>;

function storage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

function readStore(): Store {
  const ls = storage();
  if (!ls) return {};
  try {
    const raw = ls.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Store;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(next: Store) {
  const ls = storage();
  if (!ls) return;
  ls.setItem(KEY, JSON.stringify(next));
}

export function readFavoriteAddress(slot: FavoriteSlot): Address | null {
  const row = readStore()[slot];
  if (!row || typeof row !== "object") return null;
  const addr = { ...emptyAddress(), ...row };
  if (!addr.street && !addr.cep && !addr.city) return null;
  return addr;
}

export function saveFavoriteAddress(slot: FavoriteSlot, address: Address) {
  const next = { ...readStore(), [slot]: { ...emptyAddress(), ...address } };
  writeStore(next);
}

export function clearFavoriteAddress(slot: FavoriteSlot) {
  const next = { ...readStore() };
  delete next[slot];
  writeStore(next);
}

export function addressLooksFilled(address: Address) {
  return Boolean(address.street.trim() || address.cep.trim() || address.city.trim());
}
