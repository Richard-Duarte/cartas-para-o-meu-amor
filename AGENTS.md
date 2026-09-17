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

**Visual = Studio Think · Components = Ocha**

Not a pink Ocha clone. Not a pink SaaS romantic template.

| Layer | Source | Rules |
|-------|--------|--------|
| Canvas | Studio Think | Paper `#FEF5EC`, faint beige grid ~48px, generous gutters (~64px), long vertical whitespace (100–160px) |
| Type | Studio Think | Huge serif (Fraunces) with **tight** tracking `~-0.02em` — NOT wide Ocha letter-spacing. Manrope for nav/labels. Handwritten (`Just Me Again Down Here`) for annotations |
| Accent | Studio Think | Yellow pill CTA `#F7F780` + dark ink `#201F1D` + cream. Soft blush/pink **only** as secondary romantic accent on animal icons — never primary button fill |
| Layout | Studio Think | Centered hero, yellow highlight behind one word, hand annotations, fixed cream header ~58px, dark grid footer |
| Components | Ocha patterns | Sticky “Escrever uma carta” chip; InterleavingAnimals as SPECIALS (giant bg word + floating cutouts); process rows; cream menu list with prices; drifting review cards; dark final CTA panel |
| Motion | Blend | AnimatePresence cross-slide animals; scroll FadeIn; partially visible next cards in strips |

### Tokens

- Background paper: `#FEF5EC`
- Secondary off-white: `#FDFAF6`
- Ink: `#201F1D`
- Yellow CTA: `#F7F780`
- Soft blush (secondary only): `#F4B8C5` / `#E85A7A`

### Fonts

- Display/serif: Fraunces (tight tracking)
- Sans/UI: Manrope
- Hand annotations: Just Me Again Down Here

### Icons

Lucide / simple SVG messengers — no 3D.

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
