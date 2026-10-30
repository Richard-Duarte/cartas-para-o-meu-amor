/**
 * Modo anônimo (carta sem nome, 2h) fica OCULTO até a API da Evolution (WhatsApp) estar
 * configurada — a carta anônima depende do aviso por WhatsApp para chegar a quem recebe.
 *
 * Para ligar de novo: na Vercel (Production e Preview) defina `VITE_ANONYMOUS_MODE=on`,
 * junto com EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE, e faça um novo
 * deploy. O valor entra no build do navegador e do servidor. No servidor, além da chave,
 * as três variáveis da Evolution precisam existir (ver `anonymousAllowedOnServer`).
 *
 * Respostas a cartas anônimas que já existem continuam anônimas (não dá para revelar
 * quem escreveu), mesmo com o modo desligado.
 */
export const ANONYMOUS_MODE: boolean =
  String(import.meta.env.VITE_ANONYMOUS_MODE ?? "off").toLowerCase() === "on";
