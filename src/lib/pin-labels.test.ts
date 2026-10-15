import assert from "node:assert/strict";
import { describe, it } from "node:test";

/** Espelha a regra dos pins: nome da pessoa acima do endereço. */
function pinLabels(letter: {
  fromName?: string;
  toName?: string;
  anonymous?: boolean;
}) {
  const fromName = letter.anonymous
    ? "Alguém"
    : letter.fromName?.trim() || "Origem";
  const toName = letter.toName?.trim().replace(/,$/, "") || "Destino";
  return { from: fromName, to: toName };
}

describe("map pin labels", () => {
  it("usa os nomes das pessoas, não a cidade", () => {
    const labels = pinLabels({ fromName: "Ana", toName: "Pedro" });
    assert.equal(labels.from, "Ana");
    assert.equal(labels.to, "Pedro");
  });

  it("respeita envio anônimo na origem", () => {
    const labels = pinLabels({ fromName: "Ana", toName: "Pedro", anonymous: true });
    assert.equal(labels.from, "Alguém");
    assert.equal(labels.to, "Pedro");
  });
});
