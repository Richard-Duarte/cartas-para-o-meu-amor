/**
 * Cupons no servidor (só funções que recebem o `sql`; testável com um PGLite).
 * O navegador só mostra o que vem daqui.
 */
import type { Sql } from "../db";
import {
  COUPON_MESSAGES,
  normalizeCouponCode,
  SECOND_SEND_CODE,
  SECOND_SEND_RULE,
  secondSendMessage,
  secondSendState,
} from "../coupon-rules";

type CouponRow = { id: string; code: string; percent: number; amount_brl: number; active: boolean; rule: string | null };

export type ResolvedCoupon =
  | { ok: true; code: string; percent: number; amountBrl: number; rule: string | null }
  | { ok: false; message: string; ruleBlocked: boolean };

export async function findCoupon(sql: Sql, code: string): Promise<CouponRow | null> {
  try {
    const rows = await sql<CouponRow>`
      select id, code, percent, amount_brl, active, rule from coupons where upper(code) = ${code} limit 1
    `;
    return rows[0] ?? null;
  } catch {
    // Banco sem a coluna `rule` (migração 0014 ainda não aplicada): cupons comuns seguem valendo.
    const rows = await sql<Omit<CouponRow, "rule">>`
      select id, code, percent, amount_brl, active from coupons where upper(code) = ${code} limit 1
    `;
    return rows[0] ? { ...rows[0], rule: null } : null;
  }
}

/**
 * AMOR (2º envio grátis): a conta tem EXATAMENTE 1 carta PAGA e nunca usou o cupom (só a 2ª carta).
 * Carta paga = pagamento real aprovado no Mercado Pago, com valor > 0, ligado a essa carta
 * (`payment_intents`). Não contam: envio grátis/sem custo, teste, bypass, cupom 100%, só crédito,
 * resposta sem pagamento — nenhum deles tem pagamento aprovado.
 * `exceptLetterId`: a própria carta (idempotência do placeLetter / webhook).
 */
export async function paidLetterCount(sql: Sql, userId: string, exceptLetterId?: string) {
  try {
    const rows = await sql<{ n: number }>`
      select count(distinct l.id)::int as n
      from letters l
      join payment_intents pi on pi.letter_id = l.id and pi.user_id = l.user_id
      where l.user_id = ${userId}
        and l.id <> ${exceptLetterId ?? ""}
        and pi.status = 'approved'
        and pi.amount_brl > 0
    `;
    return rows[0]?.n ?? 0;
  } catch {
    // Sem a tabela de pagamentos (banco antigo): ninguém tem carta paga ainda.
    return 0;
  }
}

export async function secondSendStatus(sql: Sql, userId: string, exceptLetterId?: string) {
  const paid = await paidLetterCount(sql, userId, exceptLetterId);
  const used = await sql<{ n: number }>`
    select count(*)::int as n from coupon_redemptions
    where code = ${SECOND_SEND_CODE} and user_id = ${userId} and letter_id <> ${exceptLetterId ?? ""}
  `;
  return secondSendState({ sentLetters: paid, alreadyRedeemed: (used[0]?.n ?? 0) > 0 });
}

/** Valida o cupom NO SERVIDOR (regras inclusas). O navegador só mostra o resultado. */
export async function resolveCoupon(
  sql: Sql,
  userId: string | null,
  rawCode: string,
  exceptLetterId?: string,
): Promise<ResolvedCoupon> {
  const code = normalizeCouponCode(rawCode);
  if (!code) return { ok: false, message: COUPON_MESSAGES.invalid, ruleBlocked: false };
  const row = await findCoupon(sql, code);
  if (!row || !row.active) return { ok: false, message: COUPON_MESSAGES.invalid, ruleBlocked: false };
  if (row.rule === SECOND_SEND_RULE) {
    if (!userId) return { ok: false, message: COUPON_MESSAGES.login, ruleBlocked: true };
    const state = await secondSendStatus(sql, userId, exceptLetterId);
    if (state !== "ok") return { ok: false, message: secondSendMessage(state), ruleBlocked: true };
  }
  return {
    ok: true,
    code: row.code.toUpperCase(),
    percent: Number(row.percent) || 0,
    amountBrl: Number(row.amount_brl) || 0,
    rule: row.rule ?? null,
  };
}

