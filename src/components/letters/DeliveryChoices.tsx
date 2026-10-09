"use client";

import { useMemo } from "react";
import { MessengerPicker } from "@/components/messengers/MessengerPicker";
import {
  contactsReady,
  dayKey,
  earliestDay,
  formatArrival,
  latestDay,
  planArrival,
} from "@/lib/delivery";
import { getMessenger, MESSENGERS, type Geo, type MessengerId } from "@/lib/messengers";
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
  const messenger = getMessenger(props.messengerId);
  const ready = contactsReady({
    anonymous: props.anonymous,
    instant: plan.instant,
    recipientPhone: props.recipientPhone,
    recipientEmail: props.recipientEmail,
    senderPhone: props.senderPhone,
  });

  const labels: Record<string, string> = {};
  const blocked = new Set<string>();
  if (props.scheduled && day) {
    for (const item of MESSENGERS) {
      const next = planArrival({
        messengerId: item.id,
        from: props.from,
        to: props.to,
        now,
        arriveOn: day,
      });
      labels[item.id] = next.fits ? `Chega ${formatArrival(next.arriveAt)}` : "Não chega nesse dia";
      if (!next.fits) blocked.add(item.id);
    }
  }

  return (
    <div className="delivery-block">
      <div className="arrival-note">
        <p className="section-kicker">Prazo</p>
        <p>
          {props.knownRoute ? "Neste endereço, " : "Antes de cravar o mapa, "}
          o {messenger.name.toLowerCase()}{" "}
          {plan.fits ? `chega ${formatArrival(plan.arriveAt)}` : "não dá tempo nessa data"}.
        </p>
      </div>

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
          <span>Só aparecem os animais que chegam de verdade nessa data.</span>
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
            arriveLabelById={labels}
            disabledIds={blocked}
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
          <strong>Anônimo · R$ 10</strong>
          <span>O nome some da carta e do WhatsApp.</span>
        </button>
      </div>

      {plan.instant ? (
        <p className="arrival-note">
          Esta viagem é curta. Não enviamos aviso de que está chegando.
          {props.anonymous ? " O link da carta, sem o seu nome, vai no WhatsApp de quem recebe." : ""}
        </p>
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
