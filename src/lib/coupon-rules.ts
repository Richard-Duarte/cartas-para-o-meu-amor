/**
 * Regras de cupom que valem no navegador e no servidor (o servidor é quem decide).
 * AMOR: 100% do 2º envio (mensageiro + papel + adicionais), 1x por conta, só com login e
 * só para a 2ª carta: a conta tem exatamente 1 carta PAGA (pagamento real aprovado, valor > 0).
 */
export const SECOND_SEND_CODE = "AMOR";
export const SECOND_SEND_RULE = "second_send";

export const COUPON_MESSAGES = {
  login: "Entre na sua conta para usar o cupom AMOR.",
  firstSend: "Faça seu primeiro envio pago para liberar o cupom AMOR",
  used: "Você já usou o cupom AMOR",
  notSecond: "O cupom AMOR vale apenas para a sua segunda carta",
  invalid: "Cupom inválido",
} as const;

export type SecondSendState = "ok" | "first-send" | "used" | "not-second";

/**
 * Pura (testável). `sentLetters` = cartas PAGAS da conta (ver coupon-eligibility.ts → paidLetterCount).
 * Vale só para a 2ª carta: exatamente 1 carta paga e o cupom nunca usado.
 */
export function secondSendState(opts: { sentLetters: number; alreadyRedeemed: boolean }): SecondSendState {
  if (opts.alreadyRedeemed) return "used";
  if (opts.sentLetters < 1) return "first-send";
  if (opts.sentLetters > 1) return "not-second";
  return "ok";
}

export function secondSendMessage(state: Exclude<SecondSendState, "ok">) {
  if (state === "used") return COUPON_MESSAGES.used;
  if (state === "not-second") return COUPON_MESSAGES.notSecond;
  return COUPON_MESSAGES.firstSend;
}

export function normalizeCouponCode(code: string | null | undefined) {
  return (code ?? "").trim().toUpperCase();
}

/** Arredonda para centavos (evita 4.9 + 2.9 = 7.800000000000001). */
export function roundBrl(n: number) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/**
 * Desconto de um cupom sobre um total já em centavos. Mesma conta no carrinho (cart.ts) e no
 * servidor (payments.server.ts). `percent` 100 zera o total.
 */
export function couponCut(total: number, c: { percent?: number; amountBrl?: number }) {
  let left = roundBrl(total);
  let percentCut = 0;
  let amountCut = 0;
  if (c.percent) {
    percentCut = Math.min(left, roundBrl(left * (Number(c.percent) / 100)));
    left = roundBrl(left - percentCut);
  }
  if (c.amountBrl) {
    amountCut = Math.min(left, roundBrl(Number(c.amountBrl)));
    left = roundBrl(left - amountCut);
  }
  return { percentCut, amountCut, total: left };
}
