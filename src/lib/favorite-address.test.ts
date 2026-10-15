import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { emptyAddress } from "./address.ts";
import {
  addressLooksFilled,
  clearFavoriteAddress,
  readFavoriteAddress,
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
    clearFavoriteAddress("home");
    clearFavoriteAddress("work");
  });

  it("guarda e lê o endereço da casa", () => {
    const home = {
      ...emptyAddress(),
      street: "Av. Paulista",
      number: "1000",
      city: "São Paulo",
      state: "SP",
      cep: "01310-100",
    };
    saveFavoriteAddress("home", home);
    assert.deepEqual(readFavoriteAddress("home"), home);
    assert.equal(addressLooksFilled(home), true);
  });

  it("separa casa e trabalho", () => {
    saveFavoriteAddress("home", {
      ...emptyAddress(),
      street: "Rua A",
      city: "SP",
      state: "SP",
      number: "1",
    });
    saveFavoriteAddress("work", {
      ...emptyAddress(),
      street: "Rua B",
      city: "RJ",
      state: "RJ",
      number: "2",
    });
    assert.equal(readFavoriteAddress("home")?.street, "Rua A");
    assert.equal(readFavoriteAddress("work")?.street, "Rua B");
  });
});
