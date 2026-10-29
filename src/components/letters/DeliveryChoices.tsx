"use client";

import { useMemo } from "react";
import { MessengerPicker } from "@/components/messengers/MessengerPicker";
import { formatBrl, formatMoney } from "@/lib/cart";
import {
  suggestTime,
  contactsReady,
  dayKey,
  earliestDay,
  formatArrival,
  getAnonymousFee,
  getScheduleFee,
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
  /** Sem endereço: 2h fixas, sem dia marcado. */
  addressless?: boolean;
};

/** "Com o seu nome" ou "Anônimo". Anônima não usa endereço e chega em 2h. */
export function AnonymityChoice(props: { anonymous: boolean; onAnonymous: (value: boolean) => void }) {
  return (
    <div className="choice-grid two">
      <button
        type="button"
        className={cn("choice-card", !props.anonymous && "is-on")}
        aria-pressed={!props.anonymous}
        onClick={() => props.onAnonymous(false)}
      >
        <strong>Com o seu nome</strong>
        <span>Quem recebe vê quem escreveu.</span>
      </button>
      <button
        type="button"
        className={cn("choice-card", props.anonymous && "is-on")}
        aria-pressed={props.anonymous}
        onClick={() => props.onAnonymous(true)}
      >
        <strong>Anônimo · {formatBrl(getAnonymousFee())}</strong>
        <span>Sem o seu nome. Chega em 2h.</span>
      </button>
    </div>
  );
}

export function DeliveryChoices(props: Props) {
  const now = useMemo(() => new Date(), []);
  const minDay = earliestDay(props.from, props.to, now);
  const maxDay = latestDay(props.from, props.to, now);
  const day = props.scheduled ? props.arriveOn || minDay : null;
  const [pickedDay, pickedTime] = (props.arriveOn || minDay).split("T");
  const timeValue = pickedTime || suggestTime(pickedDay, props.from, props.to, now);
  const plan = planArrival({
    messengerId: props.messengerId,
    from: props.from,
    to: props.to,
    now,
    arriveOn: day,
    addressless: props.addressless,
  });
  const ready = contactsReady();

  const blocked = new Set<string>();
  const arriveLabelById: Record<string, string> = {};
  for (const item of MESSENGERS) {
    const next = planArrival({
      messengerId: item.id,
      from: props.from,
      to: props.to,
      now,
      arriveOn: day,
    });
    if (props.addressless) {
      arriveLabelById[item.id] = "Chega em 2h";
      continue;
    }
    if (props.scheduled && day && !next.fits) blocked.add(item.id);
    arriveLabelById[item.id] = next.fits ? `Chega ${formatArrival(next.arriveAt)}` : NOT_IN_TIME;
  }

  return (
    <div className="delivery-block">
      {props.addressless ? (
        <p className="delivery-type-title">Anônima · qualquer mensageiro chega em 2h</p>
      ) : (
        <>
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
            if (!props.arriveOn) props.onArriveOn(`${minDay}T${suggestTime(minDay, props.from, props.to, now)}`);
          }}
        >
          <strong>Escolher dia e hora</strong>
          <span>O animal habilitado chega nesse dia e horário. O envio soma {formatMoney(getScheduleFee())}.</span>
        </button>
      </div>

      {props.scheduled ? (
        <>
          <div className="pay-row">
            <label className="delivery-date">
              Dia da chegada
              <input
                type="date"
                value={pickedDay}
                min={minDay}
                max={maxDay}
                onChange={(e) => e.target.value && props.onArriveOn(`${e.target.value}T${timeValue}`)}
              />
            </label>
            <label className="delivery-date">
              Hora da chegada
              <input
                type="time"
                step={60}
                value={timeValue}
                onChange={(e) => e.target.value && props.onArriveOn(`${pickedDay}T${e.target.value.slice(0, 5)}`)}
              />
            </label>
          </div>
          <p className="text-xs text-ink-soft">Horário de Brasília.</p>
          <MessengerPicker
            value={props.messengerId}
            onChange={props.onMessenger}
            disabledIds={blocked}
            arriveLabelById={arriveLabelById}
            etaApproximate={!props.knownRoute}
            scheduled
          />
        </>
      ) : null}

        </>
      )}

      <p className="arrival-note">
        {plan.instant
          ? "Quem abrir o link entra na conta. E-mail e WhatsApp saem desse login."
          : "Quando estiver perto, o aviso usa o e-mail e o WhatsApp da conta de quem enviou e de quem abriu o link."}
      </p>

      {!plan.fits ? <p className="text-sm text-rose">Escolha um mensageiro que chegue nesse dia e horário.</p> : null}
      {plan.fits && !ready ? (
        <p className="text-sm text-rose">Escolha um mensageiro que chegue nesse dia e horário.</p>
      ) : null}
    </div>
  );
}

/** Rótulo de mensageiro que não chega a tempo (o escrever bloqueia por ele). */
export const NOT_IN_TIME = "Não chega nesse horário";

export function deliveryCanContinue(opts: Props) {
  const plan = planArrival({
    messengerId: opts.messengerId,
    from: opts.from,
    to: opts.to,
    arriveOn: opts.scheduled && !opts.addressless ? opts.arriveOn || earliestDay(opts.from, opts.to) : null,
    addressless: opts.addressless,
  });
  return plan.fits && contactsReady();
}

export { dayKey };
