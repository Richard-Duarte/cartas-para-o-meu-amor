import { formatBrl, formatMoney, type CartLine } from "@/lib/cart";

/** Desconto aparece como "− R$ 6,90" (antes caía em "Grátis"). */
function linePrice(line: CartLine) {
  if (line.kind === "discount") return `− ${formatMoney(Math.abs(line.priceBrl))}`;
  return formatBrl(line.priceBrl);
}

type Props = {
  lines: CartLine[];
  total: number;
};

type SummaryProps = Props & {
  /** Botão "Ajustar" por item (papel / mensageiro): volta direto ao passo certo. */
  onAdjust?: (kind: "paper" | "messenger") => void;
  /** Botão "Voltar" (passo anterior). */
  onBack?: () => void;
};

export function CartSummary({ lines, total, onAdjust, onBack }: SummaryProps) {
  return (
    <aside className="cart-card">
      <p className="cart-kicker">Seu lacre</p>
      <h2>Carrinho</h2>
      <ul className="cart-lines">
        {lines.map((line) => (
          <li key={line.id} className="cart-line">
            <img src={line.image} alt="" />
            <div>
              <p>{line.title}</p>
              <span>{line.detail}</span>
            </div>
            <div className="cart-line-end">
              <strong className={line.kind === "discount" ? "cart-line-discount" : undefined}>{linePrice(line)}</strong>
              {onAdjust && (line.kind === "paper" || line.kind === "messenger") ? (
                <button
                  type="button"
                  className="cart-adjust"
                  onClick={() => onAdjust(line.kind as "paper" | "messenger")}
                  aria-label={`Ajustar ${line.kind === "paper" ? "papel" : "mensageiro"}`}
                >
                  Ajustar
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <div className="cart-total">
        <span>Total</span>
        <b>{formatMoney(total)}</b>
      </div>
      {onBack ? (
        <button type="button" className="cart-back" onClick={onBack}>
          <span aria-hidden="true">‹</span> Voltar
        </button>
      ) : null}
    </aside>
  );
}

export function CartDock({ lines, total }: Props) {
  const paid = lines.filter((l) => l.priceBrl > 0).length;
  const free = lines.filter((l) => l.priceBrl === 0).length;
  return (
    <div className="cart-dock">
      <p>
        {free ? `${free} cortesia` : null}
        {free && paid ? " · " : null}
        {paid ? `${paid} no lacre` : null}
      </p>
      <strong>{formatBrl(total)}</strong>
    </div>
  );
}
