import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CartSummary } from "@/components/cart/CartSummary";
import { CheckoutForm } from "@/components/cart/CheckoutForm";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { LetterSheet } from "@/components/letters/LetterSheet";
import { SendCeremony } from "@/components/letters/SendCeremony";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { addressLine } from "@/lib/address";
import {
  buildCart,
  clearDraft,
  readDraft,
  writeDraft,
  type LetterDraft,
} from "@/lib/cart";
import { saveLetter, type Letter } from "@/lib/letters";
import { getMessenger, demoDurationMs } from "@/lib/messengers";
import { pagesPlainText } from "@/lib/pages";
import { applyCoupon as checkCoupon, checkoutLetter, myProfile, spendCredit } from "@/lib/server/shop";

export const Route = createFileRoute("/pagar")({
  component: PayPage,
});

function PayPage() {
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
    setDraft(readDraft());
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
    });
  }, [draft, couponInfo, credit, useCredit]);

  async function pay(method: string) {
    if (!draft || !cart) return;
    setBusy(true);
    setError("");
    await new Promise((r) => window.setTimeout(r, 900));
    const body = pagesPlainText(draft.pages) || "…";
    let id: string | undefined;
    try {
      const saved = await Promise.race([
        checkoutLetter({
          data: {
            fromName: draft.fromName,
            toName: draft.toName,
            pagesJson: JSON.stringify(draft.pages),
            templateId: draft.designId,
            messengerId: draft.messengerId,
            fromAddressJson: JSON.stringify(draft.fromAddress),
            toAddressJson: JSON.stringify(draft.toAddress),
            fromGeoJson: JSON.stringify(draft.fromGeo ?? {}),
            toGeoJson: JSON.stringify(draft.toGeo ?? {}),
            paidBrl: cart.total,
            couponCode: couponInfo?.code,
            affiliateCode: draft.affiliateCode,
            demoDurationMs: demoDurationMs(getMessenger(draft.messengerId).speedKmh),
            method,
          },
        }),
        new Promise<never>((_, reject) =>
          window.setTimeout(() => reject(new Error("checkout-timeout")), 8000),
        ),
      ]);
      id = saved.id;
      const spent = cart.lines.find((l) => l.id === "credit");
      if (spent && spent.priceBrl < 0) await spendCredit({ data: Math.abs(spent.priceBrl) });
    } catch {
      /* local letter still tracks in this preview */
    }
    const letter = saveLetter({
      id,
      fromName: draft.fromName,
      toName: draft.toName,
      body,
      pages: draft.pages,
      designId: draft.designId,
      messengerId: draft.messengerId,
      fromCityId: "sp",
      toCityId: "rj",
      fromAddress: draft.fromAddress,
      toAddress: draft.toAddress,
      fromGeo: draft.fromGeo,
      toGeo: draft.toGeo,
      paidBrl: cart.total,
      paidMethod: method,
      couponCode: couponInfo?.code,
      affiliateCode: draft.affiliateCode,
    });
    clearDraft();
    setBusy(false);
    setSent(letter);
  }

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

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="checkout">
        <div>
          <p className="text-xs uppercase tracking-widest text-rose">Passo 5</p>
          <h1 className="mt-2 font-logo text-5xl italic leading-tight">O lacre antes da viagem.</h1>
          <p className="mt-3 max-w-xl text-muted">
            {addressLine(draft.fromAddress) || "Origem"}
            <br />
            {addressLine(draft.toAddress) || "Destino"}
          </p>
          <div className="mt-8">
            <LetterSheet
              designId={draft.designId}
              fromName={draft.fromName}
              toName={draft.toName}
              body={pagesPlainText(draft.pages)}
              pages={draft.pages}
            />
          </div>
          <Link to="/escrever" className="mt-4 inline-block text-sm text-muted underline-offset-4 hover:underline">
            Voltar e ajustar
          </Link>
        </div>
        <div className="checkout-pay">
          <CartSummary lines={cart.lines} total={cart.total} />
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
          {cart.total <= 0 ? (
            <button type="button" className="pay-submit" onClick={() => void pay("credit")} disabled={busy}>
              {busy ? "Enviando…" : "Enviar com crédito"}
            </button>
          ) : (
            <CheckoutForm total={cart.total} busy={busy} onPay={(m) => void pay(m)} />
          )}
          {error ? <p className="mt-3 text-sm text-rose">{error}</p> : null}
        </div>
      </main>
    </div>
  );
}
