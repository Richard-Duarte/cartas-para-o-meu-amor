# Login com Google (direto)

O login direto liga só com `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` (servidor). Sem elas, o botão "Continuar com Google" segue pelo broker, como antes.

**Google Cloud:**
- Credenciais → ID do cliente OAuth → tipo "Aplicativo da Web".
- Callbacks:
  - `https://cartas-para-o-meu-amor.vercel.app/api/auth/callback/google`
  - `https://cartaparaomeuamor.com.br/api/auth/callback/google`
  - `https://www.cartaparaomeuamor.com.br/api/auth/callback/google`
- Escopos: `openid email profile`.
- `BETTER_AUTH_URL` define o redirect (num preview, defina a URL fixa do branch).

**Contas existentes:** o Google (e-mail verificado) liga ao usuário que já tem o mesmo e-mail. É uma linha nova em `account`, com o mesmo `user.id` e as mesmas cartas. Sem migration.

**X:** desligado. A API do X é paga por uso (User: Read a US$ 0,010) e o login chama `/2/users/me`. Com saldo zerado, não dá para garantir.

## Foto do Google
Depois de cada login, se o usuário tem conta Google, `user.image` passa a ser a foto do Google, tirada do `id_token`. Foto enviada em /conta (`data:`) nunca é sobrescrita. Sem foto, o site mostra a inicial, como antes.

## Admin pelo Google
- Quem está em `ADMIN_EMAILS` vira admin do `/admin` quando entra com o Google.
- Exige e-mail verificado, conta Google ligada e nenhuma senha local. Isso é conferido no servidor (`requireAdminSession`).
- O login antigo do `/admin` (usuário/senha) continua funcionando.
- Admin não libera pagar sem pagamento. Para isso, o e-mail precisa estar em `PAYMENT_BYPASS_EMAILS`.
