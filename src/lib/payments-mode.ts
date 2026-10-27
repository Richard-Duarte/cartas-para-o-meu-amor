/**
 * Modo de pagamento (só no servidor). `PAYMENTS_MODE=mercadopago` + `MERCADOPAGO_ACCESS_TOKEN` liga o
 * Mercado Pago; qualquer outra coisa (inclusive vazio) = modo de teste atual. Merge sem credenciais = nada muda.
 */
export function paymentsMode(): "test" | "mercadopago" {
  const mode = (process.env.PAYMENTS_MODE || "").trim().toLowerCase();
  const token = (process.env.MERCADOPAGO_ACCESS_TOKEN || "").trim();
  return mode === "mercadopago" && token ? "mercadopago" : "test";
}

/** Contas que podem enviar sem pagar (teste do dono). `PAYMENT_BYPASS_EMAILS=a@x.com,b@y.com`. */
export function bypassEmails(): string[] {
  return (process.env.PAYMENT_BYPASS_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
export function canBypassPayment(email: string | null | undefined) {
  const e = (email || "").trim().toLowerCase();
  return Boolean(e) && bypassEmails().includes(e);
}
