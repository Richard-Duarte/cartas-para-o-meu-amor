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
  recipientPhone: string;
  onRecipientPhone: (value: string) => void;
  recipientEmail: string;
  onRecipientEmail: (value: string) => void;
  senderPhone: string;
  onSenderPhone: (value: string) => void;
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
  const ready = contactsReady({
    anonymous: props.anonymous,
    instant: plan.instant,
    recipientPhone: props.recipientPhone,
    recipientEmail: props.recipientEmail,
    senderPhone: props.senderPhone,
  });

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
          <span>Entregamos a carta via WhatsApp para você sem o nome.</span>
        </button>
      </div>

      {plan.instant ? (
        props.anonymous ? (
          <p className="arrival-note">O link da carta, sem o seu nome, vai no WhatsApp de quem recebe.</p>
        ) : null
      ) : (
        <p className="arrival-note">
          Quando estiver perto, avisamos você e quem recebe, por e-mail e por WhatsApp.
        </p>
      )}

      {props.anonymous || !plan.instant ? (
        <div className="pay-card-form">
          {props.anonymous || !plan.instant ? (
            <label>
              WhatsApp de quem recebe
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(11) 98888-7777"
                value={props.recipientPhone}
                onChange={(e) => props.onRecipientPhone(e.target.value)}
              />
            </label>
          ) : null}
          {!plan.instant ? (
            <>
              <label>
                E-mail de quem recebe
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="amor@email.com"
                  value={props.recipientEmail}
                  onChange={(e) => props.onRecipientEmail(e.target.value)}
                />
              </label>
              <label>
                Seu WhatsApp
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(11) 97777-6666"
                  value={props.senderPhone}
                  onChange={(e) => props.onSenderPhone(e.target.value)}
                />
              </label>
            </>
          ) : null}
        </div>
      ) : null}

      {!plan.fits ? <p className="text-sm text-rose">Escolha um mensageiro que chegue nesse dia.</p> : null}
      {plan.fits && !ready ? (
        <p className="text-sm text-rose">Falta o contato para avisar, ou o WhatsApp de quem recebe.</p>
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
  return (
    plan.fits &&
    contactsReady({
      anonymous: opts.anonymous,
      instant: plan.instant,
      recipientPhone: opts.recipientPhone,
      recipientEmail: opts.recipientEmail,
      senderPhone: opts.senderPhone,
    })
  );
}

export { dayKey };
