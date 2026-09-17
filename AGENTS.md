<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Cartas para o meu amor — agent notes

## Product

Romantic letter delivery: write a letter → pick template → pick animal messenger (pombo / cavalo / jegue / instantâneo) → share link → track on map (later).

UI copy is **pt-BR**. Code, variables, and file names are **English**.

## Passo 1 (done)

Landing, design system, InterleavingAnimals, shadcn button/card, `/login` and `/escrever` placeholders. No backend.

## Do not install yet

Mapbox, Stripe, Resend — leave for later passos.

## Design rules

- Colors: cream `#F6EDE4`, blush `#F4B8C5`, pink `#E85A7A`, ink `#1A1410`, gold `#C4A35A`
- Fonts: Fraunces (display/titles, wide letter-spacing) + Geist (body)
- Feeling: soft rosy-beige background, pink + gold accents, cream whitespace (Ocha / Studio Think vibe)
- Motion: soft Framer Motion; animals crossfade + slide/scale via AnimatePresence
- Icons: Lucide where available; simple SVG/CSS for messengers — no 3D

## Next passos (suggested)

1. Letter editor + templates
2. Messenger selection + mock delivery timeline
3. Shareable link / letter view
4. Map tracking (Mapbox)
5. Auth, Stripe checkout, Resend e-mail

## Conventions

- App Router under `src/app`
- Alias `@/*` → `src/*`
- Prefer client components only when needed (motion, interactivity)
- Keep mobile-first layout
