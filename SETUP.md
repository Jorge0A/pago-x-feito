# Pago x Feito — account setup guide (v0)

Do these in order. Everything here is free except the Anthropic key, which is pay per use
with a US$ 20 monthly cap. Paste every key into the `.env` file next to this guide,
never into chat. The `.env` file stays on your Mac and is never committed.

Time needed: about 30 minutes.

---

## 1. GitHub — private repo (5 min)

1. Go to https://github.com/new
2. Repository name: `pago-x-feito`
3. Visibility: **Private**
4. Leave "Add a README", ".gitignore" and "license" **unchecked** (the repo must be empty).
5. Click **Create repository**.
6. Copy the HTTPS URL shown (looks like `https://github.com/<you>/pago-x-feito.git`)
   and paste it into `.env` as `GITHUB_REPO_URL`.

Later I will run `gh auth login` on your Mac. It opens a browser page where you approve
the GitHub CLI once. I will tell you when.

---

## 2. Supabase — two projects in São Paulo (10 min)

1. Go to https://supabase.com/dashboard and sign in with GitHub.
2. If asked, create an organization (any name, **Free** plan).
3. Click **New project** and fill in:
   - Name: `pxf-dev`
   - Database password: click **Generate a password**, then **copy it right away**
     and paste it into `.env` as `SUPABASE_DEV_DB_PASSWORD`. It is shown only once
     (you can reset it later under Project Settings → Database if you lose it).
   - Region: **South America (São Paulo)** — this is `sa-east-1`. Do not accept any other region.
   - Click **Create new project** and wait 1–2 minutes.
4. Open the project, then **Project Settings** (gear icon, bottom left) → **API** (or **API Keys**):
   - **Project URL** → `.env` as `SUPABASE_DEV_URL`
   - **anon / public** key (newer dashboards call it **publishable**) → `SUPABASE_DEV_ANON_KEY`
   - **service_role** key (newer dashboards call it **secret**; click "Reveal") → `SUPABASE_DEV_SERVICE_ROLE_KEY`
5. Repeat steps 3–4 for a second project named `pxf-prod`, filling the `SUPABASE_PROD_*` lines.

Notes
- The Free plan allows two active projects, which is exactly these two.
- Free projects pause after 7 days without traffic. The daily cron job we add in M6 keeps
  `pxf-prod` awake. If a project is paused, just click **Restore** in the dashboard.
- Supabase Pro (about US$ 25/month, daily backups) is a decision for the start of M2,
  when your real payments go in. Nothing to do now.

Later I will run `supabase login` on your Mac. It opens a browser page where you approve
the Supabase CLI once.

---

## 3. Vercel — Hobby account (3 min)

1. Go to https://vercel.com/signup and choose **Continue with GitHub**.
2. Plan: **Hobby** (free, personal use).
3. Stop there. Do **not** import the repo yet: it is empty. I will link the repo and
   set the environment variables from the CLI after the first push, and I will ask you to
   approve `vercel login` in the browser at that moment.

Reminder: Hobby forbids commercial use. When other owners start paying (v2) it moves to Pro.

---

## 4. Anthropic — API key paid by your Max plan credits (5 min)

Your Max plan includes US$ 100 per month of API credits. They cover the Claude API the app
uses (not Claude Code), expire monthly with no rollover, and need no card in the Console.

1. In the Console (https://platform.claude.com), create a new organization named
   `Pago x Feito` (organization switcher, top left → Create organization). Do not use
   your company's organization: the credit link is permanent and only support can move it.
2. On claude.ai go to **Settings → Billing → API credits → Link organization**, choose
   `Pago x Feito`, accept the Supplemental Credit Terms and link. The credits appear under
   **Promotional credits** on the Console Billing page.
3. In the Console, create a **workspace** named `pago-x-feito` and set its
   **monthly spend limit to US$ 20**. This is the runaway guard: a bug stops at US$ 20,
   not at US$ 100.
4. Inside that workspace, **API Keys → Create key**, name `pago-x-feito-dev`. Copy it once
   and paste into `.env` as `ANTHROPIC_API_KEY`.
5. Leave auto-reload **off**. If credits ever run out, requests stop; nothing is charged.

## 5. Resend — e-mail API key (3 min)

1. Go to https://resend.com/signup and create an account with the e-mail address you
   want the reminder digest sent to.
2. Verify your e-mail address when Resend asks.
3. **API Keys → Create API Key**. Name `pago-x-feito`, permission **Sending access**.
   Copy it once and paste into `.env` as `RESEND_API_KEY`.
4. Also put that same e-mail address into `.env` as `OWNER_EMAIL`.

Note: without a verified domain, Resend's free tier only delivers to the address of the
account owner, from `onboarding@resend.dev`. That is enough for v0. The `.com.br` domain
arrives in v1.

---

## 6. Local tools (I do this, you say OK)

With your OK I will install, via Homebrew, all free:

- Node 22 LTS and pnpm
- Supabase CLI
- GitHub CLI (`gh`)
- Vercel CLI

Two of them need a one-time browser approval from you (`gh auth login`, `supabase login`,
and later `vercel login`). I will tell you when each window opens.

---

## 7. Check before telling me "ready"

- [ ] `.env` has no empty value left except the ones marked optional.
- [ ] Both Supabase projects show **South America (São Paulo)** on their overview page.
- [ ] Anthropic: `Pago x Feito` org linked to your Max credits, workspace limit US$ 20.
- [ ] GitHub repo is private and empty.

Then reply "ready" (and "approved" for the v0 plan if you have not yet) and I start M1.
