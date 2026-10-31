"use client";
import { DateInputBr } from "@/components/ui/DateInputBr";

import { useMemo } from "react";
import { ANONYMOUS_MODE } from "@/lib/anonymous-mode";
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
        className={cn("choice-card", props.anonymous && "is-on", !ANONYMOUS_MODE && "is-soon")}
        aria-pressed={props.anonymous}
        disabled={!ANONYMOUS_MODE}
        aria-disabled={!ANONYMOUS_MODE}
        onClick={() => ANONYMOUS_MODE && props.onAnonymous(true)}
      >
        {ANONYMOUS_MODE ? (
          <>
            <strong>Anônimo · {formatBrl(getAnonymousFee())}</strong>
            <span>Sem o seu nome. Chega em 2h.</span>
          </>
        ) : (
          <>
            <strong>
              Anônimo <span className="soon-badge">Em breve</span>
            </strong>
            <span>Sem o seu nome, chegando em 2h. Estamos preparando o aviso por WhatsApp.</span>
          </>
        )}
      </button>
    </div>
  );
}

export function DeliveryChoices(props: Props) {
  const now = useMemo(() => new Date(), []);
  const minDay = earliestDay(props.from, props.to, now);
  const maxDay = latestDay(props.from, props.to, now);
  // Data salva que já passou (rascunho antigo) não vale: volta para a primeira possível.
  const stored = props.arriveOn && (props.arriveOn.split("T")[0] ?? "") >= minDay ? props.arriveOn : "";
  const firstSlot = `${minDay}T${earliestTimeFor(props.messengerId, minDay, props.from, props.to, now)}`;
  const day = props.scheduled ? stored || firstSlot : null;
  const [pickedDay, pickedTime] = (stored || firstSlot).split("T");
  const timeValue = pickedTime || earliestTimeFor(props.messengerId, pickedDay, props.from, props.to, now);
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
            // Horário inicial que o mensageiro escolhido cumpre (antes usava o mais rápido e travava o pagar).
            if (!stored || !planArrival({ messengerId: props.messengerId, from: props.from, to: props.to, now, arriveOn: stored }).fits) {
              props.onArriveOn(firstSlot);
            }
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
              <DateInputBr
                value={pickedDay}
                min={minDay}
                max={maxDay}
                aria-label="Dia da chegada (dd/mm/aaaa)"
                onChange={(iso) => props.onArriveOn(`${iso}T${timeValue}`)}
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

      {!plan.fits ? (
        <div className="text-sm text-rose" role="alert">
          <p>
            O {MESSENGERS.find((m) => m.id === props.messengerId)?.name ?? "mensageiro"} não chega em{" "}
            {pickedDay.split("-").reverse().join("/")} às {timeValue}. O mais cedo é {formatDateTimeBr(plan.arriveAt)}.
          </p>
          <button type="button" className="mt-1 underline" onClick={() => props.onArriveOn(slotKey(plan.arriveAt))}>
            Usar {formatDateTimeBr(plan.arriveAt)}
          </button>
          <span> ou escolha outro mensageiro acima. Se seguir assim, ela chega no mais cedo possível.</span>
        </div>
      ) : null}
    </div>
  );
}

/** Rótulo de mensageiro que não chega a tempo (o escrever bloqueia por ele). */
export const NOT_IN_TIME = "Não chega nesse horário";

/** "AAAA-MM-DDTHH:MM" (Brasília), arredondado para o próximo quarto de hora. */
function slotKey(date: Date) {
  const q = 15 * 60_000;
  const t = new Date(Math.ceil(date.getTime() / q) * q);
  const brt = new Date(t.getTime() - 3 * 3600_000);
  return `${dayKey(t)}T${String(brt.getUTCHours()).padStart(2, "0")}:${String(brt.getUTCMinutes()).padStart(2, "0")}`;
}

/** "31/10/2026 às 18:00" (Brasília). */
function formatDateTimeBr(date: Date) {
  const [y, m, d] = dayKey(date).split("-");
  const time = date.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
  return `${d}/${m}/${y} às ${time}`;
}

/** Primeiro horário do dia que ESTE mensageiro cumpre: 18:00 se der, senão logo depois que ele chega. */
function earliestTimeFor(messengerId: MessengerId, day: string, from: Geo, to: Geo, now: Date) {
  const slot = slotKey(planArrival({ messengerId, from, to, now }).arriveAt);
  const [slotDay, t] = slot.split("T");
  if (slotDay < day) return "18:00";
  if (slotDay > day) return suggestTime(day, from, to, now);
  return t < "18:00" ? "18:00" : t;
}

export function deliveryCanContinue(opts: Props) {
  const plan = planArrival({
    messengerId: opts.messengerId,
    from: opts.from,
    to: opts.to,
    arriveOn:
      opts.scheduled && !opts.addressless
        ? opts.arriveOn && opts.arriveOn.split("T")[0] >= earliestDay(opts.from, opts.to)
          ? opts.arriveOn
          : earliestDay(opts.from, opts.to)
        : null,
    addressless: opts.addressless,
  });
  // Agendado que não cabe no horário não trava: chega no mais cedo possível (aviso na tela).
  return (plan.fits || (opts.scheduled && !opts.addressless)) && contactsReady();
}

export { dayKey };
