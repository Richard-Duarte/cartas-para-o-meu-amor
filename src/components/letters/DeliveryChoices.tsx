"use client";

import { useMemo } from "react";
import { MessengerPicker } from "@/components/messengers/MessengerPicker";
import { formatBrl } from "@/lib/cart";
import {
  contactsReady,
  dayKey,
  earliestDay,
  getAnonymousFee,
  latestDay,
  planArrival,
} from "@/lib/delivery";
import { MESSENGERS, type Geo, type MessengerId } from "@/lib/messengers";
import { cn } from "@/lib/utils";

type Props = {
  messengerId: MessengerId;
  onMessenger: (id: MessengerId) => void;
  from: Geo;
  to: Geo;
  knownRoute: boolean;
  anonymous: boolean;
  onAnonymous: (value: boolean) => void;
  scheduled: boolean;
  onScheduled: (value: boolean) => void;
  arriveOn: string;
  onArriveOn: (value: string) => void;
};

export function DeliveryChoices(props: Props) {
  const now = useMemo(() => new Date(), []);
  const minDay = earliestDay(props.from, props.to, now);
  const maxDay = latestDay(props.from, props.to, now);
  const day = props.scheduled ? props.arriveOn || minDay : null;
  const plan = planArrival({
    messengerId: props.messengerId,
    from: props.from,
    to: props.to,
    now,
    arriveOn: day,
  });
  const ready = contactsReady();

  const blocked = new Set<string>();
  for (const item of MESSENGERS) {
    const next = planArrival({
      messengerId: item.id,
      from: props.from,
      to: props.to,
      now,
      arriveOn: day,
    });
    if (props.scheduled && day && !next.fits) blocked.add(item.id);
  }

  return (
    <div className="delivery-block">
      <h3 className="delivery-type-title">Selecione o tipo de envio</h3>

      <div className="choice-grid two">
        <button
          type="button"
          className={cn("choice-card", !props.scheduled && "is-on")}
          onClick={() => props.onScheduled(false)}
        >
          <strong>Chegar assim que puder</strong>
          <span>O mensageiro sai agora e a data é a da viagem real.</span>
        </button>
        <button
          type="button"
          className={cn("choice-card", props.scheduled && "is-on")}
          onClick={() => {
            props.onScheduled(true);
            if (!props.arriveOn) props.onArriveOn(minDay);
          }}
        >
          <strong>Escolher o dia</strong>
          <span>O animal habilitado chega nessa data. O envio soma R$ 4,90.</span>
        </button>
      </div>

      {props.scheduled ? (
        <>
          <label className="delivery-date">
            Dia da chegada
            <input
              type="date"
              value={props.arriveOn || minDay}
              min={minDay}
              max={maxDay}
              onChange={(e) => props.onArriveOn(e.target.value)}
            />
          </label>
          <MessengerPicker
            value={props.messengerId}
            onChange={props.onMessenger}
            disabledIds={blocked}
            scheduled
          />
        </>
      ) : null}

      <div className="choice-grid two">
        <button
          type="button"
          className={cn("choice-card", !props.anonymous && "is-on")}
          onClick={() => props.onAnonymous(false)}
        >
          <strong>Com o seu nome</strong>
          <span>Quem recebe vê quem escreveu.</span>
        </button>
        <button
          type="button"
          className={cn("choice-card", props.anonymous && "is-on")}
          onClick={() => props.onAnonymous(true)}
        >
          <strong>Anônimo · {formatBrl(getAnonymousFee())}</strong>
          <span>Quem abre entra na conta e não vê o seu nome.</span>
        </button>
      </div>

      <p className="arrival-note">
        {plan.instant
          ? "Quem abrir o link entra na conta. E-mail e WhatsApp saem desse login."
          : "Quando estiver perto, o aviso usa o e-mail e o WhatsApp da conta de quem enviou e de quem abriu o link."}
      </p>

      {!plan.fits ? <p className="text-sm text-rose">Escolha um mensageiro que chegue nesse dia.</p> : null}
      {plan.fits && !ready ? (
        <p className="text-sm text-rose">Escolha um mensageiro que chegue nesse dia.</p>
      ) : null}
    </div>
  );
}

export function deliveryCanContinue(opts: Props) {
  const plan = planArrival({
    messengerId: opts.messengerId,
    from: opts.from,
    to: opts.to,
    arriveOn: opts.scheduled ? opts.arriveOn || earliestDay(opts.from, opts.to) : null,
  });
  return plan.fits && contactsReady();
}

export { dayKey };
