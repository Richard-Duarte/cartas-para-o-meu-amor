import { GROK_PROVIDERS, signIn } from "@/lib/auth/client";

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-[1.15rem] w-[1.15rem] shrink-0">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.7 7.1l6.3 5.3C37.4 38.3 44 33 44 24c0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}

function XMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[1.05rem] w-[1.05rem] shrink-0">
      <path
        fill="currentColor"
        d="M14.23 10.16 22.14 1h-1.88l-6.86 7.95L7.9 1H1.1l8.3 12.07L1.1 23h1.88l7.26-8.41L15.7 23h6.8l-8.27-12.84Zm-2.57 2.98-.84-1.2L3.66 2.43h2.88l5.4 7.72.84 1.2 7.02 10.04h-2.88l-5.26-7.25Z"
      />
    </svg>
  );
}

export function SocialSignInButtons({
  callbackURL,
  onError,
}: {
  callbackURL: string;
  onError?: (message: string) => void;
}) {
  return (
    <div className="grid gap-2">
      {GROK_PROVIDERS.map((p) => (
        <button
          key={p.providerId}
          type="button"
          className="flex min-h-11 w-full items-center justify-center gap-3 rounded-full border border-line bg-paper px-4 text-ink"
          onClick={() => {
            void signIn(p.providerId, { callbackURL }).catch((err: unknown) => {
              const message = err instanceof Error ? err.message : "Não foi possível entrar";
              onError?.(message);
            });
          }}
        >
          {p.idp === "google" ? <GoogleMark /> : <XMark />}
          Continuar com {p.label}
        </button>
      ))}
    </div>
  );
}
