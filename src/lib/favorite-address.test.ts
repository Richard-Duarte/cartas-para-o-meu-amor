import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { emptyAddress } from "./address.ts";
import {
  addressLooksFilled,
  listFavoriteAddresses,
  removeFavoriteAddress,
  saveFavoriteAddress,
} from "./favorite-address.ts";

const mem = new Map<string, string>();

function installStorage() {
  mem.clear();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    writable: true,
    value: {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => {
        mem.set(k, String(v));
      },
      removeItem: (k: string) => {
        mem.delete(k);
      },
      clear: () => mem.clear(),
      key: () => null,
      get length() {
        return mem.size;
      },
    },
  });
}

describe("favorite-address", () => {
  beforeEach(() => {
    installStorage();
  });

  it("guarda vários favoritos e lista do mais recente", () => {
    const a = {
      ...emptyAddress(),
      street: "Av. Paulista",
      number: "1000",
      city: "São Paulo",
      state: "SP",
      cep: "01310-100",
    };
    const b = {
      ...emptyAddress(),
      street: "Av. Atlântica",
      number: "1702",
      city: "Rio de Janeiro",
      state: "RJ",
      cep: "22021-001",
    };
    assert.equal(addressLooksFilled(a), true);
    saveFavoriteAddress(a, "Casa SP");
    saveFavoriteAddress(b, "Praia");
    const list = listFavoriteAddresses();
    assert.equal(list.length, 2);
    assert.equal(list[0].label, "Praia");
    assert.equal(list[1].label, "Casa SP");
  });

  it("remove um favorito pelo id", () => {
    const fav = saveFavoriteAddress({
      ...emptyAddress(),
      street: "Rua A",
      number: "1",
      city: "SP",
      state: "SP",
    });
    assert.ok(fav);
    removeFavoriteAddress(fav.id);
    assert.equal(listFavoriteAddresses().length, 0);
  });
});
