/**
 * Cupom AMOR contra um Postgres de verdade (PGLite em memória, com TODAS as migrações).
 * Rodar: npx tsx --test src/lib/server/coupon-eligibility.test.ts
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { before, describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "../db";
import { resolveCoupon, secondSendStatus } from "./coupon-eligibility";

let pg: PGlite;
let sql: Sql;

before(async () => {
  pg = new PGlite({ parsers: { 1700: Number, 20: Number } });
  await pg.waitReady;
  const dir = join(import.meta.dirname, "../../../migrations");
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".sql")).sort()) {
    await pg.exec(readFileSync(join(dir, f), "utf8"));
  }
  const run = async (text: string, params: unknown[] = []) => (await pg.query(text, params)).rows;
  sql = Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => {
      let text = strings[0];
      values.forEach((_, i) => (text += `$${i + 1}${strings[i + 1]}`));
      return run(text, values);
    },
    { query: run },
  ) as unknown as Sql;
});

let n = 0;
async function letter(userId: string, pay?: { status?: string; amount?: number; owner?: string }) {
  const id = `l${++n}`;
  await pg.query(
    `insert into letters (id, user_id, from_name, to_name, template_id, messenger_id, paid_brl)
     values ($1, $2, 'a', 'b', 'classico', 'turtle', $3)`,
    [id, userId, pay?.amount ?? 7.8],
  );
  if (pay) {
    await pg.query(
      `insert into payment_intents (id, user_id, letter_id, status, amount_brl, payload_json)
       values ($1, $2, $3, $4, $5, '{}')`,
      [`pi-${id}`, pay.owner ?? userId, id, pay.status ?? "approved", pay.amount ?? 7.8],
    );
  }
  return id;
}
const redeem = (userId: string, letterId: string) =>
  pg.query(
    `insert into coupon_redemptions (id, code, kind, user_id, letter_id) values ($1, 'AMOR', 'coupon', $2, $3)`,
    [`c-${letterId}`, userId, letterId],
  );

describe("AMOR só na 2ª carta (exatamente 1 carta paga)", () => {
  it("0 cartas: pede o primeiro envio pago", async () => {
    assert.equal(await secondSendStatus(sql, "u0"), "first-send");
    const r = await resolveCoupon(sql, "u0", "amor");
    assert.deepEqual(r, { ok: false, message: "Faça seu primeiro envio pago para liberar o cupom AMOR", ruleBlocked: true });
  });

  it("cartas sem pagamento real não contam (teste, R$ 0, pendente, recusado, pagamento de outra conta)", async () => {
    await letter("uFree"); // modo teste / bypass / grátis / só crédito: sem payment_intent
    await letter("uFree", { status: "approved", amount: 0 }); // total zero
    await letter("uFree", { status: "pending", amount: 7.8 }); // PIX não pago
    await letter("uFree", { status: "rejected", amount: 7.8 });
    await letter("uFree", { status: "approved", amount: 7.8, owner: "outra-conta" });
    assert.equal(await secondSendStatus(sql, "uFree"), "first-send");
  });

  it("exatamente 1 carta paga: libera 100%", async () => {
    await letter("u1", { status: "approved", amount: 7.8 });
    await letter("u1"); // + uma grátis/teste, que não conta
    assert.equal(await secondSendStatus(sql, "u1"), "ok");
    const r = await resolveCoupon(sql, "u1", " Amor ");
    assert.equal(r.ok, true);
    assert.equal(r.ok && r.percent, 100);
  });

  it("2 cartas pagas: recusa (não é a 2ª carta)", async () => {
    await letter("u2", { status: "approved", amount: 4.9 });
    await letter("u2", { status: "approved", amount: 19.9 });
    assert.equal(await secondSendStatus(sql, "u2"), "not-second");
    const r = await resolveCoupon(sql, "u2", "AMOR");
    assert.deepEqual(r, { ok: false, message: "O cupom AMOR vale apenas para a sua segunda carta", ruleBlocked: true });
  });

  it("2º uso bloqueado; a mesma carta (webhook repetido) continua valendo", async () => {
    await letter("uR", { status: "approved", amount: 6.9 });
    const free = await letter("uR"); // a carta grátis do AMOR (sem pagamento)
    await redeem("uR", free);
    const again = await resolveCoupon(sql, "uR", "AMOR");
    assert.deepEqual(again, { ok: false, message: "Você já usou o cupom AMOR", ruleBlocked: true });
    assert.equal(await secondSendStatus(sql, "uR", free), "ok"); // idempotência do placeLetter
    await assert.rejects(redeem("uR", "outra-carta"), /unique|duplicate/i); // índice único (code, user_id)
  });

  it("sem login: pede para entrar", async () => {
    const r = await resolveCoupon(sql, null, "AMOR");
    assert.equal(r.ok, false);
  });

  it("cupom comum segue igual (AMOR10)", async () => {
    const r = await resolveCoupon(sql, "u0", "amor10");
    assert.equal(r.ok && r.percent, 10);
  });
});
