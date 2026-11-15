# Pago x Feito — product spec (v0 → v2)

Renovation ("obra") ledger for São Paulo apartment owners. The owner forwards what happens in
the obra, and the app turns it into an organized, up-to-date record, with reminders,
building-rule checks, paperwork and answers in the owner's own AI.

Jorge is building it by using it on his own obra fina first, then it becomes a product for
other owners in São Paulo. A California version is out of scope.

## Versions and gates

- **v0 — Reliable records**: budget, suppliers, payments, NFs, contracts, calendar, upload inbox, reminders.
- **v1 — Differentiators**: WhatsApp intake, chat exports, voice notes, building rulebook and checks, Claude/ChatGPT connector.
- **v2 — Ready for other owners**: native app, paperwork generator, engineer as a member, warranties and post-obra mode, selling, onboarding.

Gates are mandatory. Each version ends with a gate report (what was built and how to try it
on the phone; test results and known bugs; what field notes changed; proposed plan for the next
version). The next version does not start until Jorge replies "approved". Inside a version,
each milestone ends with something that opens on the phone.

## Rules for every version

- UI in Brazilian Portuguese. Currency BRL (R$ 1.234,56). Dates dd/mm/aaaa. Timezone America/Sao_Paulo. Code, comments, commits in English.
- Mobile-first; must work well at 390px.
- The AI proposes, the user confirms. Nothing touching money, dates or approvals is saved without a tap. Every proposal shows its source document.
- Money stored as integer centavos. Never floats.
- One inbox for every channel: uploads, WhatsApp, chat exports and email all become `inbox_items` and share one extraction pipeline.
- Domain logic lives in `packages/core`, called by web, jobs, WhatsApp webhook and MCP. Never in UI components.
- Event log is append-only, enforced in the database.
- LGPD: store only what is needed; private storage with signed URLs; no CPF in seed data, logs or debugging prompts; RLS on every table; data in São Paulo region.
- Ask before: schema changes after the first milestone of a version, paid services or dependencies, anything that deletes data, stack changes.
- Tests: Vitest for money, date, calendar and rule logic. Playwright smoke tests for main flows. Each AI extractor has a fixture set with expected outputs, run in CI.
- Secrets only in env vars. Keep `.env.example` and README current.

## Stack

TypeScript monorepo (pnpm): `apps/web`, `apps/mobile` (v2), `apps/mcp` (v1), `packages/core`,
`packages/extractors`, `packages/db`. Next.js App Router + Tailwind + shadcn/ui on Vercel, PWA.
Supabase (Postgres, Auth, Storage, RLS, Edge Functions, pg_cron) in sa-east-1. Queue: `inbox_items`
+ worker in v0, managed queue in v1. AI: Anthropic API with tool use / structured output validated
by zod; fast cheap model for classification and receipts, stronger model for contracts and building
documents; model names in config. Excel: SheetJS deterministic first. STT (v1): pt-BR API chosen in
v1 plan. Email: Resend. WhatsApp (v1): Meta Cloud API only. Connector (v1): remote MCP, OAuth 2.1 +
PKCE. Mobile (v2): Expo/EAS. Product payments (v2): Pix + card provider, web checkout.

## Cost guardrails

Self-funded beta. Tell Jorge before anything adds a recurring charge. Cheapest model that passes
the fixtures per document type. Prompt caching; Batch API for non-urgent work. Split very long
documents (owner's manual has 158 pages). Log tokens and cost of every AI call per obra; admin cost
view. Prefer push and email for reminders; WhatsApp templates only when opted in.

## Data model (starting point)

See `packages/db/supabase/migrations` for the implemented v0 schema. Spec tables: buildings,
building_documents, building_rules (v1), obras, obra_members, suppliers, budget_lines, contracts,
installments, payments, tasks, warranties (v2), maintenance_items (v2), documents, inbox_items,
approvals (v1), events (append-only).

## Seed (Jorge's real obra)

- Building: Condomínio Leaf Loefgren, Vila Clementino, São Paulo. Work hours Mon–Fri 08:00–17:00,
  Sat 08:00–12:00, no Sundays or holidays.
- Supplier: BALT Arquitetura LTDA (cost estimate service).
- Contract R$ 4.500,00 in 2 × R$ 2.250,00. 1st due 21/10/2026, paid 23/10/2026 by Pix, NF pending.
  2nd due 18/11/2026 on delivery of the planilha. Estimate valid 15 days; tacit approval after 5
  business days; hourly rate R$ 700; holiday shutdown 19/12/2026–05/01/2027.
- Full supplier budget arrives around 18/11/2026.

## v0 scope

1. Budget import (Excel, PDF fallback) with column-mapping preview.
2. Money per line: budgeted, contracted, paid, still owed; obra summary.
3. Payments with receipt and NF status; pending-NF list; pt-BR follow-up message for WhatsApp.
4. Contracts: PDF upload, AI proposes installments and deadlines, user confirms.
5. Calendar with finish-to-start dependencies, recalculation preview, work-hours flags.
6. Inbox (upload only): photo/PDF/Excel/receipt → extraction → proposal → Confirm / Edit / Discard.
7. Daily reminder email: installments due, NFs pending > N days, estimates expiring, tacit-approval windows, worker registration 2 days before.
8. Event log view.

Milestones: M1 auth + obra/building + suppliers + budget lines + summary. M2 payments/NF. M3 Excel
import. M4 inbox extraction (Pix receipts, NFs, contracts). M5 calendar. M6 digest + event log.

Gate 0: used on the real obra for 2+ weeks; money summary matches bank/Pix to the centavo; no
payment or date saved without confirmation; trusted more than notes and WhatsApp scrolling.

## v1 and v2 scope

Kept in the original brief (WhatsApp Cloud API intake with Sim/Corrigir/Descartar, chat export
import with incremental dedupe, voice notes, approvals log, building rulebook shared per building,
remote MCP connector with read/write tools and `export_obra_brief`; then Expo app with share
extension and Android notification capture, paperwork generator (NBR 16280), member roles,
warranties and post-obra mode, product payments, self-serve onboarding, landing page, LGPD
essentials, analytics). Detailed plans are written at each gate.
