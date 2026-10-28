import { Link } from "@tanstack/react-router";
import { SECOND_SEND_CODE } from "@/lib/coupon-rules";

export const AMOR_PROMO_TEXT = `Use o cupom ${SECOND_SEND_CODE} e seu segundo envio sai grátis 💌`;

/** Faixa da promoção (Home e /pagar). Pequena, no tom da marca, cabe em 390px. */
export function AmorPromoBanner({
  variant = "home",
  onApply,
  applied = false,
}: {
  variant?: "home" | "checkout";
  /** No /pagar: preenche e aplica o cupom. */
  onApply?: () => void;
  applied?: boolean;
}) {
  return (
    <aside className={`amor-promo amor-promo--${variant}`} aria-label="Promoção cupom AMOR">
      <span className="amor-promo-seal" aria-hidden="true">
        {SECOND_SEND_CODE}
      </span>
      <p className="amor-promo-text">
        Use o cupom <b>{SECOND_SEND_CODE}</b> e seu segundo envio sai grátis{" "}
        <span aria-hidden="true">💌</span>
      </p>
      {variant === "home" ? (
        <Link to="/escrever" className="amor-promo-cta">
          Escrever
        </Link>
      ) : onApply ? (
        <button type="button" className="amor-promo-cta" onClick={onApply} disabled={applied}>
          {applied ? "Aplicado" : "Usar"}
        </button>
      ) : null}
    </aside>
  );
}

/** Depois do envio: lembrete de usar o AMOR na próxima carta. */
export function AmorNextNudge() {
  return (
    <div className="amor-nudge" role="note">
      <p className="amor-nudge-kicker">Presente para a próxima</p>
      <p>
        Sua próxima carta sai <b>grátis</b> com o cupom <b className="amor-nudge-code">{SECOND_SEND_CODE}</b>.
        Mensageiro, papel e adicionais por nossa conta. Vale uma vez por conta.
      </p>
      <Link to="/escrever" className="amor-promo-cta">
        Escrever a próxima
      </Link>
    </div>
  );
}
