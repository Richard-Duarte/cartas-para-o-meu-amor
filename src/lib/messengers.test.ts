import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getMessenger, messengerModelId } from "./messengers.ts";

describe("messengerModelId", () => {
  it("usa o token do mensageiro para o modelo 3D", () => {
    assert.equal(messengerModelId("pigeon"), "pigeon");
    assert.equal(messengerModelId("stork"), "stork");
    assert.equal(messengerModelId("plane"), "plane");
  });

  it("aceita o token como id de busca", () => {
    assert.match(getMessenger("pigeon").name, /[Pp]ombo/);
    assert.equal(messengerModelId("pigeon"), getMessenger("pigeon").token);
  });

  it("cai no pombo quando o id é desconhecido", () => {
    assert.equal(getMessenger("nao-existe").id, "pigeon");
    assert.equal(messengerModelId("nao-existe"), "pigeon");
  });
});
