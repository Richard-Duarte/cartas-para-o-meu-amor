/**
 * Fase de testes: qualquer pessoa com o link (ou o código) vê o acompanhamento — mapa/cena,
 * progresso e a carta — SEM login. Só os campos seguros de "quem só visualiza" saem do
 * servidor (`publicLetterRow(row, "viewer")`): sem contatos, sem endereço completo, sem
 * id de conta e, na anônima, sem nome.
 *
 * Para exigir login de novo: defina `VITE_PUBLIC_TRACKING=false` no ambiente da Vercel
 * (Production/Preview) e faça um novo deploy — ou troque o padrão abaixo para `false`.
 * Vale para o navegador e para o servidor (o valor entra no build dos dois).
 */
export const PUBLIC_TRACKING: boolean =
  String(import.meta.env.VITE_PUBLIC_TRACKING ?? "true").toLowerCase() !== "false";
