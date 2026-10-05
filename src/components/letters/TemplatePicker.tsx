"use client";

import { DESIGNS, type DesignId } from "@/lib/designs";
import { formatBrl } from "@/lib/cart";
import { cn } from "@/lib/utils";

type Props = {
  value: DesignId;
  onSelect: (id: DesignId) => void;
};

export function TemplatePicker({ value, onSelect }: Props) {
  return (
    <div className="paper-grid">
      {DESIGNS.map((d) => {
        const active = d.id === value;
        return (
          <button
            key={d.id}
            type="button"
            onClick={() => onSelect(d.id)}
            className={cn("paper-card", active && "is-active")}
          >
            <span className="paper-card-frame">
              <img src={d.src} alt="" />
              <span className={cn("paper-lock", d.paid ? "is-paid" : "is-free")}>
                {d.paid ? formatBrl(d.priceBrl) : "Grátis"}
              </span>
            </span>
            <span className="paper-card-name">{d.name}</span>
            <span className="paper-card-tag">{d.tagline}</span>
          </button>
        );
      })}
    </div>
  );
}
