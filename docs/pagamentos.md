# Pagamentos: Mercado Pago (Checkout Bricks)

**Por que Payment Brick:** o PIX e o cartão ficam dentro do `/pagar`, sem redirecionamento, com cara de app no celular. O Brick só tokeniza o cartão (a parte PCI fica com o MP); quem cria o pagamento, com o valor **calculado no servidor**, é o nosso backend.

## Modo
- `PAYMENTS_MODE=test` (ou vazio): o fluxo antigo, sem cobrança.
- `PAYMENTS_MODE=mercadopago` + `MERCADOPAGO_ACCESS_TOKEN`: PIX e cartão reais para todo mundo.
- `PAYMENT_BYPASS_EMAILS=richard.duarte.silva@gmail.com`: só essas contas veem "Avançar sem pagamento (teste)".
  - O servidor confere o e-mail do usuário logado e só libera se o e-mail for verificado ou vier de login Google/X, para ninguém criar uma conta com e-mail/senha usando o e-mail do dono.
  - O `checkoutLetter` confere o e-mail da sessão **no servidor**. Os demais recebem "Pagamento necessário".
  - Envio por bypass grava `paid_brl=0` e `method=bypass`, sem comissão de afiliado e **sem Purchase**.

## Variáveis
| Variável | Lado |
|---|---|
| `PAYMENTS_MODE` | servidor |
| `MERCADOPAGO_ACCESS_TOKEN` | servidor (sensível) |
| `VITE_MERCADOPAGO_PUBLIC_KEY` | cliente (build) |
| `MERCADOPAGO_WEBHOOK_SECRET` | servidor (sensível): a assinatura secreta do webhook no painel. Opcional: com ela o webhook exige `x-signature` válido; sem ela aceita a notificação, mas sempre reconsulta o pagamento na API do MP e confia só nesse status. |
| `MERCADOPAGO_NOTIFICATION_URL` | servidor (opcional) |
| `PAYMENT_BYPASS_EMAILS` | servidor |
| `MERCADOPAGO_CLIENT_ID` / `MERCADOPAGO_CLIENT_SECRET` | servidor; o código não usa hoje |

## Fluxo
1. `startPayment`:
   - recalcula o total (mensageiro, papel, anônima, data, cupom e crédito) e recusa se for diferente do que a tela mostrou;
   - confere resposta e data marcada antes de cobrar;
   - grava `payment_intents` com o rascunho e um id de carta reservado;
   - chama `POST /v1/payments` com `X-Idempotency-Key` e `external_reference` = id do intent.
2. **Cartão aprovado:** a carta nasce na hora.
3. **PIX:** a tela mostra o QR e o copia-e-cola e consulta `paymentStatus` a cada 3s. O webhook também libera.
4. **Aprovado:** `applyPayment` confere a referência, o BRL e o valor. Depois chama `placeLetter(..., { letterId })`, que é idempotente: `insert … on conflict do nothing`, e a 2ª vez não repete efeitos. Na 1ª vez (`placed_at`), gasta o crédito e manda o Purchase server-side.
5. A carta só existe, e só parte, **depois** de aprovado: `depart_at` é calculado na aprovação.

**Banco:** `migrations/0011_payments.sql` cria só `payment_intents`. `letters` e `orders` não mudam.

## Webhook
- **URL:** `https://cartas-para-o-meu-amor.vercel.app/api/mercadopago/webhook`. Com o domínio: `https://cartaparaomeuamor.com.br/api/mercadopago/webhook`.
- **Onde cadastrar:** Mercado Pago → Suas integrações → app → Webhooks → evento "Pagamentos". Copie a assinatura secreta para `MERCADOPAGO_WEBHOOK_SECRET`.
- **Validação:** `HMAC-SHA256(secret, "id:<data.id>;request-id:<x-request-id>;ts:<ts>;")` comparado com o `v1`. Depois o servidor busca o pagamento na API e não confia no corpo.
- Cada pagamento também leva `notification_url = https://cartas-para-o-meu-amor.vercel.app/api/mercadopago/webhook` (fixo; troque por `MERCADOPAGO_NOTIFICATION_URL`).

## Testar com credenciais de teste
1. Num Preview, configure `PAYMENTS_MODE=mercadopago`, `MERCADOPAGO_ACCESS_TOKEN=TEST-…` e `VITE_MERCADOPAGO_PUBLIC_KEY=TEST-…`, e faça o redeploy.
2. Cartões de teste: Mastercard `5031 4332 1540 6351`, CVV `123`, validade `11/30`, CPF `12345678909`. O nome do titular define o resultado: `APRO` aprova e `OTHE` recusa.
3. **PIX de teste:** fica `pending`; aprove pelo painel com um usuário de teste.
