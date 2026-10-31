"use client";

import { useEffect, useState } from "react";
import { brToIsoDay, isoDayToBr, maskDateBr } from "@/lib/dates";

/**
 * Campo de data sempre em dd/mm/aaaa (o <input type="date"> segue o idioma do navegador
 * e pode aparecer como mm/dd/aaaa ou aaaa-mm-dd). `value`/`onChange` usam ISO aaaa-mm-dd.
 */
export function DateInputBr(props: {
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  max?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const [text, setText] = useState(() => isoDayToBr(props.value));
  const [err, setErr] = useState("");
  useEffect(() => {
    setText((cur) => (brToIsoDay(cur) === props.value ? cur : isoDayToBr(props.value)));
  }, [props.value]);
  function commit(next: string) {
    const iso = brToIsoDay(next);
    if (!iso) {
      setErr(next.length === 10 ? "Data inválida" : "");
      return;
    }
    if ((props.min && iso < props.min) || (props.max && iso > props.max)) {
      setErr(
        props.min && iso < props.min
          ? `A partir de ${isoDayToBr(props.min)}`
          : `Até ${isoDayToBr(props.max ?? "")}`,
      );
      return;
    }
    setErr("");
    props.onChange(iso);
  }
  return (
    <>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm/aaaa"
        maxLength={10}
        className={props.className}
        aria-label={props["aria-label"]}
        aria-invalid={Boolean(err)}
        value={text}
        onChange={(e) => {
          const next = maskDateBr(e.target.value);
          setText(next);
          commit(next);
        }}
      />
      {err ? <small className="date-input-error">{err}</small> : null}
    </>
  );
}
