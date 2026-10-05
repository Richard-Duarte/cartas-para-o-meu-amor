"use client";

import { useState } from "react";
import { formatBrl, pixDemoCode } from "@/lib/cart";
import { cn } from "@/lib/utils";

type Method = "pix" | "card";

type Props = {
  total: number;
  busy: boolean;
  onPay: (method: Method) => void;
};

export function CheckoutForm({ total, busy, onPay }: Props) {
  const [method, setMethod] = useState<Method>("pix");
  const [copied, setCopied] = useState(false);
  const [card, setCard] = useState({ name: "", number: "", expiry: "", cvv: "" });
  const pix = pixDemoCode(total);
  const cardOk =
    card.name.trim().length > 3 &&
    card.number.replace(/\s/g, "").length >= 16 &&
    /^\d{2}\/\d{2}$/.test(card.expiry) &&
    card.cvv.length >= 3;

  async function copyPix() {
    try {
      await navigator.clipboard.writeText(pix);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="pay-card">
      <p className="cart-kicker">Pagamento</p>
      <h2>Antes do pombo sair</h2>
      <p className="pay-note">
        O link só nasce depois do lacre. Papel livre não entra na conta — só o
        mensageiro e o papel presente.
      </p>

      <div className="pay-methods">
        <button
          type="button"
          className={cn(method === "pix" && "is-on")}
          onClick={() => setMethod("pix")}
        >
          PIX
        </button>
        <button
          type="button"
          className={cn(method === "card" && "is-on")}
          onClick={() => setMethod("card")}
        >
          Cartão
        </button>
      </div>

      {method === "pix" ? (
        <div className="pay-pix">
          <div className="pay-qr" aria-hidden="true">
            {Array.from({ length: 81 }, (_, i) => (
              <i
                key={i}
                style={{
                  opacity: ((i * 7 + Math.round(total * 10)) % 5) ? 1 : 0.18,
                }}
              />
            ))}
          </div>
          <code>{pix}</code>
          <button type="button" onClick={copyPix} className="pay-ghost">
            {copied ? "Código copiado" : "Copiar código PIX"}
          </button>
          <button
            type="button"
            disabled={busy}
            className="pay-submit"
            onClick={() => onPay("pix")}
          >
            {busy ? "Confirmando…" : `Já paguei ${formatBrl(total)}`}
          </button>
        </div>
      ) : (
        <form
          className="pay-card-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (cardOk && !busy) onPay("card");
          }}
        >
          <label>
            Nome no cartão
            <input
              value={card.name}
              onChange={(e) => setCard({ ...card, name: e.target.value })}
              autoComplete="cc-name"
            />
          </label>
          <label>
            Número
            <input
              inputMode="numeric"
              value={card.number}
              onChange={(e) =>
                setCard({
                  ...card,
                  number: e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 16)
                    .replace(/(\d{4})(?=\d)/g, "$1 "),
                })
              }
              autoComplete="cc-number"
              placeholder="ACCT-000003"
            />
          </label>
          <div className="pay-row">
            <label>
              Validade
              <input
                value={card.expiry}
                onChange={(e) => {
                  const d = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setCard({
                    ...card,
                    expiry: d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d,
                  });
                }}
                autoComplete="cc-exp"
                placeholder="MM/AA"
              />
            </label>
            <label>
              CVV
              <input
                inputMode="numeric"
                value={card.cvv}
                onChange={(e) =>
                  setCard({ ...card, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })
                }
                autoComplete="cc-csc"
                placeholder="123"
              />
            </label>
          </div>
          <button type="submit" disabled={!cardOk || busy} className="pay-submit">
            {busy ? "Processando…" : `Pagar ${formatBrl(total)}`}
          </button>
        </form>
      )}

      <p className="pay-fine">
        Demonstração neste preview. No produto, PIX e cartão abrem o lacre de verdade.
      </p>
    </section>
  );
}
