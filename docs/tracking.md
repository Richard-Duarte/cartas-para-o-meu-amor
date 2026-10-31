# Rastreamento de anúncios (Meta Pixel + TikTok Pixel)

Tudo depende de variáveis de ambiente. **Se nenhuma estiver definida, nenhum script de anúncio carrega e nada é enviado.** Por isso o merge sem IDs não muda nada.

## Variáveis (Vercel → Settings → Environment Variables)

| Variável | Onde | Para quê |
|---|---|---|
| `VITE_META_PIXEL_ID` | build (cliente) | ID do Pixel/Dataset do Meta. Carrega o `fbevents.js`. **Valor: `1685962036479525`** (conta de anúncio 4772805709665562, BRL). Pixel ID é público. |
| `VITE_TIKTOK_PIXEL_ID` | build (cliente) | ID do Pixel do TikTok. Carrega o `events.js`. Ainda não temos o ID. |
| `PAYMENTS_MODE` | servidor | `mercadopago` = pagamento real (docs/pagamentos.md). O Purchase só sai de pagamento real aprovado; bypass e teste nunca disparam. |
| `META_CAPI_TOKEN` | servidor | Token da Conversions API: manda o Purchase pelo servidor. |
| `TIKTOK_EVENTS_TOKEN` | servidor | Access token da Events API do TikTok: manda o CompletePayment pelo servidor. |
| `META_PIXEL_ID` / `TIKTOK_PIXEL_ID` | servidor (opcional) | Se ficarem vazias, o servidor usa os `VITE_*`. |
| `META_TEST_EVENT_CODE` / `TIKTOK_TEST_EVENT_CODE` | servidor (opcional) | Códigos de teste do Events Manager. Remova depois de validar. |

As `VITE_*` entram no build. Depois de criar ou trocar uma delas, faça um **redeploy**.

## Eventos

| Evento (Meta / TikTok) | Quando | Onde no código | Dados |
|---|---|---|---|
| PageView / `ttq.page()` | Ao abrir o site e a cada troca de rota do TanStack Router. Também pela CAPI (`src/lib/server/capi.ts`) com o mesmo `event_id = pv-<uuid>` | `src/routes/__root.tsx` (`Boot`) | — |
| ViewContent | Mensageiro visto ou escolhido no passo 3 ("Entregador"); 1x por mensageiro por sessão | `src/routes/escrever.tsx` | `content_ids` = id do mensageiro, `content_name` = nome, `value` = preço base, `currency` = BRL |
| InitiateCheckout | Abrir `/pagar` com carrinho; 1x por mensageiro + papel. Também pela CAPI com o mesmo `event_id = ic-<uuid>` | `src/routes/pagar.tsx` | mensageiro e valor total (BRL) |
| AddPaymentInfo | Toque em "Já paguei" (PIX) ou envio do cartão | `src/routes/pagar.tsx` (`pay`) | mensageiro, valor e `payment_type` (pix/card) |
| Purchase / CompletePayment | Só com pagamento real **aprovado** no Mercado Pago. Teste e bypass nunca disparam. | `pagar.tsx` → `finishPaid`; no servidor, `payments.server.ts` → `applyPayment` → `sendServerPurchase` (1x por pagamento) | `value` = valor pago, BRL, `content_ids` = mensageiro, `order_id` e `event_id = purchase-<id da carta>` |
| CompleteRegistration | Cadastro novo por e-mail (`/login` → "Criar conta"); sai na página seguinte ao redirect | `src/routes/login.tsx` + `queueEvent` | `method: email` |

Purchase sem duplicar:
- O navegador grava `trk:purchase:<id>` no localStorage. Recarregar a página não dispara de novo.
- O pixel e o envio pelo servidor usam o mesmo `event_id`, então Meta e TikTok deduplicam.

O Purchase sai com o mesmo `event_id` no pixel e no servidor, então o Meta e o TikTok deduplicam.

## Privacidade
- Nunca vai para os pixels nada da carta: texto, páginas, nomes, endereços, telefones.
- Vão só o id e o nome do mensageiro, o valor, o id da carta e o método de pagamento.
- No envio pelo servidor, o e-mail de quem pagou e o id do usuário seguem **em SHA-256** (minúsculas, sem espaços). Também vão o IP e o user agent do pedido, que é o padrão da CAPI e da Events API.
- Os cookies `_fbp`, `_fbc` e `_ttp` só existem se os pixels estiverem ligados.
- Para LGPD: quando os IDs forem ligados, convém um aviso de cookies ou consentimento.

## UTM e click ids
- Quando alguém entra no site, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `fbclid` e `ttclid` vão para o localStorage (`trk:attr`), junto com a página de entrada e o referrer. Vale o último toque com UTM.
- Isso é guardado mesmo sem pixel, só no navegador.
- No checkout, esses dados vão para o servidor e são gravados em **`letter_attribution`**: uma tabela nova, separada, com uma linha por carta.
  - Migration `migrations/0010_attribution.sql`: só `create table if not exists`.
  - Não toca em `letters` nem em `orders`. Cartas antigas só não têm linha.
- Dados de atribuição inválidos são ignorados e nunca impedem o pagamento.

Consulta útil:
```sql
select utm_source, utm_campaign, count(*), sum(o.total_brl)
from letter_attribution a join orders o on o.letter_id = a.letter_id
group by 1, 2 order by 3 desc;
```

## O que depende do domínio (cartaparaomeuamor.com.br)
1. **Meta:** verificar o domínio no Business Manager (meta-tag ou DNS TXT) e priorizar os eventos (Aggregated Event Measurement: Purchase primeiro).
2. **TikTok:** cadastrar o domínio no Events Manager do pixel.
3. **Cookies first-party:** `_fbp` e `_ttp` ficam no domínio final; os dados de teste do `*.vercel.app` não passam para lá.
4. **Links dos anúncios:** apontar para `https://cartaparaomeuamor.com.br/?utm_source=...`. O `fbclid` e o `ttclid` entram sozinhos.
5. `BETTER_AUTH_URL` / origin do domínio novo, para o `event_source_url` do servidor sair com o domínio certo.

## SETUP antes de gastar com Meta Ads (checklist)
1. Vercel → Settings → Environment Variables (Production e Preview):
   - `VITE_META_PIXEL_ID` (já existe em Production; criar em Preview se quiser testar no preview).
   - `META_CAPI_TOKEN` (Events Manager → Pixel → Configurações → Conversions API → Gerar token). **Sensível.**
   - `META_TEST_EVENT_CODE` só enquanto testa (Events Manager → Testar eventos → código `TEST…`). Remova depois.
   - Faça redeploy (as `VITE_*` entram no build).
2. Testar: Events Manager → Testar eventos → abra https://cartaparaomeuamor.com.br.
   Devem aparecer PageView do **Navegador** e do **Servidor**, marcados como deduplicados.
   Depois abra /pagar (InitiateCheckout, os dois). Purchase só num pagamento real aprovado.
3. Sem `META_CAPI_TOKEN`: o pixel funciona sozinho e o servidor não envia nada; o checkout nunca depende disso.
