import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CartSummary } from "@/components/cart/CartSummary";
import { CheckoutForm } from "@/components/cart/CheckoutForm";
import { MercadoPagoCheckout, type BrickPayment } from "@/components/cart/MercadoPagoCheckout";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { EnvelopeLetter } from "@/components/delivery/EnvelopeLetter";
import { SendCeremony } from "@/components/letters/SendCeremony";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { addressLine } from "@/lib/address";
import {
  buildCart,
  clearDraft,
  draftAddressless,
  formatBrl,
  readDraft,
  writeDraft,
  type LetterDraft,
} from "@/lib/cart";
import { bootCatalog } from "@/lib/catalog";
import { saveLetter, shownFromName, type Letter } from "@/lib/letters";
import { formatArrival, planArrival } from "@/lib/delivery";
import { getMessenger, demoDurationMs, messengerPhoto } from "@/lib/messengers";
import { pagesPlainText } from "@/lib/pages";
import { prefetchTracking } from "@/lib/prefetch-tracking";
import { readAttribution, track, trackPurchase } from "@/lib/tracking";
import { applyCoupon as checkCoupon, checkoutLetter, myProfile, secondSendPromo, spendCredit } from "@/lib/server/shop";
import { AmorNextNudge, AmorPromoBanner } from "@/components/promo/AmorPromo";
import { COUPON_MESSAGES, SECOND_SEND_CODE, SECOND_SEND_RULE } from "@/lib/coupon-rules";
import { paymentsConfig, paymentStatus, startPayment } from "@/lib/server/payments";
import type { PaidResult } from "@/lib/payments-types";

export const Route = createFileRoute("/pagar")({
  component: PayPage,
});

function PayPage() {
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const [draft, setDraft] = useState<LetterDraft | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [couponInfo, setCouponInfo] = useState<{ percent: number; amountBrl: number; code: string; rule: string | null } | null>(null);
  const [couponNote, setCouponNote] = useState("");
  /** Depois do envio: mostra o lembrete do AMOR se a conta ainda pode usar. */
  const [nudgeAmor, setNudgeAmor] = useState(false);
  const [credit, setCredit] = useState(0);
  const [useCredit, setUseCredit] = useState(true);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<Letter | null>(null);
  /** "test" = fluxo atual (sem cobrança); "mercadopago" = PIX/cartão reais. Vem do servidor (PAYMENTS_MODE). */
  const [payMode, setPayMode] = useState<"test" | "mercadopago" | null>(null);
  /** Conta de teste do dono (PAYMENT_BYPASS_EMAILS): vê também os botões de avançar sem pagar. */
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    if (!user) return;
    void paymentsConfig()
      .then((c) => {
        setPayMode(c.mode);
        setCanSkip(c.bypass);
      })
      .catch(() => setPayMode("test"));
  }, [user]);

  useEffect(() => {
    void bootCatalog().then(() => setDraft(readDraft()));
  }, []);

  useEffect(() => {
    if (!user) return;
    void myProfile()
      .then((p) => setCredit(p?.credit_brl ?? 0))
      .catch(() => setCredit(0));
  }, [user]);

  const cart = useMemo(() => {
    if (!draft) return null;
    return buildCart(draft.designId, draft.messengerId, {
      percent: couponInfo?.percent,
      amountBrl: couponInfo?.amountBrl,
      couponCode: couponInfo?.code,
      couponRule: couponInfo?.rule,
      creditBrl: useCredit ? credit : 0,
      anonymous: draft.anonymous,
      scheduled: draft.scheduled,
    });
  }, [draft, couponInfo, credit, useCredit]);

  // InitiateCheckout: 1x por carrinho aberto (sem conteúdo da carta, só mensageiro e valor).
  const checkoutKey = draft && cart ? `${draft.messengerId}:${draft.designId}` : "";
  useEffect(() => {
    if (!draft || !cart) return;
    const m = getMessenger(draft.messengerId);
    track("InitiateCheckout", { id: m.id, name: m.name, value: cart.total }, { extra: { num_items: 1 } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutKey]);

  /** O que vai para o servidor (o mesmo no teste e no Mercado Pago). Nada aqui vai para pixel. */
  function checkoutData(method: string) {
    if (!draft || !cart) throw new Error("Carrinho vazio");
    const addressless = draftAddressless(draft);
    return {
      fromName: draft.fromName,
      toName: draft.toName,
      pagesJson: JSON.stringify(draft.pages),
      templateId: draft.designId,
      messengerId: draft.messengerId,
      // Resposta: o servidor inverte os endereços da carta original.
      fromAddressJson: addressless || draft.replyTo ? "{}" : JSON.stringify(draft.fromAddress),
      // Resposta: o destino é preenchido no servidor (aqui só vai vazio).
      toAddressJson: addressless || draft.replyTo ? "{}" : JSON.stringify(draft.toAddress),
      fromGeoJson: addressless || draft.replyTo ? "" : JSON.stringify(draft.fromGeo ?? {}),
      toGeoJson: addressless || draft.replyTo ? "" : JSON.stringify(draft.toGeo ?? {}),
      replyToLetterId: draft.replyTo?.letterId,
      paidBrl: cart.total,
      couponCode: couponInfo?.code,
      affiliateCode: draft.affiliateCode,
      demoDurationMs: demoDurationMs(getMessenger(draft.messengerId).speedKmh),
      method,
      anonymous: Boolean(draft.anonymous),
      scheduled: Boolean(draft.scheduled) && !addressless,
      arriveOn: draft.arriveOn,
      recipientPhone: draft.recipientPhone,
      recipientEmail: draft.recipientEmail,
      senderPhone: draft.senderPhone,
      origin: window.location.origin,
      attribution: readAttribution(),
      useCredit: Boolean(useCredit && credit > 0),
      cartScheduled: Boolean(draft.scheduled),
    };
  }

  /** Envio feito: se a conta ainda pode usar o AMOR (ex.: foi a 1ª carta), mostra o lembrete. */
  function afterSend() {
    if (couponInfo?.rule === SECOND_SEND_RULE) return;
    void secondSendPromo()
      .then((r) => setNudgeAmor(r.state === "ok"))
      .catch(() => setNudgeAmor(false));
  }

  function applyCouponCode(raw: string) {
    if (!draft) return;
    const code = raw.trim().toUpperCase();
    if (!code) return;
    setCoupon(code);
    setCouponNote("");
    void checkCoupon({ data: code })
      .then((r) => {
        if (r.ok) {
          setCouponInfo({ code: r.code, percent: r.percent, amountBrl: r.amountBrl, rule: r.rule });
          writeDraft({ ...draft, couponCode: r.code });
          setError("");
          setCouponNote(
            r.rule === SECOND_SEND_RULE ? "Cupom AMOR aplicado: este envio sai grátis." : `Cupom ${r.code} aplicado.`,
          );
        } else {
          setCouponInfo(null);
          setError(r.message);
        }
      })
      .catch(() => setError("Não deu para conferir o cupom agora. Tente de novo."));
  }

  /** Pagamento real aprovado (Mercado Pago): a carta já foi criada no servidor. */
  function finishPaid(r: PaidResult) {
    if (!draft || !cart) return;
    const addressless = draftAddressless(draft);
    const m = getMessenger(draft.messengerId);
    trackPurchase(r.letterId, { id: m.id, name: m.name, value: r.amountBrl }, { approvedPaymentId: r.paymentId });
    const letter = saveLetter({
      id: r.letterId,
      fromName: draft.fromName,
      toName: r.toName || draft.replyTo?.toLabel || draft.toName,
      body: pagesPlainText(draft.pages) || "…",
      pages: draft.pages,
      designId: draft.designId,
      messengerId: draft.messengerId,
      fromCityId: "sp",
      toCityId: "rj",
      fromAddress: addressless ? undefined : draft.fromAddress,
      toAddress: addressless ? undefined : draft.replyTo ? { ...draft.toAddress, street: "" } : draft.toAddress,
      fromGeo: addressless ? undefined : draft.fromGeo,
      toGeo: addressless ? undefined : draft.toGeo,
      addressless,
      replyToLetterId: draft.replyTo?.letterId ?? null,
      paidBrl: r.amountBrl,
      paidMethod: r.method,
      couponCode: couponInfo?.code,
      affiliateCode: draft.affiliateCode,
      anonymous: draft.anonymous,
      scheduled: draft.scheduled,
      departAt: r.departAt,
      arriveAt: r.arriveAt,
      recipientPhone: draft.recipientPhone,
      recipientEmail: draft.recipientEmail,
      senderPhone: draft.senderPhone,
      linkSent: r.linkSent,
      notice: r.notice,
    });
    clearDraft();
    setBusy(false);
    setSent(letter);
    afterSend();
  }

  async function pay(method: string) {
    if (!draft || !cart) return;
    setBusy(true);
    setError("");
    const trackedMessenger = getMessenger(draft.messengerId);
    const product = { id: trackedMessenger.id, name: trackedMessenger.name, value: cart.total };
    track("AddPaymentInfo", product, { extra: { payment_type: method } });
    const addressless = draftAddressless(draft);
    prefetchTracking({
      messengerId: draft.messengerId,
      from: addressless ? undefined : draft.fromGeo,
      to: addressless ? undefined : draft.toGeo,
    });
    await new Promise((r) => window.setTimeout(r, 900));
    const body = pagesPlainText(draft.pages) || "…";
    const from = draft.fromGeo ?? { lat: -23.55, lng: -46.63 };
    const to = draft.toGeo ?? { lat: -22.9, lng: -43.17 };
    const plan = planArrival({
      messengerId: draft.messengerId,
      from,
      to,
      arriveOn: draft.scheduled && !addressless ? draft.arriveOn || null : null,
      addressless,
    });
    if (draft.scheduled && !addressless && !plan.fits) {
      setBusy(false);
      setError("Esse mensageiro não chega na data escolhida.");
      return;
    }
    let id: string | undefined;
    let linkSent = false;
    let notice: Letter["notice"];
    let serverPlan: { departAt: number; arriveAt: number; toName: string } | null = null;
    try {
      const saved = await Promise.race([
        checkoutLetter({
          data: checkoutData(method),
        }),
        new Promise<never>((_, reject) =>
          window.setTimeout(() => reject(new Error("checkout-timeout")), 8000),
        ),
      ]);
      id = saved.id;
      // Checkout de teste: NUNCA dispara Purchase (só o pagamento real aprovado no Mercado Pago).
      linkSent = saved.linkSent;
      notice = saved.notice;
      serverPlan = { departAt: saved.departAt, arriveAt: saved.arriveAt, toName: saved.toName };
      const spent = cart.lines.find((l) => l.id === "credit");
      if (spent && spent.priceBrl < 0) await spendCredit({ data: Math.abs(spent.priceBrl) });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if ((Object.values(COUPON_MESSAGES) as string[]).includes(message)) {
        // Cupom recusado pelo servidor: nada é enviado.
        setBusy(false);
        setCouponInfo(null);
        setCouponNote("");
        setError(message);
        return;
      }
      if (message.includes("Pagamento necessário") || payMode === "mercadopago") {
        // Pagamento real ligado: nunca cria carta sem o pagamento aprovado.
        setBusy(false);
        setError(message.includes("Pagamento") ? "Escolha PIX ou cartão para pagar." : "Não deu para enviar agora. Tente de novo.");
        return;
      }
      if (message.includes("mensageiro")) {
        setBusy(false);
        setError("Esse mensageiro não chega na data escolhida.");
        return;
      }
      if (draft.replyTo) {
        // Resposta sem servidor não tem para onde ir: não finge que foi.
        setBusy(false);
        setError(message.includes("responder") ? message : "Não deu para enviar a resposta agora. Tente de novo.");
        return;
      }
    }
    const letter = saveLetter({
      id,
      fromName: draft.fromName,
      toName: serverPlan?.toName || draft.replyTo?.toLabel || draft.toName,
      body,
      pages: draft.pages,
      designId: draft.designId,
      messengerId: draft.messengerId,
      fromCityId: "sp",
      toCityId: "rj",
      fromAddress: addressless ? undefined : draft.fromAddress,
      toAddress: addressless ? undefined : draft.replyTo ? { ...draft.toAddress, street: "" } : draft.toAddress,
      fromGeo: addressless ? undefined : draft.fromGeo,
      toGeo: addressless ? undefined : draft.toGeo,
      addressless,
      replyToLetterId: draft.replyTo?.letterId ?? null,
      paidBrl: cart.total,
      paidMethod: method,
      couponCode: couponInfo?.code,
      affiliateCode: draft.affiliateCode,
      anonymous: draft.anonymous,
      scheduled: draft.scheduled,
      departAt: serverPlan?.departAt ?? plan.departAt.getTime(),
      arriveAt: serverPlan?.arriveAt ?? plan.arriveAt.getTime(),
      recipientPhone: draft.recipientPhone,
      recipientEmail: draft.recipientEmail,
      senderPhone: draft.senderPhone,
      linkSent,
      notice: notice ?? (plan.instant ? "instant" : "queued"),
    });
    clearDraft();
    setBusy(false);
    setSent(letter);
    afterSend();
  }

  // Esquenta a tela de acompanhar (mapa + 3D) enquanto a pessoa paga; de novo ao enviar.
  const prefetchKey = draft ? `${draft.messengerId}:${draft.fromGeo?.lat}:${draft.toGeo?.lat}` : "";
  useEffect(() => {
    if (!draft) return;
    prefetchTracking({ messengerId: draft.messengerId, from: draft.fromGeo, to: draft.toGeo });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefetchKey]);

  if (isPending || draft === undefined) {
    return (
      <div className="min-h-dvh">
        <SiteHeader />
        <main className="mx-auto max-w-lg px-5 py-16 text-muted">Abrindo o lacre…</main>
      </div>
    );
  }
  if (!user) return <RedirectToSignIn next="/pagar" />;
  if (sent) {
    return (
      <div className="min-h-dvh">
        <SiteHeader />
        <SendCeremony letter={sent} extra={nudgeAmor ? <AmorNextNudge /> : null} />
      </div>
    );
  }
  if (!draft || !cart) {
    return (
      <div className="min-h-dvh">
        <SiteHeader />
        <main className="mx-auto max-w-lg px-5 py-16">
          <h1 className="font-display text-3xl">Carrinho vazio</h1>
          <Link to="/escrever" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-rose px-6 text-paper">
            Escrever
          </Link>
        </main>
      </div>
    );
  }

  const addressless = draftAddressless(draft);
  const arrival = planArrival({
    messengerId: draft.messengerId,
    from: draft.fromGeo ?? { lat: -23.55, lng: -46.63 },
    to: draft.toGeo ?? { lat: -22.9, lng: -43.17 },
    arriveOn: draft.scheduled && !addressless ? draft.arriveOn || null : null,
    addressless,
  });
  const arrivalText = addressless ? "chega em 2h" : `chega ${formatArrival(arrival.arriveAt)}`;

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="checkout">
        <div>
          <p className="text-xs uppercase tracking-widest text-rose">Passo 5</p>
          <h1 className="mt-2 font-logo text-4xl italic leading-tight sm:text-5xl">O lacre antes da viagem.</h1>
          {addressless ? (
            <p className="checkout-anon max-w-xl">
              Carta anônima{draft.replyTo ? ` para ${draft.replyTo.toLabel}` : ""} · chega em 2h · pela conta e pelo link
            </p>
          ) : (
          <dl className="checkout-addr max-w-xl">
            <div>
              <dt>De onde sai:</dt>
              <dd>{addressLine(draft.fromAddress) || "falta o endereço"}</dd>
            </div>
            <div>
              <dt>De onde entrega:</dt>
              <dd>
                {draft.replyTo
                  ? `${draft.replyTo.toLabel} · Endereço protegido${draft.replyTo.toCity ? ` · ${draft.replyTo.toCity}` : ""}`
                  : addressLine(draft.toAddress) || "falta o endereço"}
              </dd>
            </div>
          </dl>
          )}
          <p className="mt-2 max-w-xl">
            {getMessenger(draft.messengerId).name} {arrivalText}.{" "}
            {draft.anonymous ? "O nome não vai na carta." : "O nome vai na carta."}{" "}
            {arrival.instant
              ? "Viagem curta: sem aviso de chegada."
              : "Quando estiver perto, o aviso sai por e-mail e WhatsApp, para você e para quem recebe."}
          </p>
          <div className="mt-8 checkout-letter">
            <EnvelopeLetter
              mode="read"
              designId={draft.designId}
              fromName={shownFromName({ fromName: draft.fromName, anonymous: draft.anonymous }, "public")}
              toName={draft.toName}
              body={pagesPlainText(draft.pages)}
              pages={draft.pages}
              date={`${draft.toAddress?.city?.trim() || "Hoje"}, ${new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}`}
              allowDownload={false}
            />
          </div>
          <div className="checkout-messenger">
            <p className="cart-kicker">Mensageiro</p>
            <h2 className="checkout-messenger-title">Quem leva a carta</h2>
            <div className="chosen-messenger">
              <img src={messengerPhoto(draft.messengerId)} alt="" width={72} height={72} />
              <div>
                <h3>{getMessenger(draft.messengerId).name}</h3>
                <p>
                  <b>{formatBrl(getMessenger(draft.messengerId).basePriceBrl)}</b> · {arrivalText}
                </p>
              </div>
              <Link to="/escrever" search={{ passo: 3, voltar: "pagar", responder: draft.replyTo?.letterId }} className="chosen-adjust">
                Ajustar
              </Link>
            </div>
          </div>
          <Link
            to="/escrever"
            search={{ passo: 4, voltar: "pagar", responder: draft.replyTo?.letterId }}
            className="mt-4 inline-block text-sm text-muted underline-offset-4 hover:underline"
          >
            Voltar e ajustar
          </Link>
        </div>
        <div className="checkout-pay">
          <CartSummary
            lines={cart.lines}
            total={cart.total}
            onAdjust={(kind) =>
              void navigate({
                to: "/escrever",
                search:
                  kind === "paper"
                    ? { passo: 2, ajustar: "papel", voltar: "pagar", responder: draft.replyTo?.letterId }
                    : { passo: 3, voltar: "pagar", responder: draft.replyTo?.letterId },
              })
            }
            onBack={() =>
              void navigate({ to: "/escrever", search: { passo: 4, voltar: "pagar", responder: draft.replyTo?.letterId } })
            }
          />
          <AmorPromoBanner
            variant="checkout"
            applied={couponInfo?.code === SECOND_SEND_CODE}
            onApply={() => applyCouponCode(SECOND_SEND_CODE)}
          />
          <form
            className="coupon-row"
            onSubmit={(e) => {
              e.preventDefault();
              applyCouponCode(coupon);
            }}
          >
            <input
              value={coupon}
              onChange={(e) => setCoupon(e.target.value.toUpperCase())}
              placeholder="Cupom"
              aria-label="Cupom"
              autoCapitalize="characters"
            />
            <button type="submit">Aplicar</button>
          </form>
          {couponNote ? <p className="coupon-ok">{couponNote}</p> : null}
          {credit > 0 ? (
            <label className="credit-toggle">
              <input type="checkbox" checked={useCredit} onChange={(e) => setUseCredit(e.target.checked)} />
              Usar {credit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} de crédito
            </label>
          ) : null}
          {payMode === "mercadopago" ? (
            cart.total > 0 ? (
              <MercadoPagoCheckout
                total={cart.total}
                payerEmail={user?.primaryEmail ?? undefined}
                onStart={(p: BrickPayment) => {
                  const m = getMessenger(draft.messengerId);
                  track("AddPaymentInfo", { id: m.id, name: m.name, value: cart.total }, { extra: { payment_type: p.method } });
                  return startPayment({ data: { checkout: checkoutData(p.method), payment: p } });
                }}
                onPoll={(intentId) => paymentStatus({ data: { intentId } })}
                onPaid={finishPaid}
              />
            ) : (
              <button type="button" className="pay-submit" onClick={() => void pay("gratis")} disabled={busy}>
                {busy ? "Enviando…" : "Enviar (sem custo)"}
              </button>
            )
          ) : null}
          {payMode === "test" || (payMode === "mercadopago" && canSkip && cart.total > 0) ? (
            <>
              <button type="button" className="pay-submit" onClick={() => void pay("teste")} disabled={busy}>
                {busy ? "Enviando…" : payMode === "mercadopago" ? "Avançar sem pagamento (teste)" : "Continuar"}
              </button>
              <p className="pay-fine">Teste: a carta segue sem PIX nem cartão{payMode === "mercadopago" ? " · só nesta conta" : ""}.</p>
            </>
          ) : null}
          {payMode === "test" && cart.total > 0 ? (
            <CheckoutForm
              total={cart.total}
              busy={busy}
              messengerName={getMessenger(draft.messengerId).name}
              onPay={(m) => void pay(m)}
            />
          ) : null}
          {error ? <p className="mt-3 text-sm text-rose">{error}</p> : null}
        </div>
      </main>
    </div>
  );
}
