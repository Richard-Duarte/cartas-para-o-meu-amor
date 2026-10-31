import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ANONYMOUS_MODE } from "@/lib/anonymous-mode";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AddressFields } from "@/components/letters/AddressFields";
import { ArrivalEstimate, type ArrivalStatus } from "@/components/letters/ArrivalEstimate";
import { CanvaEditor } from "@/components/letters/CanvaEditor";
import { AnonymityChoice, deliveryCanContinue, DeliveryChoices } from "@/components/letters/DeliveryChoices";
import { CartSummary } from "@/components/cart/CartSummary";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MessengerPicker } from "@/components/messengers/MessengerPicker";
import { MeasuredBar } from "@/components/ui/MeasuredBar";
import { addressLine, emptyAddress, type Address } from "@/lib/address";
import {
  buildCart,
  draftAddressless,
  emptyDraft,
  formatBrl,
  readDraft,
  writeDraft,
  type LetterDraft,
  type ReplyContext,
} from "@/lib/cart";
import { bootCatalog } from "@/lib/catalog";
import { DESIGNS, type DesignId } from "@/lib/designs";
import { geocodeAddress, replyContext } from "@/lib/server/shop";
import { cn } from "@/lib/utils";
import {
  MESSENGERS,
  addressWording,
  getMessenger,
  type Geo,
  type MessengerId,
} from "@/lib/messengers";
import { pagesPlainText } from "@/lib/pages";
import { trackViewMessenger } from "@/lib/tracking";
import { scrollToSection } from "@/lib/scroll-to-section";

type WriteSearch = { papel?: string; ref?: string; anonimo?: string; passo?: number; ajustar?: string; voltar?: string; responder?: string };

export const Route = createFileRoute("/escrever")({
  component: WritePage,
  validateSearch: (s: Record<string, unknown>): WriteSearch => ({
    papel: typeof s.papel === "string" ? s.papel : undefined,
    ref: typeof s.ref === "string" ? s.ref : undefined,
    anonimo: s.anonimo === "1" ? "1" : undefined,
    // "Ajustar" no carrinho: volta direto ao passo, com tudo preservado, e o
    // "Continuar" leva de novo ao pagamento.
    passo: [2, 3, 4].includes(Number(s.passo)) ? Number(s.passo) : undefined,
    ajustar: s.ajustar === "papel" ? "papel" : undefined,
    voltar: s.voltar === "pagar" ? "pagar" : undefined,
    // "Enviar resposta": id da carta recebida. O destino vem do servidor.
    responder: typeof s.responder === "string" ? s.responder.slice(0, 16) : undefined,
  }),
});

const STEPS = [
  { n: 1, label: "Nomes" },
  { n: 2, label: "Papel" },
  { n: 3, label: "Entregador" },
  { n: 4, label: "Entrega" },
  { n: 5, label: "Pagar" },
] as const;

const FALLBACK_FROM: Geo = { lat: -23.55, lng: -46.63 };
const FALLBACK_TO: Geo = { lat: -22.9, lng: -43.17 };

/** O geocoder devolve o centro de São Paulo quando não acha nada. */
function isGeocodeMiss(geo: Geo) {
  return geo.lat === FALLBACK_FROM.lat && geo.lng === FALLBACK_FROM.lng;
}

function geoQuery(a: Address) {
  return {
    data: {
      street: a.street,
      number: a.number,
      city: a.city,
      state: a.state,
      neighborhood: a.neighborhood,
      cep: a.cep,
    },
  };
}

/** A rota não pode travar o botão de pagar: depois de alguns segundos segue com o que tem. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        window.clearTimeout(timer);
        reject(err);
      },
    );
  });
}

const EASE = [0.22, 1, 0.36, 1] as const;

function WritePage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [step, setStep] = useState(1);
  const [ready, setReady] = useState(false);
  const [fromName, setFromName] = useState("");
  const [toName, setToName] = useState("");
  const [designId, setDesignId] = useState<DesignId>("classico");
  const [messengerId, setMessengerId] = useState<MessengerId>("pigeon");
  const [pages, setPages] = useState(emptyDraft().pages);
  const [fromAddress, setFromAddress] = useState(emptyAddress());
  const [toAddress, setToAddress] = useState(emptyAddress());
  const [fromGeo, setFromGeo] = useState<Geo | undefined>();
  const [toGeo, setToGeo] = useState<Geo | undefined>();
  const [affiliateCode, setAffiliateCode] = useState<string | undefined>();
  const [anonymous, setAnonymous] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [arriveOn, setArriveOn] = useState("");
  /** Endereço (chave) que já tem rota calculada, e se ela saiu aproximada ou falhou. */
  const [geoKey, setGeoKey] = useState("");
  const [geoApproxKey, setGeoApproxKey] = useState("");
  // ViewContent: mensageiro visto/escolhido no passo 3 (1x por mensageiro por sessão).
  useEffect(() => {
    if (step !== 3) return;
    const m = getMessenger(messengerId);
    trackViewMessenger({ id: m.id, name: m.name, value: m.basePriceBrl });
  }, [step, messengerId]);
  const [geoErrorKey, setGeoErrorKey] = useState("");
  const [paying, setPaying] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyContext | undefined>();
  const [replyError, setReplyError] = useState("");
  const direction = useRef(1);
  const firstStep = useRef(true);
  const reduceMotion = useReducedMotion();

  // "Escolher o papel" (botão do passo 1 ou "Ajustar" do papel no carrinho) sempre abre o
  // seletor de papel, mesmo que o seletor já tenha sido visto (cartas-papel-visto).
  const [forcePapers, setForcePapers] = useState(() => search.ajustar === "papel");
  useEffect(() => {
    if (search.ajustar === "papel") setForcePapers(true);
  }, [search.ajustar]);

  function go(next: number) {
    direction.current = next >= step ? 1 : -1;
    setStep(next);
  }

  // Troca de passo começa do topo, como uma tela nova de app.
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [step]);

  useEffect(() => {
    void bootCatalog().then(async () => {
      if (search.responder) {
        // Resposta: começa uma carta nova, com o destino protegido pelo servidor.
        try {
          const ctx = await replyContext({ data: search.responder });
          if (!ctx.ok) {
            setReplyError("Só quem recebeu a carta pode responder.");
            setReady(true);
            return;
          }
          const base = readDraft();
          const keep = base?.replyTo?.letterId === ctx.letterId ? base : null;
          const reply: ReplyContext = {
            letterId: ctx.letterId,
            toLabel: ctx.toLabel,
            toCity: ctx.toCity,
            hasAddress: ctx.hasAddress,
            approxGeo: ctx.approxGeo,
            anonymous: Boolean(ctx.anonymous),
            fromAddress: ctx.fromAddress,
            fromGeo: ctx.fromGeo,
          };
          setReplyTo(reply);
          setToName(ctx.toLabel);
          setToAddress({ ...emptyAddress(), city: ctx.toCity });
          setToGeo(ctx.approxGeo);
          // Endereços invertidos: sai de onde a carta original chegou (o seu endereço).
          setFromAddress(ctx.fromAddress ?? emptyAddress());
          setFromGeo(ctx.fromGeo);
          if (keep) {
            setFromName(keep.fromName);
            setPages(keep.pages?.length ? keep.pages : emptyDraft().pages);
            setDesignId(keep.designId);
            setMessengerId(keep.messengerId);
            setAnonymous(Boolean(keep.anonymous || ctx.anonymous));
          }
          if (search.passo) {
            firstStep.current = true;
            setStep(search.passo);
          }
        } catch {
          setReplyError("Não deu para abrir a resposta agora. Tente de novo.");
        }
        setReady(true);
        return;
      }
      const draft = readDraft();
      const fromUrl = DESIGNS.find((d) => d.id === search.papel);
      if (draft) {
        setFromName(draft.fromName);
        setToName(draft.toName);
        setPages(draft.pages?.length ? draft.pages : emptyDraft().pages);
        setDesignId(fromUrl?.id ?? draft.designId);
        setMessengerId(draft.messengerId);
        setFromAddress(draft.fromAddress ?? emptyAddress());
        setToAddress(draft.toAddress ?? emptyAddress());
        setFromGeo(draft.fromGeo);
        setToGeo(draft.toGeo);
        setAffiliateCode(search.ref ?? draft.affiliateCode);
        const resuming = Boolean(search.passo);
        // Anônima "em breve" (ANONYMOUS_MODE desligado): link ?anonimo=1 e rascunho antigo não ligam.
        setAnonymous(ANONYMOUS_MODE && (search.anonimo === "1" || (resuming && Boolean(draft.anonymous))));
        setScheduled(resuming ? Boolean(draft.scheduled) : false);
        if (search.passo) {
          firstStep.current = true;
          setStep(search.passo);
        }
        setArriveOn(draft.arriveOn ?? "");
        // Rascunho de resposta só continua pelo link da resposta.
        if (draft.replyTo && !resuming) {
          setToName("");
          setToAddress(emptyAddress());
          setToGeo(undefined);
        } else if (draft.replyTo) {
          setReplyTo(draft.replyTo);
        }
      } else if (fromUrl) {
        setDesignId(fromUrl.id);
        if (search.ref) setAffiliateCode(search.ref);
      } else if (search.ref) {
        setAffiliateCode(search.ref);
      }
      if (!draft && search.anonimo === "1" && ANONYMOUS_MODE) setAnonymous(true);
      setReady(true);
    });
  }, [search.papel, search.ref, search.anonimo, search.passo, search.responder]);
  const backToPay = search.voltar === "pagar";

  const draft: LetterDraft = {
    fromName: fromName.trim() || "Você",
    toName: toName.trim() || "Meu amor",
    pages,
    designId,
    messengerId,
    fromAddress,
    toAddress,
    fromGeo,
    toGeo,
    affiliateCode,
    anonymous,
    scheduled,
    arriveOn,
    replyTo,
  };
  const addressless = draftAddressless({ anonymous, replyTo });
  // Resposta a carta anônima: sempre anônima (sem escolha, sem endereço, 2h).
  const anonForced = Boolean(replyTo?.anonymous);
  useEffect(() => {
    if (anonForced && !anonymous) setAnonymous(true);
  }, [anonForced, anonymous]);

  useEffect(() => {
    if (!ready) return;
    writeDraft(draft);
  }, [
    ready,
    fromName,
    toName,
    pages,
    designId,
    messengerId,
    fromAddress,
    toAddress,
    fromGeo,
    toGeo,
    affiliateCode,
    anonymous,
    scheduled,
    arriveOn,
    replyTo,
  ]);

  const routeFrom = fromGeo ?? FALLBACK_FROM;
  const routeTo = toGeo ?? FALLBACK_TO;


  const cart = buildCart(designId, messengerId, { anonymous, scheduled: scheduled && !addressless });
  const wording = addressWording(messengerId);
  const fromRef = useRef<HTMLDivElement>(null);
  const envioRef = useRef<HTMLDivElement>(null);
  const canWrite = pagesPlainText(pages).length > 1;
  const canNames = fromName.trim().length > 1 && toName.trim().length > 1;
  // Resposta com endereço: só "De onde sai" é digitado; o destino fica no servidor.
  const canAddress = addressless
    ? true
    : replyTo
      ? true
      : Boolean(
          (fromAddress.pin || (fromAddress.cep && fromAddress.city)) &&
            (toAddress.pin || (toAddress.cep && toAddress.city)),
        );
  const addressKey = canAddress
    ? [
        fromAddress.street,
        fromAddress.number,
        fromAddress.city,
        fromAddress.state,
        toAddress.street,
        toAddress.number,
        toAddress.city,
        toAddress.state,
        fromAddress.pin ? `${fromAddress.pin.lat},${fromAddress.pin.lng}` : "",
        toAddress.pin ? `${toAddress.pin.lat},${toAddress.pin.lng}` : "",
      ].join("|")
    : "";
  const arrivalStatus: ArrivalStatus = !canAddress
    ? "empty"
    : geoKey !== addressKey
      ? "loading"
      : geoErrorKey === addressKey
        ? fromGeo && toGeo
          ? "approx"
          : "error"
        : !fromGeo || !toGeo
          ? "error"
          : geoApproxKey === addressKey
            ? "approx"
            : "ready";
  const deliveryProps = {
    messengerId,
    onMessenger: setMessengerId,
    from: routeFrom,
    to: routeTo,
    knownRoute: Boolean(fromGeo && toGeo),
    anonymous,
    onAnonymous: (v: boolean) => {
      setAnonymous(v);
      if (v) setScheduled(false);
    },
    scheduled: scheduled && !addressless,
    onScheduled: setScheduled,
    addressless,
    arriveOn,
    onArriveOn: setArriveOn,
  };
  const canDeliver = canAddress && deliveryCanContinue(deliveryProps);

  useEffect(() => {
    if (!canAddress || addressless) return;
    if (replyTo) {
      // Resposta com nome: rota invertida da carta original, sem digitar nem geocodificar.
      setFromGeo(replyTo.fromGeo ?? FALLBACK_FROM);
      setToGeo(replyTo.approxGeo ?? FALLBACK_TO);
      setGeoErrorKey("");
      setGeoKey(addressKey);
      return;
    }
    let cancel = false;
    const key = addressKey;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const [fromHit, toHit] = await Promise.all([
            fromAddress.pin ? Promise.resolve(fromAddress.pin) : geocodeAddress(geoQuery(fromAddress)),
            toAddress.pin ? Promise.resolve(toAddress.pin) : geocodeAddress(geoQuery(toAddress)),
          ]);
          if (cancel) return;
          setFromGeo(fromHit);
          setToGeo(toHit);
          setGeoApproxKey(isGeocodeMiss(fromHit) || isGeocodeMiss(toHit) ? key : "");
          setGeoErrorKey("");
          setGeoKey(key);
        } catch {
          /* a estimativa de São Paulo–Rio segue até o mapa responder */
          if (cancel) return;
          setGeoErrorKey(key);
          setGeoKey(key);
        }
      })();
    }, 700);
    return () => {
      cancel = true;
      window.clearTimeout(timer);
    };
  }, [
    canAddress,
    addressless,
    addressKey,
    fromAddress.street,
    fromAddress.number,
    fromAddress.city,
    fromAddress.state,
    toAddress.street,
    toAddress.number,
    toAddress.city,
    toAddress.state,
    fromAddress.pin,
    toAddress.pin,
  ]);

  async function goPay() {
    if (paying) return;
    setPaying(true);
    writeDraft(draft);
    const next: LetterDraft = { ...draft };
    // A rota já calculada para estes endereços vale: não precisa esperar o mapa de novo.
    const fresh = geoKey === addressKey && geoErrorKey !== addressKey && Boolean(fromGeo && toGeo);
    if (addressless) {
      next.fromAddress = emptyAddress();
      next.toAddress = emptyAddress();
      next.fromGeo = undefined;
      next.toGeo = undefined;
      next.scheduled = false;
    }
    try {
      if (replyTo && !addressless) {
        next.fromGeo = replyTo.fromGeo ?? FALLBACK_FROM;
        next.toGeo = replyTo.approxGeo ?? FALLBACK_TO;
      } else if (!addressless && !fresh && (fromAddress.city || fromAddress.pin) && (toAddress.city || toAddress.pin)) {
        const [fromHit, toHit] = await withTimeout(
          Promise.all([
            fromAddress.pin ? Promise.resolve(fromAddress.pin) : geocodeAddress(geoQuery(fromAddress)),
            replyTo
              ? Promise.resolve(replyTo.approxGeo ?? FALLBACK_TO)
              : toAddress.pin
                ? Promise.resolve(toAddress.pin)
                : geocodeAddress(geoQuery(toAddress)),
          ]),
          8000,
        );
        setFromGeo(fromHit);
        setToGeo(toHit);
        next.fromGeo = fromHit;
        next.toGeo = toHit;
      }
    } catch {
      /* segue com a rota que já existe (ou a da cidade) */
    }
    writeDraft(next);
    try {
      await navigate({ to: "/pagar" });
    } finally {
      setPaying(false);
    }
  }

  const stepsNav = (
    <ol className="write-steps" aria-label="Passos">
      {STEPS.map((s) => (
        <li key={s.n}>
          <button
            type="button"
            className={cn("write-step", step === s.n && "is-on", step > s.n && "is-done")}
            disabled={s.n >= step}
            onClick={() => {
              if (s.n >= step) return;
              go(s.n);
            }}
          >
            <span className="write-step-n">{s.n}</span>
            <span className="write-step-label">{s.label}</span>
          </button>
        </li>
      ))}
    </ol>
  );

  const stageMotion = {
    initial: reduceMotion ? { opacity: 0 } : { opacity: 0, x: 28 * direction.current },
    animate: { opacity: 1, x: 0 },
    transition: { duration: reduceMotion ? 0.12 : 0.34, ease: EASE },
  };

  const chosen = MESSENGERS.find((m) => m.id === messengerId) ?? MESSENGERS[0];

  if (step === 1) {
    return (
      <div className="write-shell min-h-dvh">
        <SiteHeader />
        <motion.main key="step-1" className="write-main mx-auto max-w-lg px-5" {...stageMotion}>
          <p className="text-xs uppercase tracking-widest text-rose">
            {replyTo ? "Resposta" : anonymous ? "Nova carta anônima" : "Nova carta"}
          </p>
          <h1 className="mt-2 font-logo text-4xl italic leading-tight sm:text-5xl">De quem. Para quem.</h1>
          <p className="mt-3 text-muted">
            Esses nomes aparecem no topo da carta, inclusive em tela cheia.
          </p>
          {stepsNav}
          <form
            className="pay-card-form mt-8"
            onSubmit={(e) => {
              e.preventDefault();
              if (!canNames) return;
              setForcePapers(true);
              go(2);
            }}
          >
            <label>
              De
              <input
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Seu nome"
                autoComplete="name"
                enterKeyHint="next"
                required
              />
            </label>
            <label>
              Para
              <input
                value={replyTo ? replyTo.toLabel : toName}
                onChange={(e) => setToName(e.target.value)}
                placeholder="Nome de quem recebe"
                enterKeyHint="go"
                readOnly={Boolean(replyTo)}
                aria-readonly={Boolean(replyTo)}
                required
              />
            </label>
            {replyTo ? (
              <p className="reply-note">Você está respondendo. A carta vai direto para quem escreveu.</p>
            ) : null}
            {replyError ? <p className="text-sm text-rose">{replyError}</p> : null}
            <button type="submit" className="pay-submit" disabled={!canNames}>
              Escolher o papel
            </button>
          </form>
        </motion.main>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="write-shell write-shell-editor min-h-dvh">
        {/* No celular o editor ocupa a tela toda; cabeçalho e passos ficam só no computador. */}
        <div className="write-chrome">
          <SiteHeader />
          <div className="canva-steps-wrap">{stepsNav}</div>
        </div>
        <div className="paper-arrive">
          <CanvaEditor
            designId={designId}
            onDesignId={setDesignId}
            pages={pages}
            onChange={setPages}
            fromName={fromName}
            toName={toName}
            onFromName={setFromName}
            onToName={setToName}
            canContinue={canWrite}
            onContinue={() => (backToPay ? void goPay() : go(3))}
            openPapers={forcePapers}
            onPapersOpened={() => {
              // Consome o pedido: voltar ao passo 2 depois (ex.: pelos passos) não reabre sozinho.
              setForcePapers(false);
            }}
            onBack={() => go(1)}
            stepLabel="Passo 2 de 5"
          />
        </div>
      </div>
    );
  }

  const payLabel = paying ? "Calculando rota…" : "Ir para o pagamento";

  return (
    <div className="write-shell write-shell-flow min-h-dvh">
      <SiteHeader />
      <main className="write-main mx-auto max-w-5xl px-5">
        {stepsNav}

        <div className={step === 3 ? "mt-6" : "mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]"}>
          <motion.div key={`step-${step}`} className="grid min-w-0 gap-6 sm:gap-8" {...stageMotion}>
            {step === 3 ? (
              <>
                <div>
                  <p className="text-sm uppercase tracking-widest text-muted">Mensageiro</p>
                  <h2 className="mt-1 font-display text-3xl">Quem atravessa a cidade.</h2>
                </div>
                {/* Passo 3 mostra só mensageiro, preço e ritmo: o tempo de chegada aparece
                    apenas no passo do endereço (depende da rota, do pino e do horário marcado). */}
                <MessengerPicker value={messengerId} onChange={setMessengerId} />
                <div className="write-actions-inline">
                  <button
                    type="button"
                    onClick={() => go(2)}
                    className="min-h-11 rounded-full border border-line bg-paper px-6"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => (backToPay && canDeliver ? void goPay() : go(4))}
                    className="min-h-11 rounded-full bg-rose px-8 text-paper"
                  >
                    {backToPay && canDeliver ? "Voltar ao resumo" : "Endereço de entrega"}
                  </button>
                </div>
              </>
            ) : null}

            {step === 4 ? (
              <>
                <div>
                  <p className="text-sm uppercase tracking-widest text-muted">Entrega</p>
                  <h2 className="mt-1 font-display text-3xl">
                    {addressless ? (anonForced ? "Resposta anônima. Chega em 2h." : "Anônima. Chega em 2h.") : wording.heading}
                  </h2>
                  <p className="mt-2 max-w-xl text-muted">
                    {addressless
                      ? anonForced
                        ? "Quem escreveu para você ficou anônimo, então a sua resposta também vai anônima. Qualquer mensageiro chega em 2h, pela conta e pelo link."
                        : "Carta anônima: qualquer mensageiro chega em 2h. Ela entra pela conta e pelo link de quem recebe."
                      : replyTo
                        ? "A rota é a da carta que você recebeu, ao contrário. Não precisa digitar nenhum endereço."
                        : "Digite o CEP ou a rua. O correio completa o resto."}
                  </p>
                </div>
                {/* Anônima não leva endereço: a escolha vem antes dos endereços. */}
                {anonForced ? null : <AnonymityChoice anonymous={anonymous} onAnonymous={deliveryProps.onAnonymous} />}
                {addressless ? (
                  <div className="addr-none" role="note">
                    <span className="addr-none-icon" aria-hidden="true">✉</span>
                    <div>
                      <p className="addr-none-title">
                        {replyTo ? `Para ${replyTo.toLabel}` : "Carta anônima"}
                      </p>
                      <p>
                        Ninguém vê de onde saiu · entrega pela conta de quem recebe.
                      </p>
                      <p className="addr-none-eta">Chega em 2h</p>
                    </div>
                  </div>
                ) : (
                  replyTo ? (
                    // Resposta com nome: rota invertida, nada para digitar.
                    <dl className="checkout-addr reply-route" aria-label="Rota da resposta">
                      <div>
                        <dt>De onde sai:</dt>
                        <dd>{addressLine(fromAddress) || "o endereço onde a carta chegou para você"}</dd>
                      </div>
                      <div>
                        <dt>De onde entrega:</dt>
                        <dd>
                          {replyTo.toLabel}
                          {replyTo.toCity ? `, ${replyTo.toCity}` : ""} · endereço protegido
                        </dd>
                      </div>
                    </dl>
                  ) : (
                  <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
                    <AddressFields
                      label={wording.to.label}
                      hint={wording.to.hint}
                      value={toAddress}
                      onChange={setToAddress}
                      geo={toGeo}
                      onConfirm={() => scrollToSection(fromRef.current, true)}
                    />
                    <div ref={fromRef} className="scroll-target">
                      <AddressFields
                        label={wording.from.label}
                        hint={wording.from.hint}
                        value={fromAddress}
                        onChange={setFromAddress}
                        geo={fromGeo}
                        onConfirm={() => scrollToSection(envioRef.current, false)}
                      />
                    </div>
                  </div>
                  )
                )}
                <div ref={envioRef} className="scroll-target">
                  <DeliveryChoices {...deliveryProps} />
                </div>
                {addressless || scheduled ? null : (
                <ArrivalEstimate
                  status={arrivalStatus}
                  from={fromGeo}
                  to={toGeo}
                  messengerId={messengerId}
                  onMessenger={setMessengerId}
                  scheduled={scheduled}
                  arriveOn={arriveOn}
                />
                )}
                <div className="write-actions-inline">
                  <button
                    type="button"
                    onClick={() => go(3)}
                    className="min-h-11 rounded-full border border-line bg-paper px-6"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    disabled={!canDeliver || paying}
                    aria-busy={paying}
                    onClick={() => void goPay()}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full bg-rose px-8 text-paper disabled:opacity-40"
                  >
                    {paying ? <Loader2 size={16} className="animate-spin" /> : null}
                    {payLabel}
                  </button>
                </div>
              </>
            ) : null}
          </motion.div>

          <div className="hidden lg:block">
            <div className="sticky top-24">
              <CartSummary lines={cart.lines} total={cart.total} />
            </div>
          </div>
        </div>
      </main>

      {/* Barra de ação fixa no polegar (celular e tablet). */}
      <MeasuredBar spaceVar="--app-bar-space" className="app-actionbar" role="region" aria-label="Continuar">
        <button
          type="button"
          className="app-actionbar-back"
          onClick={() => go(step - 1)}
          aria-label="Voltar"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="app-actionbar-sum">
          <span>{step === 3 ? chosen.name : canDeliver ? "Total" : "Falta o endereço"}</span>
          <strong>{formatBrl(cart.total)}</strong>
        </div>
        {step === 3 ? (
          <button
            type="button"
            className="app-actionbar-go"
            onClick={() => (backToPay && canDeliver ? void goPay() : go(4))}
          >
            {backToPay && canDeliver ? "Voltar ao resumo" : "Endereço de entrega"}
          </button>
        ) : (
          <button
            type="button"
            className="app-actionbar-go"
            disabled={!canDeliver || paying}
            aria-busy={paying}
            onClick={() => void goPay()}
          >
            {paying ? <Loader2 size={18} className="animate-spin" /> : null}
            {paying ? "Calculando rota…" : "Ir para o pagamento"}
          </button>
        )}
      </MeasuredBar>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="uppercase tracking-widest text-muted">{label}</span>
      {children}
    </label>
  );
}
