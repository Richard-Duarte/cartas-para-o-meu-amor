import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CartSummary } from "@/components/cart/CartSummary";
import { CheckoutForm } from "@/components/cart/CheckoutForm";
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
import { applyCoupon as checkCoupon, checkoutLetter, myProfile, spendCredit } from "@/lib/server/shop";

export const Route = createFileRoute("/pagar")({
  component: PayPage,
});

function PayPage() {
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const [draft, setDraft] = useState<LetterDraft | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [couponInfo, setCouponInfo] = useState<{ percent: number; amountBrl: number; code: string } | null>(null);
  const [credit, setCredit] = useState(0);
  const [useCredit, setUseCredit] = useState(true);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<Letter | null>(null);

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
      creditBrl: useCredit ? credit : 0,
      anonymous: draft.anonymous,
      scheduled: draft.scheduled,
    });
  }, [draft, couponInfo, credit, useCredit]);

  async function pay(method: string) {
    if (!draft || !cart) return;
    setBusy(true);
    setError("");
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
          data: {
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
          },
        }),
        new Promise<never>((_, reject) =>
          window.setTimeout(() => reject(new Error("checkout-timeout")), 8000),
        ),
      ]);
      id = saved.id;
      linkSent = saved.linkSent;
      notice = saved.notice;
      serverPlan = { departAt: saved.departAt, arriveAt: saved.arriveAt, toName: saved.toName };
      const spent = cart.lines.find((l) => l.id === "credit");
      if (spent && spent.priceBrl < 0) await spendCredit({ data: Math.abs(spent.priceBrl) });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
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
        <SendCeremony letter={sent} />
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
          <form
            className="coupon-row"
            onSubmit={(e) => {
              e.preventDefault();
              void checkCoupon({ data: coupon }).then((r) => {
                if (r.ok) {
                  setCouponInfo({ code: r.code, percent: r.percent, amountBrl: r.amountBrl });
                  writeDraft({ ...draft, couponCode: r.code });
                  setError("");
                } else setError(r.message);
              });
            }}
          >
            <input
              value={coupon}
              onChange={(e) => setCoupon(e.target.value.toUpperCase())}
              placeholder="Cupom"
            />
            <button type="submit">Aplicar</button>
          </form>
          {credit > 0 ? (
            <label className="credit-toggle">
              <input type="checkbox" checked={useCredit} onChange={(e) => setUseCredit(e.target.checked)} />
              Usar {credit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} de crédito
            </label>
          ) : null}
          <button type="button" className="pay-submit" onClick={() => void pay("teste")} disabled={busy}>
            {busy ? "Enviando…" : "Continuar"}
          </button>
          <p className="pay-fine">Teste: a carta segue sem PIX nem cartão.</p>
          {cart.total > 0 ? (
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
