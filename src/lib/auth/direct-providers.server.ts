/**
 * Login direto com Google (sem o broker), ligado só por env:
 *   GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
 * Sem as envs nada muda. Callback: <BETTER_AUTH_URL>/api/auth/callback/google.
 * X ficou de fora: a API do X é paga por uso e o login consultaria /2/users/me.
 */
const env = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

const googleId = env("GOOGLE_CLIENT_ID");
const googleSecret = env("GOOGLE_CLIENT_SECRET");

export const directProviders = { google: Boolean(googleId && googleSecret) };

export const directSocialProviders = directProviders.google
  ? {
      google: {
        clientId: googleId as string,
        clientSecret: googleSecret as string,
        prompt: "select_account" as const,
      },
    }
  : {};
