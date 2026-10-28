# Preços com centavos e cupom AMOR

## Preços (valem só para cartas novas)
O catálogo do banco manda; `src/lib/messengers.ts`, `src/lib/designs.ts` e `src/lib/delivery.ts` são o
fallback com os mesmos valores. Cartas já enviadas guardam o valor pago em `letters.paid_brl`/`orders.total_brl`
e não mudam (a migração 0014 só troca o tipo para `numeric(10,2)`: 14 vira 14.00).

| Item | Preço |
|---|---|
| Tartaruga | R$ 4,90 |
| Jegue | R$ 5,90 |
| Pombo-correio | R$ 6,90 |
| Cavalo | R$ 9,90 |
| Cegonha | R$ 12,90 |
| Cisne | R$ 14,90 |
| Avião | R$ 19,90 |
| Flores, Piquenique | R$ 1,90 |
| Noite, Carta Retrô, Ursinho, Noite Estrelada | R$ 2,90 |
| Jardim, Scrapbook, Mapa | R$ 3,90 |
| Clássico, Rosa, Polaroid, Corações Pastel, Nuvens | Grátis |
| Carta anônima (`app_settings.anonymous_fee`) | R$ 5,90 |
| Agendar chegada (`app_settings.schedule_fee`) | R$ 1,90 |

Tudo editável no Painel (Templates, Mensageiros, Afiliados → preços), com centavos.

## Cupom AMOR (2º envio grátis)
- Linha em `coupons` com `rule = 'second_send'` e 100%. Liga/desliga no Painel → Cupons.
- Servidor confere (applyCoupon, serverCartTotal, placeLetter): login, conta com ≥ 1 carta enviada,
  1x por conta (`coupon_redemptions`, índice único `(code, user_id)` para AMOR). Sem maiúsculas/minúsculas.
- Total R$ 0,00 → botão "Enviar (sem custo)" (o mesmo fluxo de cupom/crédito que já existia): a carta sai
  sem passar pelo Mercado Pago. Sem comissão de indicação nesse envio.
- Mensagens: "Faça seu primeiro envio para liberar o cupom AMOR" / "Você já usou o cupom AMOR".

## Como a migração roda
`npm run build` → `scripts/migrate.mjs` aplica `migrations/0014_precos_cupom_amor.sql` no deploy de
Production (uma vez, registrada em `_migrations`). O preview deste branch usa `DATABASE_URL` vazio
(variável só do branch na Vercel) → PGLite próprio, para não tocar o banco de produção antes do merge.
