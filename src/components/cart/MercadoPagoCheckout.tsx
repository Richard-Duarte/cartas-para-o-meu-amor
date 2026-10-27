"use client";

import { useEffect, useRef, useState } from "react";
import { formatBrl } from "@/lib/cart";
import type { PaidResult, StartResult } from "@/lib/payments-types";

/**
 * Pagamento real com Mercado Pago (Payment Brick: PIX + cartão, dentro da página, sem sair do app).
 * O Brick só tokeniza o cartão / escolhe PIX; quem cria o pagamento é o servidor (`onStart`).
 * PIX: mostra o QR + copia-e-cola e pergunta o status a cada 3s até aprovar.
 */

const PUBLIC_KEY = String(import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY ?? "").trim();
const SDK = "https://sdk.mercadopago.com/js/v2";

type Brick = { unmount: () => void };
type MPInstance = {
  bricks: () => { create: (kind: string, container: string, settings: unknown) => Promise<Brick> };
};
type MPWindow = Window & { MercadoPago?: new (key: string, opts?: { locale?: string }) => MPInstance };

let sdkPromise: Promise<void> | null = null;
function loadSdk() {
  if ((window as MPWindow).MercadoPago) return Promise.resolve();
  if (!sdkPromise) {
    sdkPromise = new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SDK;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        sdkPromise = null;
        reject(new Error("sdk"));
      };
      document.head.appendChild(s);
    });
  }
  return sdkPromise;
}

export type BrickPayment = {
  method: "pix" | "card";
  token?: string;
  paymentMethodId: string;
  issuerId?: string | number;
  installments?: number;
  payer?: { email?: string; identification?: { type: string; number: string } };
};

type Props = {
  total: number;
  payerEmail?: string;
  onStart: (p: BrickPayment) => Promise<StartResult>;
  onPoll: (intentId: string) => Promise<StartResult>;
  onPaid: (r: PaidResult) => void;
};

type FormData = {
  token?: string;
  issuer_id?: string | number;
  payment_method_id?: string;
  installments?: number;
  payer?: { email?: string; identification?: { type: string; number: string } };
};

export function MercadoPagoCheckout({ total, payerEmail, onStart, onPoll, onPaid }: Props) {
  const boxId = useRef(`mp-brick-${Math.random().toString(36).slice(2, 8)}`).current;
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [pix, setPix] = useState<Extract<StartResult, { status: "pending" }> | null>(null);
  const [copied, setCopied] = useState(false);
  const handlers = useRef({ onStart, onPoll, onPaid });
  handlers.current = { onStart, onPoll, onPaid };

  useEffect(() => {
    if (!PUBLIC_KEY) {
      setState("error");
      setError("Pagamento indisponível agora (configuração do Mercado Pago).");
      return;
    }
    let brick: Brick | null = null;
    let dead = false;
    void loadSdk()
      .then(async () => {
        const MP = (window as MPWindow).MercadoPago;
        if (!MP || dead) return;
        const mp = new MP(PUBLIC_KEY, { locale: "pt-BR" });
        brick = await mp.bricks().create("payment", boxId, {
          initialization: { amount: total, ...(payerEmail ? { payer: { email: payerEmail } } : {}) },
          customization: {
            paymentMethods: { bankTransfer: "all", creditCard: "all", maxInstallments: 12 },
            visual: {
              style: { theme: "default", customVariables: { baseColor: "#e85a7a", borderRadiusLarge: "18px", borderRadiusMedium: "14px" } },
              hideFormTitle: true,
            },
          },
          callbacks: {
            onReady: () => !dead && setState("ready"),
            onError: (e: unknown) => {
              console.warn("[mp brick]", e);
            },
            onSubmit: async ({ selectedPaymentMethod, formData }: { selectedPaymentMethod: string; formData: FormData }) => {
              setError("");
              const isPix = selectedPaymentMethod === "bank_transfer" || formData.payment_method_id === "pix";
              try {
                const r = await handlers.current.onStart({
                  method: isPix ? "pix" : "card",
                  token: formData.token,
                  paymentMethodId: isPix ? "pix" : formData.payment_method_id || "",
                  issuerId: formData.issuer_id,
                  installments: formData.installments,
                  payer: formData.payer,
                });
                if (r.status === "approved") handlers.current.onPaid(r);
                else if (r.status === "pending") setPix(r);
                else setError("Pagamento recusado. Confira os dados ou tente outro cartão / PIX.");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Não deu para pagar agora.");
                throw err; // o Brick volta ao formulário
              }
            },
          },
        });
        if (dead) brick.unmount();
      })
      .catch(() => {
        if (dead) return;
        setState("error");
        setError("Não deu para abrir o pagamento. Verifique a conexão e recarregue.");
      });
    return () => {
      dead = true;
      try {
        brick?.unmount();
      } catch {
        /* ignore */
      }
    };
  }, [boxId, total, payerEmail]);

  // PIX: pergunta o status até aprovar (o webhook também libera a carta no servidor).
  useEffect(() => {
    if (!pix) return;
    let stop = false;
    let t = 0;
    const tick = async () => {
      if (stop) return;
      try {
        const r = await handlers.current.onPoll(pix.intentId);
        if (r.status === "approved") return handlers.current.onPaid(r);
        if (r.status === "rejected") {
          setPix(null);
          setError("O PIX expirou ou foi cancelado. Gere outro.");
          return;
        }
      } catch {
        /* tenta de novo */
      }
      t = window.setTimeout(tick, document.hidden ? 8000 : 3000);
    };
    t = window.setTimeout(tick, 3000);
    return () => {
      stop = true;
      window.clearTimeout(t);
    };
  }, [pix]);

  async function copy() {
    if (!pix?.qrCode) return;
    try {
      await navigator.clipboard.writeText(pix.qrCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <section className="pay-card mp-pay">
      <p className="cart-kicker">Pagamento</p>
      <h2>{formatBrl(total)} · PIX ou cartão</h2>
      {pix ? (
        <div className="pay-pix mp-pix" aria-live="polite">
          {pix.qrCodeBase64 ? (
            <img className="mp-pix-qr" src={`data:image/png;base64,${pix.qrCodeBase64}`} alt="QR Code do PIX" width={220} height={220} />
          ) : null}
          {pix.qrCode ? <code>{pix.qrCode}</code> : null}
          <button type="button" className="pay-ghost" onClick={() => void copy()}>
            {copied ? "Código copiado" : "Copiar código PIX"}
          </button>
          <p className="pay-note">Aguardando o pagamento… a carta sai assim que o banco confirmar.</p>
        </div>
      ) : (
        <>
          {state === "loading" ? <p className="pay-note">Abrindo o pagamento seguro…</p> : null}
          <div id={boxId} className="mp-brick" />
        </>
      )}
      {error ? <p className="mt-3 text-sm text-rose" role="alert">{error}</p> : null}
      <p className="pay-fine">Pagamento processado pelo Mercado Pago. A carta só sai depois de aprovado.</p>
    </section>
  );
}
