import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AddressFields } from "@/components/letters/AddressFields";
import { CanvaEditor } from "@/components/letters/CanvaEditor";
import { CartDock, CartSummary } from "@/components/cart/CartSummary";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MessengerPicker } from "@/components/messengers/MessengerPicker";
import { emptyAddress } from "@/lib/address";
import {
  buildCart,
  emptyDraft,
  readDraft,
  writeDraft,
  type LetterDraft,
} from "@/lib/cart";
import { bootCatalog } from "@/lib/catalog";
import { DESIGNS, type DesignId } from "@/lib/designs";
import { geocodeAddress } from "@/lib/server/shop";
import { cn } from "@/lib/utils";
import {
  MESSENGERS,
  estimateDelivery,
  type Geo,
  type MessengerId,
} from "@/lib/messengers";
import { pagesPlainText } from "@/lib/pages";

type WriteSearch = { papel?: string; ref?: string };

export const Route = createFileRoute("/escrever")({
  component: WritePage,
  validateSearch: (s: Record<string, unknown>): WriteSearch => ({
    papel: typeof s.papel === "string" ? s.papel : undefined,
    ref: typeof s.ref === "string" ? s.ref : undefined,
  }),
});

const STEPS = [
  { n: 1, label: "Nomes" },
  { n: 2, label: "Papel" },
  { n: 3, label: "Leva" },
  { n: 4, label: "Entrega" },
  { n: 5, label: "Pagar" },
] as const;

function goWithMotion(apply: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => void };
  if (typeof doc.startViewTransition === "function") doc.startViewTransition(apply);
  else apply();
}

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

  useEffect(() => {
    void bootCatalog().then(() => {
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
      } else if (fromUrl) {
        setDesignId(fromUrl.id);
        if (search.ref) setAffiliateCode(search.ref);
      } else if (search.ref) {
        setAffiliateCode(search.ref);
      }
      setReady(true);
    });
  }, [search.papel, search.ref]);

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
  };

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
  ]);

  const hoursById = useMemo(() => {
    const from = fromGeo ?? { lat: -23.55, lng: -46.63 };
    const to = toGeo ?? { lat: -22.9, lng: -43.17 };
    const map: Partial<Record<string, number>> = {};
    for (const m of MESSENGERS) {
      map[m.id] = estimateDelivery({ messengerId: m.id, from, to }).hours;
    }
    return map;
  }, [fromGeo, toGeo]);

  const cart = buildCart(designId, messengerId);
  const canWrite = pagesPlainText(pages).length > 1;
  const canNames = fromName.trim().length > 1 && toName.trim().length > 1;
  const canAddress = Boolean(fromAddress.cep && toAddress.cep && fromAddress.city && toAddress.city);

  async function goPay() {
    writeDraft(draft);
    try {
      if (fromAddress.city) {
        const g = await geocodeAddress({
          data: {
            street: fromAddress.street,
            number: fromAddress.number,
            city: fromAddress.city,
            state: fromAddress.state,
          },
        });
        setFromGeo(g);
        draft.fromGeo = g;
      }
      if (toAddress.city) {
        const g = await geocodeAddress({
          data: {
            street: toAddress.street,
            number: toAddress.number,
            city: toAddress.city,
            state: toAddress.state,
          },
        });
        setToGeo(g);
        draft.toGeo = g;
      }
    } catch {
      /* keep city fallback */
    }
    writeDraft(draft);
    void navigate({ to: "/pagar" });
  }

  const stepsNav = (
        <ol className="write-steps" aria-label="Passos">
          {STEPS.map((s) => (
            <li key={s.n}>
              <button
                type="button"
                className={cn("write-step", step === s.n && "is-on", step > s.n && "is-done")}
                onClick={() => {
                  if (s.n > 1 && !(fromName.trim().length > 1 && toName.trim().length > 1)) return;
                  if (s.n === 5) void goPay();
                  else goWithMotion(() => setStep(s.n));
                }}
              >
                <span className="write-step-n">{s.n}</span>
                <span className="write-step-label">{s.label}</span>
              </button>
            </li>
          ))}
        </ol>
  );

  if (step === 1) {
    return (
      <div className="write-shell min-h-dvh">
        <SiteHeader />
        <main className="write-main mx-auto max-w-lg px-5">
          <p className="text-xs uppercase tracking-widest text-rose">Nova carta</p>
          <h1 className="mt-2 font-logo text-4xl italic leading-tight sm:text-5xl">De quem. Para quem.</h1>
          <p className="mt-3 text-muted">
            Esses nomes aparecem no topo da carta, inclusive em tela cheia.
          </p>
          {stepsNav}
          <form
            className="pay-card-form mt-8 ios-stage"
            onSubmit={(e) => {
              e.preventDefault();
              if (canNames) goWithMotion(() => setStep(2));
            }}
          >
            <label>
              De
              <input
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Seu nome"
                autoComplete="name"
                required
              />
            </label>
            <label>
              Para
              <input
                value={toName}
                onChange={(e) => setToName(e.target.value)}
                placeholder="Nome de quem recebe"
                required
              />
            </label>
            <button type="submit" className="pay-submit" disabled={!canNames}>
              Escolher o papel
            </button>
          </form>
        </main>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="write-shell min-h-dvh">
        <SiteHeader />
        <div className="canva-steps-wrap">{stepsNav}</div>
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
          onContinue={() => goWithMotion(() => setStep(3))}
        />
      </div>
    );
  }

  return (
    <div className="write-shell min-h-dvh pb-24">
      <SiteHeader />
      <main className="write-main mx-auto max-w-5xl px-5">
        {stepsNav}

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div key={step} className="ios-stage grid gap-8">

            {step === 3 ? (
              <>
                <div>
                  <p className="text-sm uppercase tracking-widest text-muted">Mensageiro</p>
                  <h2 className="mt-1 font-display text-3xl">Quem atravessa a cidade.</h2>
                </div>
                <MessengerPicker value={messengerId} onChange={setMessengerId} hoursById={hoursById} />
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => goWithMotion(() => setStep(2))}
                    className="min-h-11 rounded-full border border-line bg-paper px-6"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => goWithMotion(() => setStep(4))}
                    className="min-h-11 rounded-full bg-rose px-8 text-paper"
                  >
                    Endereço de entrega
                  </button>
                </div>
              </>
            ) : null}

            {step === 4 ? (
              <>
                <div>
                  <p className="text-sm uppercase tracking-widest text-muted">Entrega</p>
                  <h2 className="mt-1 font-display text-3xl">De onde sai. Onde pousa.</h2>
                  <p className="mt-2 max-w-xl text-muted">
                    Digite a rua ou o CEP. O correio completa o resto, inclusive o CEP.
                  </p>
                </div>
                <div className="grid gap-5 lg:grid-cols-2">
                  <AddressFields label="Origem" value={fromAddress} onChange={setFromAddress} />
                  <AddressFields label="Destino" value={toAddress} onChange={setToAddress} />
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => goWithMotion(() => setStep(3))}
                    className="min-h-11 rounded-full border border-line bg-paper px-6"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    disabled={!canAddress}
                    onClick={() => void goPay()}
                    className="min-h-11 rounded-full bg-rose px-8 text-paper disabled:opacity-40"
                  >
                    Ir para o pagamento
                  </button>
                </div>
              </>
            ) : null}
          </div>

          <div className="hidden lg:block">
            <div className="sticky top-24">
              <CartSummary lines={cart.lines} total={cart.total} />
            </div>
          </div>
        </div>
      </main>
      <CartDock lines={cart.lines} total={cart.total} />
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
