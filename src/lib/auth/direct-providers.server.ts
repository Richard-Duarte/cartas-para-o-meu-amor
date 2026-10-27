/**
 * Login direto com Google e X (sem o broker), ligado só por env:
 *   GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
 *   TWITTER_CLIENT_ID + TWITTER_CLIENT_SECRET   (OAuth 2.0 do X)
 * Sem as envs nada muda: os botões continuam usando o broker como antes.
 * Callbacks: <BETTER_AUTH_URL>/api/auth/callback/google e /api/auth/callback/twitter.
 */
const env = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

const googleId = env("GOOGLE_CLIENT_ID");
const googleSecret = env("GOOGLE_CLIENT_SECRET");
const xId = env("TWITTER_CLIENT_ID");
const xSecret = env("TWITTER_CLIENT_SECRET");

export const directProviders = {
  google: Boolean(googleId && googleSecret),
  twitter: Boolean(xId && xSecret),
};

export const directSocialProviders = {
  ...(directProviders.google
    ? {
        google: {
          clientId: googleId as string,
          clientSecret: googleSecret as string,
          prompt: "select_account" as const,
        },
      }
    : {}),
  ...(directProviders.twitter
    ? {
        twitter: {
          clientId: xId as string,
          clientSecret: xSecret as string,
          // Sem e-mail confirmado no X, o Better Auth usaria o @usuario como "email".
          // Usamos um endereço sintético único e não verificado: nunca liga a outra conta.
          mapProfileToUser: (profile: { data: { id: string; email?: string } }) =>
            profile.data.email ? {} : { email: `x-${profile.data.id}@x.invalid`, emailVerified: false },
        },
      }
    : {}),
};
