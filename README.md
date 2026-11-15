# Pago x Feito

Renovation ("obra") ledger for São Paulo apartment owners. The owner forwards what happens in the
obra and the app keeps an organized, up-to-date record: budget, suppliers, payments, NFs, contracts,
calendar, reminders. UI in pt-BR; code and commits in English.

Product spec: [docs/PRODUCT.md](docs/PRODUCT.md). Account setup: [SETUP.md](SETUP.md).

## Layout

```
apps/web              Next.js 16 (App Router) + Tailwind 4 + shadcn/ui, PWA
packages/core         domain logic: money (centavos), dates (pt-BR, São Paulo), holidays, summary, services
packages/db           Supabase migrations, generated types, typed client, seed
packages/extractors   Anthropic extractors + fixtures (from M4)
scripts/              env sync, db push/types/seed, icon generation
docs/                 spec, plans, gate reports
```

## Requirements

Node 22, pnpm 12, Supabase CLI 3 (`brew install node@22 pnpm supabase/tap/supabase`).

## Setup

1. Copy `.env.example` to `.env` and fill it following `SETUP.md`.
2. `pnpm install`
3. `pnpm env:sync` — writes `apps/web/.env.local` for the dev project.
4. `pnpm db:push:dev` — applies `packages/db/supabase/migrations` to pxf-dev.
5. `pnpm db:types` — regenerates `packages/db/src/database.types.ts`.
6. `pnpm db:seed:dev` — seeds the owner, building, BALT contract and first payment.
7. `pnpm dev` — http://localhost:3000

Production: `CONFIRM_PROD=yes pnpm db:push:prod`. Vercel env vars are the same names as
`apps/web/.env.local` with the prod project's values.

### Supabase dashboard settings (once per project)

- Authentication → URL Configuration: Site URL = the app URL; add
  `http://localhost:3000/auth/callback` and `https://<vercel-domain>/auth/callback` to Redirect URLs.
- Authentication → Email Templates → Magic Link: include both the link and the 6-digit code, e.g.
  `<p><a href="{{ .ConfirmationURL }}">Entrar no Pago x Feito</a></p><p>Ou digite o código: <b>{{ .Token }}</b></p>`.
  The code is what makes sign-in work inside the installed PWA on iPhone.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | web app in dev mode |
| `pnpm test` | Vitest across packages |
| `pnpm typecheck` | tsc across packages |
| `pnpm --filter @pxf/web test:e2e` | Playwright smoke tests |
| `pnpm db:push:dev` / `db:types` / `db:seed:dev` | database tasks against pxf-dev |

## Rules that apply everywhere

Money as integer centavos. Dates `dd/mm/aaaa`, timezone America/Sao_Paulo. AI proposes, user confirms.
One inbox for every channel. Domain logic in `packages/core`. Event log append-only (DB trigger).
RLS on every table. No CPF anywhere. Secrets only in env vars.
