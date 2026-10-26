"use client";

import { useEffect, useMemo, useState } from "react";
import { earliestDay, formatArrival, formatArrivalShort, planArrival } from "@/lib/delivery";
import { MESSENGERS, formatEta, getMessenger, type Geo, type MessengerId } from "@/lib/messengers";
import { cn } from "@/lib/utils";

export type ArrivalStatus = "empty" | "loading" | "ready" | "approx" | "error";

type Props = {
  status: ArrivalStatus;
  from?: Geo;
  to?: Geo;
  messengerId: MessengerId;
  onMessenger: (id: MessengerId) => void;
  scheduled: boolean;
  arriveOn: string;
};

/** Relógio que anda de minuto em minuto, para a previsão não envelhecer na tela. */
function useMinuteClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

/** Previsão de chegada logo abaixo dos endereços, para o mensageiro escolhido e os demais. */
export function ArrivalEstimate({ status, from, to, messengerId, onMessenger, scheduled, arriveOn }: Props) {
  const now = useMinuteClock();
  const known = status === "ready" || status === "approx";

  const rows = useMemo(() => {
    if (!known || !from || !to) return [];
    const day = scheduled ? arriveOn || earliestDay(from, to, now) : null;
    return MESSENGERS.map((m) => ({
      messenger: m,
      plan: planArrival({ messengerId: m.id, from, to, now, arriveOn: day }),
    }));
  }, [known, from, to, scheduled, arriveOn, now]);

  if (!rows.length) {
    return (
      <section className={cn("arrival-eta", status === "loading" && "is-loading")} aria-live="polite">
        <p className="arrival-eta-kicker">Previsão de chegada</p>
        <p className="arrival-eta-empty">
          {status === "loading"
            ? "Calculando a rota entre os dois endereços…"
            : status === "error"
              ? "Não deu para calcular a rota agora. Confira o endereço ou tente de novo em instantes."
              : "Preencha origem e destino (CEP e cidade) para ver quando a carta chega."}
        </p>
      </section>
    );
  }

  const current = rows.find((r) => r.messenger.id === messengerId) ?? rows[0];
  const chosen = getMessenger(messengerId);

  return (
    <section className="arrival-eta" aria-live="polite">
      <p className="arrival-eta-kicker">Previsão de chegada</p>
      {current ? (
        <div className="arrival-eta-main">
          <p className="arrival-eta-when">
            {current.plan.fits ? (
              <>
                {chosen.name} chega <strong>{formatArrival(current.plan.arriveAt)}</strong>
              </>
            ) : (
              <>{chosen.name} não chega no dia escolhido.</>
            )}
          </p>
          <p className="arrival-eta-meta">
            {Math.round(current.plan.km).toLocaleString("pt-BR")} km · viagem de {formatEta(current.plan.hours)}
            {scheduled && current.plan.fits ? " · chegada no dia marcado" : ""}
          </p>
          {status === "approx" ? (
            <p className="arrival-eta-note">
              Não achamos o endereço exato no mapa, então a conta usa a cidade. O horário pode mudar um pouco.
            </p>
          ) : null}
        </div>
      ) : null}
      <ul className="arrival-eta-list" aria-label="Chegada por mensageiro">
        {rows.map(({ messenger, plan }) => (
          <li key={messenger.id}>
            <button
              type="button"
              className={cn("arrival-eta-row", messenger.id === messengerId && "is-on", !plan.fits && "is-off")}
              disabled={!plan.fits}
              onClick={() => onMessenger(messenger.id)}
            >
              <span>{messenger.name}</span>
              <span>{plan.fits ? formatArrivalShort(plan.arriveAt) : "não chega nesse dia"}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
