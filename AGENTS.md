<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Cartas para o meu amor — agent notes

## Product

Romantic letter delivery: write a letter → pick template → pick animal messenger → share link → track on map (later).

UI copy is **pt-BR**. Code, variables, and file names are **English**.

## Passo 1 (done)

Landing, design system, InterleavingAnimals with 3D mascot JPGs, shadcn button/card, `/login` and `/escrever` placeholders. No backend.

## Do not install yet

Mapbox, Stripe, Resend — leave for later passos.

## Design rules

**Design source of truth = Cream editorial storybook** (NOT QuizHub pink SaaS).

Inspired by Framer romantic product landings: Amorette, WeddingDay, New Chapter, All Natural, ComingSo Interactive, Bloome/Lunea softness.

| Layer | Rules |
|-------|--------|
| Canvas | Warm cream `#FBF6F0` / `#FEF5EC` — never flat neon pink |
| Ink | `#2A211C` |
| Accents | Soft blush `#E8A0B0`, coral, peach, muted gold `#C4A35A`, soft sky, olive (tartaruga) |
| Cards | Soft paper: white, light border, soft shadow — rounded-3xl, generous whitespace |
| Type | **Fraunces** (serif display) for emotional headlines; **DM Sans** for UI/nav/body |
| Buttons | Soft rounded-full, medium weight — blush primary / ink secondary; no harsh uppercase border chrome |
| Header | Cream sticky + blur, refined serif logo, Entrar + Começar |
| Hero | Centered emotional composition + InterleavingAnimals diorama (real JPG mascots) |
| Motion | Framer Motion, romantic easing `cubic-bezier(0.22, 1, 0.36, 1)` — scroll FadeIn, hover lift/tilt |

### Messengers (assets in `public/messengers/`)

| id | File | Personality cue |
|----|------|-----------------|
| pombo | pombo.jpg | Classic pigeon + pink bow |
| cavalo | cavalo.jpg | Horse with satchel |
| tartaruga | tartaruga.jpg | Slow & steady (replaces jegue) |
| cegonha | cegonha.jpg | Stork with parcel |
| ganso | ganso.jpg | Goose with floating envelope |
| aviao | aviao.jpg | Toy airplane — instant |

Use `next/image`. Soft drop shadows. Hover: slight tilt, float/bob, scale.

Shared data: `src/lib/messengers.ts`.

### Tokens (`src/styles/theme.css`)

- Background: `#FBF6F0`
- Foreground: `#2A211C`
- Primary: soft blush rose `#C4788A`
- Secondary: muted gold `#C4A35A`
- Shadows: `--shadow-soft`, `--shadow-lift`, `--shadow-mascot`
- Washes: `--wash-blush`, `--wash-gold`, `--wash-peach`

### Fonts

- Display/headings: Fraunces
- UI/body: DM Sans

### Utilities (`src/app/globals.css`)

`.btn-filled`, `.btn-transparent`, `.heading-xl` / `.heading-lg` / `.heading-md` / `.heading-sm`, `.eyebrow`, `.nav-text`, `.prose-romantic`, `.paper-card`, `.ambient-wash`, `.card-hover`, `.mascot-bob`

### Page chapters (landing)

1. Hero (centered + mascot diorama)
2. Como funciona (editorial steps)
3. Mensageiros `#mensageiros` (6 cards)
4. Quote / emotional strip
5. Final CTA (envelope feeling)
6. Minimal footer

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
