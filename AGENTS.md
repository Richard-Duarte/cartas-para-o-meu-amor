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

**Design source of truth = QuizHub** (`Richard-Duarte/quizhub`)

Same product family as QuizHub: pink canvas, bold uppercase DM Sans, Lora body/serif moments, multi-column hero, bordered wine cards. Content stays Cartas (messengers), not quizzes.

| Layer | Source | Rules |
|-------|--------|--------|
| Canvas | QuizHub | Solid brand pink `#cf4c67` / `oklch(59.5% 0.166 8)`, white foreground |
| Cards | QuizHub | Deeper wine `oklch(47% 0.155 8)`, `border-2 border-foreground`, `rounded-3xl` / radius `1.5rem` |
| Type | QuizHub | DM Sans for headings/nav — black/extrabold UPPERCASE, `tracking-tighter` on huge titles, leading ~0.85–0.9; Lora for body/serif moments |
| Buttons | QuizHub | `rounded-full`, uppercase bold, `border-2 border-foreground`; primary deep wine; outline-white on colored columns |
| Header | QuizHub | Sticky pink bg, italic serif/bold logo, `.nav-text` links, filled CTA with ArrowRight |
| Hero | QuizHub × Cartas | Full-bleed color columns (one per messenger: pink / blue / green / orange) |
| Sections | QuizHub × Cartas | Feature cycler over photo + CyclerNav; testimonials auto-cycle; messenger pricing cards; FAQ accordion; CTA banner; inverted footer |
| Motion | QuizHub | `cubic-bezier(0.34, 1, 0.64, 1)`; `useAutoCycle` + `CyclerNav` |

### Tokens

- Background: `#cf4c67` / `oklch(59.5% 0.166 8)`
- Foreground: white
- Card: `oklch(47% 0.155 8)`
- Primary: deep wine
- Vibrant cards: yellow, purple, magenta, blue, coral, mint, orange, lavender
- Radius: `1.5rem`

### Fonts

- Sans/UI/headings: DM Sans
- Serif/body moments: Lora

### Utilities (`src/app/globals.css`)

`.btn-filled`, `.btn-transparent`, `.heading-xl` / `.heading-lg` / `.heading-md` / `.heading-sm`, `.nav-text`, `.body-text`, `.card-hover`, `.cycler-tabs-nav`

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
