import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { authClient, authEnabled } from "@/lib/auth/client";
import { SocialSignInButtons } from "@/components/auth/SocialButtons";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => {
    if (typeof s.next === "string" && s.next.startsWith("/")) return { next: s.next };
    return {};
  },
  component: Login,
});

function authErrorPt(message?: string | null) {
  const raw = (message ?? "").toLowerCase();
  if (!raw) return null;
  if (raw.includes("invalid email or password") || raw.includes("invalid_email")) {
    return "E-mail ou senha não conferem.";
  }
  if (raw.includes("user already exists") || raw.includes("already exists")) {
    return "Esse e-mail já tem conta. Entre com a senha.";
  }
  if (raw.includes("invalid origin") || raw.includes("invalid redirect")) {
    return "O login não voltou para este endereço. Tente de novo nesta mesma página.";
  }
  return message;
}

function Login() {
  const { next } = Route.useSearch();
  const after = next || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function onEmail(next: "in" | "up") {
    if (!formRef.current?.reportValidity()) return;
    setMode(next);
    setBusy(true);
    setError("");
    const { error: err } =
      next === "up"
        ? await authClient.signUp.email({ email, password, name: email.split("@")[0] })
        : await authClient.signIn.email({ email, password });
    setBusy(false);
    if (err) setError(authErrorPt(err.message) ?? "Não foi possível entrar");
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
            <SocialSignInButtons
              callbackURL={after}
              onError={(message) => setError(message)}
            />
            <p className="text-center text-xs uppercase tracking-widest text-muted">ou e-mail</p>
            <form
              ref={formRef}
              className="pay-card-form"
              onSubmit={(e) => {
                e.preventDefault();
                void onEmail("in");
              }}
            >
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
                {busy && mode === "in" ? "Entrando…" : "Entrar"}
              </button>
              <button
                type="button"
                className="login-create"
                disabled={busy}
                onClick={() => void onEmail("up")}
              >
                {busy && mode === "up" ? "Criando…" : "Criar conta"}
              </button>
            </form>
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
