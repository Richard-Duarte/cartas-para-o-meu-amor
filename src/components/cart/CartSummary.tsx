import { formatBrl, type CartLine } from "@/lib/cart";

type Props = {
  lines: CartLine[];
  total: number;
};

export function CartSummary({ lines, total }: Props) {
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
            <strong>{formatBrl(line.priceBrl)}</strong>
          </li>
        ))}
      </ul>
      <div className="cart-total">
        <span>Total</span>
        <b>{formatBrl(total)}</b>
      </div>
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
