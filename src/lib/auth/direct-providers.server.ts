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

/** Foto do Google: lê o `picture` do id_token guardado na conta Google do usuário. */
function googlePicture(idToken: string | null | undefined): string | null {
  if (!idToken) return null;
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1] ?? "", "base64url").toString("utf8")) as { picture?: unknown };
    const pic = typeof payload.picture === "string" ? payload.picture : "";
    return /^https:\/\/[a-z0-9.-]+\.googleusercontent\.com\//i.test(pic) ? pic : null;
  } catch {
    return null;
  }
}

/**
 * Depois de cada login: se o usuário tem conta Google, usa a foto do Google como `user.image`,
 * a menos que ele tenha subido uma foto própria (data: URL, salva em /conta).
 */
export async function syncGooglePhoto(userId: string) {
  if (!directProviders.google) return;
  const { getSql } = await import("../db");
  const sql = await getSql();
  const rows = await sql<{ id_token: string | null; image: string | null }>`
    select a."idToken" as id_token, u.image
    from "account" a join "user" u on u.id = a."userId"
    where a."userId" = ${userId} and a."providerId" = 'google'
    order by a."updatedAt" desc limit 1`;
  const row = rows[0];
  if (!row) return;
  if (row.image && row.image.startsWith("data:")) return;
  const pic = googlePicture(row.id_token);
  if (!pic || pic === row.image) return;
  await sql`update "user" set image = ${pic}, "updatedAt" = now() where id = ${userId}`;
}
