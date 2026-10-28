import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COUPON_MESSAGES,
  couponCut,
  normalizeCouponCode,
  roundBrl,
  secondSendMessage,
  secondSendState,
} from "./coupon-rules.ts";
import { DESIGNS } from "./designs.ts";
import { MESSENGERS } from "./messengers.ts";

describe("cupom AMOR (2º envio grátis)", () => {
  it("sem carta enviada: pede o primeiro envio", () => {
    const s = secondSendState({ sentLetters: 0, alreadyRedeemed: false });
    assert.equal(s, "first-send");
    assert.equal(secondSendMessage(s), "Faça seu primeiro envio para liberar o cupom AMOR");
  });
  it("com 1 carta enviada: libera", () => {
    assert.equal(secondSendState({ sentLetters: 1, alreadyRedeemed: false }), "ok");
  });
  it("já usado: bloqueia (mesmo com várias cartas)", () => {
    const s = secondSendState({ sentLetters: 5, alreadyRedeemed: true });
    assert.equal(s, "used");
    assert.equal(secondSendMessage(s), COUPON_MESSAGES.used);
    assert.equal(COUPON_MESSAGES.used, "Você já usou o cupom AMOR");
  });
  it("código sem diferença de maiúsculas", () => {
    assert.equal(normalizeCouponCode("  amor "), "AMOR");
    assert.equal(normalizeCouponCode("Amor"), "AMOR");
  });
  it("100% zera mensageiro + papel + adicionais", () => {
    const total = roundBrl(19.9 + 3.9 + 5.9 + 1.9);
    assert.equal(total, 31.6);
    assert.deepEqual(couponCut(total, { percent: 100 }), { percentCut: 31.6, amountCut: 0, total: 0 });
  });
});

describe("valores com centavos", () => {
  it("soma sem lixo de ponto flutuante", () => {
    assert.equal(roundBrl(4.9 + 2.9), 7.8);
    assert.equal(roundBrl(6.9 + 1.9 + 1.9), 10.7);
  });
  it("cupom de % corta em centavos (não em reais)", () => {
    assert.deepEqual(couponCut(7.8, { percent: 10 }), { percentCut: 0.78, amountCut: 0, total: 7.02 });
  });
  it("cupom fixo nunca deixa negativo", () => {
    assert.equal(couponCut(4.9, { amountBrl: 10 }).total, 0);
  });
});

describe("tabela de preços (fallback do app = migração 0014)", () => {
  const m = Object.fromEntries(MESSENGERS.map((x) => [x.id, x.basePriceBrl]));
  it("mensageiros", () => {
    assert.deepEqual(m, { plane: 19.9, pigeon: 6.9, stork: 12.9, swan: 14.9, horse: 9.9, donkey: 5.9, turtle: 4.9 });
  });
  it("papéis pagos e grátis", () => {
    const d = Object.fromEntries(DESIGNS.map((x) => [x.id, x.paid ? x.priceBrl : 0]));
    assert.deepEqual(d, {
      classico: 0, rosa: 0, polaroid: 0, coracoes: 0, nuvens: 0,
      flores: 1.9, piquenique: 1.9, noite: 2.9, retro: 2.9, ursinho: 2.9, estrelada: 2.9,
      jardim: 3.9, scrapbook: 3.9, mapa: 3.9,
    });
  });
});
