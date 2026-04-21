# Monocular — Agent & Developer Guide

## What this project is

Monocular is a multi-tenant SaaS for service businesses (agencies, consultants, studios, and beyond). Firms create intake links, send them to clients, and the app uses AI to turn the client's chat responses into a structured project scope document. Firms then review, edit, and export the scope as a PDF. Long-term direction: evolve from a scoping tool into a scoping engine with a public API, integrations, and vertical expansion.

---

## Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16.2.2 | App Router. See breaking changes below. |
| React | 19.2.4 | |
| Auth | Clerk v7 (`@clerk/nextjs`) | Organizations used for multi-tenancy. Middleware in `proxy.ts` (not `middleware.ts`). |
| Database | Supabase Postgres + Drizzle ORM v0.45 | Lazy singleton init — never import `db` at module level in a way that runs at build time. |
| File storage | Supabase Storage | Bucket: `scope-pdfs` |
| AI | Anthropic SDK v0.82 (`@anthropic-ai/sdk`) | Claude drives intake chat + scope generation. Prompt caching enabled on all system prompts. |
| Background jobs | Inngest v4.1 | 2-arg `createFunction` API. Only fires when `INNGEST_EVENT_KEY` is set — empty key causes SDK to hang trying localhost:8288. |
| Email | Resend v6 | `lib/resend.ts` lazy singleton. **Sender domain `notifications@monocular.so` must be verified in Resend dashboard before emails deliver.** |
| PDF | `@react-pdf/renderer` v4.3 | Used in `/api/scopes/[id]/export` route. |
| Validation | Zod v4.3 | |
| Styling | Tailwind CSS + shadcn/ui | Orange brand color: `orange-500` / `#F97316`. Font: Plus Jakarta Sans. `components.json` present. |
| Auth UI | DitheringShader (WebGL2) | Wave background on auth pages. `components/ui/dithering-shader.tsx` + `wave-background.tsx`. |

---

## Project structure

```
app/
  app/
    (auth)/           # sign-in, sign-up — custom wave bg + transparent Clerk panels
      layout.tsx      # WaveBackground + ThemeSegment toggle + Clerk branding CSS suppression
      sign-in/        # ClerkSignIn client component
      sign-up/        # ClerkSignUp client component
    (marketing)/      # public marketing site — COMING (Claude Design handoff)
    (dashboard)/      # authenticated area — layout: h-screen overflow-hidden
      dashboard/      # overview: recent scopes + top intake links
      intake/         # intake link management (create, copy, deprecate, delete)
      scopes/         # scope pipeline (filterable list, auto-polls while generating)
      scopes/[id]/    # scope editor (2-panel: editor + transcript, draggable)
      account/        # org profile + AI preferences + intake defaults
      settings/       # project-types hub
    create-org/       # post-signup org creation
    intake/[token]/   # public client-facing chat (no auth)
    review/[token]/   # public client scope review (no auth)
    api/
      intake/start|message|complete
      links/          # CRUD intake links
      links/[id]/     # PATCH (name, isDeprecated, context fields) + DELETE
      scopes/         # list + get/patch
      scopes/[id]/generate/     # re-trigger generation
      scopes/[id]/export/       # generate + upload PDF
      scopes/[id]/send/         # email PDF to client
      scopes/[id]/review-link/  # generate opaque reviewToken
      settings/project-types/   # CRUD project types
      webhooks/clerk/           # org.created → seed agency + default project types
      inngest/                  # Inngest webhook receiver
  inngest/
    client.ts
    functions/generate-scope.ts
  components/
    ThemeProvider.tsx # theme context: light/dark/system, reads localStorage, no flash
    ThemeToggle.tsx   # ThemeToggle (single icon cycle) + ThemeSegment (3-button control)
    auth/
      clerk-sign-in.tsx     # theme-aware Clerk SignIn with transparent appearance
      clerk-sign-up.tsx     # theme-aware Clerk SignUp with transparent appearance
      hide-clerk-banner.tsx # MutationObserver — removes Clerk branding after mount
    ui/
      dithering-shader.tsx  # WebGL2 canvas: simplex/wave/ripple/swirl shaders
      wave-background.tsx   # full-screen wave, theme-aware (dark=black+orange, light=white+orange)
      Badge.tsx
  lib/
    db/index.ts       # lazy Drizzle singleton (Proxy pattern)
    db/schema.ts      # agencies, projectTypes, intakeLinks, intakeIterations, scopes
    anthropic.ts      # INTAKE_MODEL=haiku-4-5, GENERATION_MODEL=sonnet-4-6
    prompts/          # intake + generation system prompts
    prompts/core-behavior.ts       # plain prose only in chat — no markdown
    prompts/generation.ts          # buildGenerationSystemPrompt + buildGenerationUserPrompt (split for caching)
    run-generate-scope.ts          # shared generation logic
    schemas.ts        # Zod shape for GeneratedScope
    resend.ts         # lazy Resend singleton
  types/              # Message, GeneratedScope, RiskFlag, ReviewFlag, etc.
  proxy.ts            # Clerk middleware (Next.js 16: proxy.ts not middleware.ts)
  components.json     # shadcn/ui config
```

---

## Next.js 16 breaking changes

- **Middleware file is `proxy.ts`**, not `middleware.ts`.
- **Dynamic params are a Promise**: always `await params` before use.
- **`searchParams` is a Promise** in page components.
- **`cookies()` and `headers()`** are async — `await cookies()`.
- **`after()` from `next/server`** runs post-response. Stable since Next.js 15.1 — do NOT add `experimental: { after: true }`, that flag was removed and breaks the build.

---

## Clerk v7 conventions

- `auth()` is async: `const { orgId, userId } = await auth()`
- `orgId` scopes all data — every agency, project type, scope, and intake link is org-scoped
- Webhook at `/api/webhooks/clerk` handles `organization.created` to seed the agency row

---

## Database patterns

The DB singleton uses a Proxy to defer init until first use — prevents build-time crashes. **Do not** refactor to top-level `const db = drizzle(...)`.

Connection string priority: `DATABASE_URL` → `POSTGRES_URL` (Vercel injects `POSTGRES_URL`).

---

## Intake link behavior

- Links are **reusable** — one link can produce multiple scope iterations over time.
- `usedAt` = last completed iteration timestamp, **not** a one-time-use lock.
- Deactivate by setting `isDeprecated = true` via PATCH `/api/links/[id]`.
- `intakeIterations` table stores per-round summaries for iterative memory injection.

---

## Scope generation

Two paths — both use `lib/run-generate-scope.ts`:
1. **Inline via `after()`**: fires immediately after `/api/intake/complete` responds.
2. **Inngest background**: only when `INNGEST_EVENT_KEY` is set.

Scope editor polls `/api/scopes/[id]` every 4s while `generatedScope` is null. Retry button calls `POST /api/scopes/[id]/generate`.

---

## What's not built yet (active pipeline)

See `ROADMAP.md` for the full phased plan. Key upcoming work:

- **Stripe billing** (P1) — subscriptions, paywall middleware, usage limits, billing portal; adds `stripeCustomerId`, `stripeSubscriptionId`, `plan`, `planStatus`, `trialEndsAt` to `agencies` table; new env vars `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- **Marketing website** (P1) — `(marketing)` route group; Claude Design prompt in `CLAUDE-DESIGN-PROMPT.md` at repo root; pages: `/`, `/pricing`, `/docs`, `/support`
- **Team management / admin console** (P2) — Clerk org memberships → product roles (Admin, Member)
- **Production infrastructure wiring** (P2) — upgrade Vercel to Pro (12-function Hobby limit blocks deploys), switch Clerk to production keys (`pk_live_`/`sk_live_`), verify Resend sender domain

## Known production blockers

See `CHANGELOG.md` 2026-04-21 entry for full details.

- 🔴 **Vercel Hobby plan** — 12 serverless function limit blocks every GitHub-triggered deploy. Upgrade team `prabhu-kiran-avulas-projects` to Pro at vercel.com.
- 🟡 **Clerk dev keys in prod** — `pk_test_`/`sk_test_` keys are set in Vercel production env. Switch to production instance in Clerk dashboard before going live.

---

## Environment variables

```
DATABASE_URL                        # Supabase direct (local dev)
POSTGRES_URL                        # Injected by Vercel Supabase integration (prod)
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
CLERK_WEBHOOK_SECRET
ANTHROPIC_API_KEY
RESEND_API_KEY
INNGEST_EVENT_KEY                   # Optional in dev — required in prod
INNGEST_SIGNING_KEY
NEXT_PUBLIC_APP_URL
STRIPE_SECRET_KEY                   # Coming Phase 1
STRIPE_PUBLISHABLE_KEY              # Coming Phase 1
STRIPE_WEBHOOK_SECRET               # Coming Phase 1
```

---

## Changelog

After each coding session, append an entry to `CHANGELOG.md`:
`## [YYYY-MM-DD] <summary of what changed>`
