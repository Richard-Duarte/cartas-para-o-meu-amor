# Cartas para o meu amor

App romântico de entrega de cartas: escreva uma carta, escolha um template e um mensageiro (pombo, cavalo, jegue ou instantâneo), compartilhe um link e, em breve, acompanhe a jornada no mapa.

Este repositório contém o **Passo 1**: landing page, design system e placeholders (`/login`, `/escrever`). Editor, mapa, pagamentos e e-mail ainda não fazem parte deste passo.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- shadcn/ui (button, card)
- Framer Motion
- Lucide React + SVGs dos mensageiros

## Como rodar

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

### Scripts

| Comando        | Descrição              |
|----------------|------------------------|
| `npm run dev`  | Servidor de desenvolvimento |
| `npm run build`| Build de produção      |
| `npm run start`| Serve o build          |
| `npm run lint` | ESLint                 |

## Estrutura (Passo 1)

- `src/app/page.tsx` — landing (pt-BR)
- `src/app/login` / `src/app/escrever` — placeholders
- `src/components/interleaving-animals.tsx` — ciclo dos mensageiros
- `src/components/display-title.tsx` — títulos com tracking largo
- `src/components/ui/*` — shadcn button + card
- `AGENTS.md` — regras de produto e design para próximos passos

## Design

Paleta: cream `#F6EDE4`, blush `#F4B8C5`, pink `#E85A7A`, ink `#1A1410`, gold `#C4A35A`.  
Fontes: Fraunces (títulos) + Geist (corpo).
