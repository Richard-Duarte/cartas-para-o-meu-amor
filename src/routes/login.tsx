import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => {
    if (typeof s.next === "string" && s.next.startsWith("/")) return { next: s.next };
    return {};
  },
  component: Login,
});

function Login() {
  const { next } = Route.useSearch();
  const after = next || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error: err } =
      mode === "up"
        ? await authClient.signUp.email({ email, password, name: email.split("@")[0] })
        : await authClient.signIn.email({ email, password });
    setBusy(false);
    if (err) setError(err.message ?? "Não foi possível entrar");
    else window.location.href = after;
  }

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto grid max-w-md gap-6 px-5 py-16">
        <p className="text-xs uppercase tracking-widest text-rose">Conta</p>
        <h1 className="font-logo text-4xl italic sm:text-5xl">Entre para lacrar a carta.</h1>
        <p className="text-muted">
          Quem recebe também entra para acompanhar. O histórico fica na sua conta.
        </p>
        {authEnabled ? (
          <>
            <div className="grid gap-2">
              {GROK_PROVIDERS.map((p) => (
                <button
                  key={p.providerId}
                  type="button"
                  onClick={() => signIn(p.providerId, { callbackURL: after })}
                  className="min-h-11 rounded-full border border-line bg-paper"
                >
                  Continuar com {p.label}
                </button>
              ))}
            </div>
            <p className="text-center text-xs uppercase tracking-widest text-muted">ou e-mail</p>
            <form className="pay-card-form" onSubmit={(e) => void onEmail(e)}>
              <label>
                E-mail
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <label>
                Senha
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </label>
              {error ? <p className="text-sm text-rose">{error}</p> : null}
              <button type="submit" className="pay-submit" disabled={busy}>
                {busy ? "Entrando…" : mode === "up" ? "Criar conta" : "Entrar"}
              </button>
            </form>
            <button
              type="button"
              className="text-sm text-muted underline-offset-4 hover:underline"
              onClick={() => setMode(mode === "up" ? "in" : "up")}
            >
              {mode === "up" ? "Já tenho conta" : "Criar conta com e-mail"}
            </button>
          </>
        ) : (
          <p className="text-muted">Entrar ainda não está ligado neste preview.</p>
        )}
        <Link to="/" className="text-sm text-muted underline-offset-4 hover:underline">
          Voltar ao início
        </Link>
      </main>
    </div>
  );
}
