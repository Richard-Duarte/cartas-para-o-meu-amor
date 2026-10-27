# Login com Google e X (direto)

O login direto liga só com as envs abaixo (servidor). Sem elas, os botões "Continuar com Google/X" seguem pelo broker, como antes.

| Env | Valor |
|---|---|
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud → Credenciais → ID do cliente OAuth "Aplicativo da Web" |
| `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET` | X Developer → app → OAuth 2.0 Client ID/Secret (Web App, confidential) |
| `BETTER_AUTH_URL` | URL pública (já existe); define o redirect |

**Callbacks** (cadastrar nos dois consoles):
- `https://cartas-para-o-meu-amor.vercel.app/api/auth/callback/google`
- `https://cartas-para-o-meu-amor.vercel.app/api/auth/callback/twitter`
- os mesmos caminhos em `https://cartaparaomeuamor.com.br`.

**Escopos:**
- Google: `openid email profile`.
- X: `users.read tweet.read offline.access users.email`. Ligue "Request email from users" no app do X.

**Contas já existentes:**
- Google (e-mail sempre verificado) liga ao usuário que já tem o mesmo e-mail: linha nova em `account`, mesmo `user.id`, mesmas cartas.
- X liga só se o X confirmar o e-mail. Sem e-mail confirmado, vira um usuário novo com e-mail sintético `x-<id>@x.invalid`, que nunca casa com outra conta.
- Nada é apagado nem alterado. Não há migration (as tabelas do Better Auth já existem).
