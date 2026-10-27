import { createServerFn } from "@tanstack/react-start";

/** Quais logins diretos (Google / X) estão configurados no servidor. */
export const directAuthProviders = createServerFn({ method: "GET" }).handler(async () => {
  const { directProviders } = await import("./direct-providers.server");
  return directProviders;
});
