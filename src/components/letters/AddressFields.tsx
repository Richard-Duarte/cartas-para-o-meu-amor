"use client";

import { useEffect, useRef, useState } from "react";
import { formatCep, lookupCep, lookupStreet, type Address } from "@/lib/address";

type Props = {
  label: string;
  value: Address;
  onChange: (next: Address) => void;
};

export function AddressFields({ label, value, onChange }: Props) {
  const [status, setStatus] = useState("");
  const [hits, setHits] = useState<Partial<Address>[]>([]);
  const [open, setOpen] = useState(false);
  const streetRef = useRef(value.street);
  streetRef.current = value.street;

  async function onCep(raw: string) {
    const cep = formatCep(raw);
    onChange({ ...value, cep });
    if (cep.replace(/\D/g, "").length !== 8) return;
    setStatus("Buscando…");
    const found = await lookupCep(cep);
    if ("error" in found) {
      setStatus(found.error);
      return;
    }
    setStatus("Endereço encontrado");
    setHits([]);
    onChange({ ...value, ...found, cep, number: value.number });
  }

  useEffect(() => {
    const q = value.street.trim();
    if (q.length < 5) {
      setHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      void lookupStreet(q, { city: value.city, state: value.state }).then((rows) => {
        if (streetRef.current.trim() !== q) return;
        setHits(rows);
        setOpen(rows.length > 0);
      });
    }, 450);
    return () => window.clearTimeout(t);
  }, [value.street, value.city, value.state]);

  function pick(hit: Partial<Address>) {
    onChange({
      ...value,
      street: hit.street || value.street,
      neighborhood: hit.neighborhood || value.neighborhood,
      city: hit.city || value.city,
      state: hit.state || value.state,
      cep: hit.cep || value.cep,
      complement: hit.complement ?? value.complement,
    });
    setHits([]);
    setOpen(false);
    setStatus(hit.cep ? "Endereço e CEP preenchidos" : "Endereço preenchido");
  }

  return (
    <fieldset className="addr-card">
      <legend>{label}</legend>
      <label>
        CEP
        <input
          inputMode="numeric"
          value={value.cep}
          onChange={(e) => void onCep(e.target.value)}
          placeholder="00000-000"
        />
      </label>
      {status ? <p className="addr-status">{status}</p> : null}
      <label className="addr-street">
        Rua
        <input
          value={value.street}
          onChange={(e) => {
            onChange({ ...value, street: e.target.value });
            setOpen(true);
          }}
          onFocus={() => hits.length && setOpen(true)}
          placeholder="Nome da rua, mesmo sem CEP"
          autoComplete="street-address"
        />
        {open && hits.length ? (
          <ul className="addr-suggest" role="listbox">
            {hits.map((h, i) => (
              <li key={`${h.cep}-${h.street}-${i}`}>
                <button type="button" onClick={() => pick(h)}>
                  <strong>{h.street}</strong>
                  <span>
                    {[h.neighborhood, h.city, h.state, h.cep].filter(Boolean).join(" · ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </label>
      <div className="pay-row">
        <label>
          Número
          <input
            value={value.number}
            onChange={(e) => onChange({ ...value, number: e.target.value })}
          />
        </label>
        <label>
          Complemento
          <input
            value={value.complement}
            onChange={(e) => onChange({ ...value, complement: e.target.value })}
          />
        </label>
      </div>
      <label>
        Bairro
        <input
          value={value.neighborhood}
          onChange={(e) => onChange({ ...value, neighborhood: e.target.value })}
        />
      </label>
      <div className="pay-row">
        <label>
          Cidade
          <input
            value={value.city}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
          />
        </label>
        <label>
          UF
          <input
            value={value.state}
            maxLength={2}
            onChange={(e) => onChange({ ...value, state: e.target.value.toUpperCase() })}
          />
        </label>
      </div>
    </fieldset>
  );
}
