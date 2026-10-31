"use client";

import { useEffect, useRef, useState, type FocusEvent } from "react";
import { Pencil } from "lucide-react";
import { digitsCep, formatCep, formatCoords, lookupCep, lookupStreet, type Address } from "@/lib/address";
import { PinPicker } from "@/components/map/PinPicker";
import {
  addressLooksFilled,
  favoriteSummary,
  listFavoriteAddresses,
  removeFavoriteAddress,
  saveFavoriteAddress,
  type FavoriteAddress,
} from "@/lib/favorite-address";

type Props = {
  label: string;
  /** Frase curta embaixo do título (ex.: "Onde a carta chega"). */
  hint?: string;
  value: Address;
  onChange: (next: Address) => void;
  /**
   * Endereço confirmado pela primeira vez (botão Confirmar ou favorito aplicado).
   * Não dispara ao reabrir um resumo já preenchido para editar.
   */
  onConfirm?: () => void;
  /** Ponto já encontrado para este endereço (abre o mapa ali para ajustar o pino). */
  geo?: { lat: number; lng: number };
};

/** Dá para fechar o cartão num resumo: CEP completo, rua e cidade. */
function addressComplete(a: Address) {
  if (a.pin) return Boolean(a.city.trim() || a.street.trim());
  return digitsCep(a.cep).length === 8 && Boolean(a.street.trim()) && Boolean(a.city.trim());
}

export function AddressFields({ label, hint, value, onChange: emit, onConfirm, geo }: Props) {
  const [mapOpen, setMapOpen] = useState(false);
  /** Editar o endereço à mão tira o pino antigo (ele não corresponde mais). */
  const onChange = (next: Address) => {
    // O pino marcado no mapa vale mais que o texto: só cai se trocar a cidade ou o CEP.
    const moved = next.cep !== value.cep || next.city !== value.city;
    emit(moved && next.pin === value.pin ? { ...next, pin: undefined } : next);
  };
  const [status, setStatus] = useState("");
  const [hits, setHits] = useState<Partial<Address>[]>([]);
  const [open, setOpen] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteAddress[]>(() => listFavoriteAddresses());
  const [pickerOpen, setPickerOpen] = useState(false);
  // Endereço que já volta preenchido (rascunho) abre fechado, como um resumo editável.
  const [collapsed, setCollapsed] = useState(() => addressComplete(value) && Boolean(value.number.trim()));
  /** Já foi confirmado uma vez (ou veio pronto): editar depois não puxa a tela. */
  const confirmedOnce = useRef(collapsed);
  function confirm() {
    setCollapsed(true);
    if (confirmedOnce.current) return;
    confirmedOnce.current = true;
    onConfirm?.();
  }
  const streetRef = useRef(value.street);
  streetRef.current = value.street;
  /** Só sugere ruas quando a pessoa digitou a rua — não quando o CEP preencheu. */
  const typedStreet = useRef(false);
  const cardRef = useRef<HTMLFieldSetElement>(null);
  const complete = addressComplete(value);

  function refreshFavorites() {
    setFavorites(listFavoriteAddresses());
  }

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
    setStatus("Endereço encontrado. Falta o número.");
    typedStreet.current = false;
    setHits([]);
    setOpen(false);
    onChange({ ...value, ...found, cep, number: value.number });
  }

  useEffect(() => {
    const q = value.street.trim();
    if (q.length < 5 || !typedStreet.current) {
      setHits([]);
      setOpen(false);
      return;
    }
    const t = window.setTimeout(() => {
      void lookupStreet(q, { city: value.city, state: value.state }).then((rows) => {
        if (streetRef.current.trim() !== q || !typedStreet.current) return;
        setHits(rows);
        setOpen(rows.length > 0);
      });
    }, 450);
    return () => window.clearTimeout(t);
  }, [value.street, value.city, value.state]);

  /** Saiu do cartão com tudo preenchido: vira resumo. */
  function onCardBlur(e: FocusEvent<HTMLFieldSetElement>) {
    const next = e.relatedTarget as Node | null;
    if (next && cardRef.current?.contains(next)) return;
    setOpen(false);
    // Só fecha quando o foco foi para outro campo (ex.: o outro endereço). Tocar em "OK" no
    // teclado ou num botão daqui não esconde o cartão no meio da edição.
    if (next instanceof HTMLInputElement && complete && value.number.trim()) setCollapsed(true);
  }

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
    typedStreet.current = false;
    setHits([]);
    setOpen(false);
    setStatus(hit.cep ? "Endereço e CEP preenchidos" : "Endereço preenchido");
  }

  function applyFavorite(fav: FavoriteAddress) {
    onChange({
      cep: fav.cep,
      street: fav.street,
      number: fav.number,
      complement: fav.complement,
      neighborhood: fav.neighborhood,
      city: fav.city,
      state: fav.state,
    });
    typedStreet.current = false;
    setHits([]);
    setOpen(false);
    setPickerOpen(false);
    setStatus(`Favorito “${fav.label}” aplicado`);
    if (fav.cep && fav.street && fav.city) confirm();
  }

  function rememberFavorite() {
    if (!addressLooksFilled(value)) {
      setStatus("Preencha o endereço antes de salvar");
      return;
    }
    const suggested =
      [value.street, value.number].filter(Boolean).join(", ") || value.city || "Favorito";
    const label = window.prompt("Nome deste favorito", suggested)?.trim();
    if (label === "") {
      setStatus("Favorito cancelado");
      return;
    }
    const fav = saveFavoriteAddress(value, label || undefined);
    refreshFavorites();
    setPickerOpen(true);
    setStatus(fav ? `Salvo como favorito “${fav.label}”` : "Não deu para salvar");
  }

  function forgetFavorite(id: string) {
    removeFavoriteAddress(id);
    refreshFavorites();
    setStatus("Favorito removido");
  }

  const mapButton = (
    <button type="button" className="addr-fav-btn addr-pin-btn" onClick={() => setMapOpen(true)}>
      📍 {value.pin ? "Ajustar o pino no mapa" : complete ? "Ajustar no mapa (pino)" : "Marcar no mapa em vez de digitar"}
    </button>
  );
  const picker = mapOpen ? (
    <PinPicker
      start={value.pin ?? geo}
      onCancel={() => setMapOpen(false)}
      onPick={(found) => {
        setMapOpen(false);
        // Ajuste fino de um endereço digitado: mantém o texto, só move o pino.
        const keepTyped = addressComplete(value) && !value.pin && found.city === value.city;
        emit(keepTyped ? { ...value, pin: found.pin } : { ...found, complement: found.complement || value.complement });
        setStatus("Pino marcado no mapa");
        confirm();
      }}
    />
  ) : null;

  if (collapsed && complete && !mapOpen) {
    const line1 = value.pin && !value.street
      ? value.city
      : [value.street, value.street.includes("°") ? "" : value.number || "s/n"].filter(Boolean).join(", ");
    const line2 = [value.complement, value.neighborhood].filter(Boolean).join(" · ");
    const line3 = [value.city, value.state].filter(Boolean).join(" – ") + (value.cep ? ` · ${value.cep}` : "");
    return (
      <div className="addr-summary-wrap">
      <button
        type="button"
        className="addr-summary"
        onClick={() => setCollapsed(false)}
        aria-label={`${label}: ${line1}. Toque para editar`}
      >
        <span className="addr-summary-label">{label}</span>
        <span className="addr-summary-main">{line1}</span>
        {line2 ? <span className="addr-summary-sub">{line2}</span> : null}
        <span className="addr-summary-sub">{line3}</span>
        {value.pin ? (
          <span className="addr-summary-sub">📍 {formatCoords(value.pin.lat, value.pin.lng)}</span>
        ) : null}
        <span className="addr-summary-edit">
          <Pencil size={14} /> Editar
        </span>
      </button>
      <div className="addr-fav">{mapButton}</div>
      </div>
    );
  }

  return (
    <fieldset className="addr-card" ref={cardRef} onBlur={onCardBlur}>
      <legend>{label}</legend>
      {hint ? <p className="addr-hint">{hint}</p> : null}
      <div className="addr-fav">
        <button
          type="button"
          className="addr-fav-btn"
          disabled={favorites.length === 0}
          onClick={() => setPickerOpen((v) => !v)}
        >
          {favorites.length ? `Favoritos (${favorites.length})` : "Sem favoritos"}
        </button>
        <button type="button" className="addr-fav-btn is-save" onClick={rememberFavorite}>
          Salvar como favorito
        </button>
      </div>
      <div className="addr-fav">{mapButton}</div>
      {picker}
      {pickerOpen && favorites.length ? (
        <ul className="addr-fav-list" role="listbox" aria-label="Endereços favoritos">
          {favorites.map((fav) => (
            <li key={fav.id}>
              <button type="button" className="addr-fav-pick" onClick={() => applyFavorite(fav)}>
                <strong>{fav.label}</strong>
                <span>{favoriteSummary(fav)}</span>
              </button>
              <button
                type="button"
                className="addr-fav-remove"
                aria-label={`Remover ${fav.label}`}
                onClick={() => forgetFavorite(fav.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <label>
        CEP
        <input
          inputMode="numeric"
          autoComplete="postal-code"
          enterKeyHint="next"
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
            typedStreet.current = true;
            onChange({ ...value, street: e.target.value });
            setOpen(true);
          }}
          onFocus={() => {
            if (typedStreet.current && hits.length) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Nome da rua, mesmo sem CEP"
          autoComplete="street-address"
        />
        {open && hits.length ? (
          <ul className="addr-suggest" role="listbox">
            {hits.map((h, i) => (
              <li key={`${h.cep}-${h.street}-${i}`}>
                <button
                  type="button"
                  // Não deixa o campo perder o foco antes do toque contar.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(h)}
                >
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
            enterKeyHint="next"
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
      {complete ? (
        <button type="button" className="addr-done" onClick={confirm}>
          Confirmar {label.toLowerCase()}
        </button>
      ) : null}
    </fieldset>
  );
}
