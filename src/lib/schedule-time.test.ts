import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArriveOn, planArrival } from "./delivery";
import { oceanName } from "./address";

const from = { lat: -23.55, lng: -46.63 };
const to = { lat: -22.9, lng: -43.2 };
const now = new Date("2026-10-29T12:00:00Z");

test("parseArriveOn aceita dia e dia+hora", () => {
  assert.deepEqual(parseArriveOn("2026-11-02"), { day: "2026-11-02", time: null });
  assert.deepEqual(parseArriveOn("2026-11-02T07:30"), { day: "2026-11-02", time: { h: 7, m: 30 } });
  assert.equal(parseArriveOn("2026-11-02T25:00"), null);
  assert.equal(parseArriveOn("amanhã"), null);
});

test("dia+hora chega no horário exato (BRT)", () => {
  const p = planArrival({ messengerId: "pigeon", from, to, now, arriveOn: "2026-11-05T07:30" });
  assert.equal(p.fits, true);
  assert.equal(p.arriveAt.toISOString(), "2026-11-05T10:30:00.000Z");
});

test("horário futuro curto é honrado (mensageiro sai agora e acelera)", () => {
  const p = planArrival({ messengerId: "pigeon", from, to, now, arriveOn: "2026-10-29T09:30" });
  assert.equal(p.fits, true);
  assert.equal(p.arriveAt.toISOString(), "2026-10-29T12:30:00.000Z");
  assert.equal(p.departAt.toISOString(), now.toISOString());
});

test("horário que já passou não serve", () => {
  const p = planArrival({ messengerId: "pigeon", from, to, now, arriveOn: "2026-10-29T08:00" });
  assert.equal(p.fits, false);
});

test("só o dia mantém o comportamento antigo (18h)", () => {
  const p = planArrival({ messengerId: "pigeon", from, to, now, arriveOn: "2026-11-05" });
  assert.equal(p.arriveAt.toISOString(), "2026-11-05T21:00:00.000Z");
});

test("oceanos", () => {
  assert.equal(oceanName(0, -160), "Oceano Pacífico");
  assert.equal(oceanName(-20, -20), "Oceano Atlântico");
  assert.equal(oceanName(-20, 80), "Oceano Índico");
});
