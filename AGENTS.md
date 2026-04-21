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
| AI | Anthropic SDK v0.82 (`@anthropic-ai/sdk`) | Claude drives intake chat + scope generation. |
| Background jobs | Inngest v4.1 | 2-arg `createFunction` API. Only fires when `INNGEST_EVENT_KEY` is set — empty key causes SDK to hang trying localhost:8288. |
| Email | Resend v6 | `lib/resend.ts` lazy singleton. **Sender domain `notifications@monocular.so` must be verified in Resend dashboard before emails deliver.** |
| PDF | `@react-pdf/renderer` v4.3 | Used in `/api/scopes/[id]/export` route. |
| Validation | Zod v4.3 | |
| Styling | Tailwind CSS | Orange brand color: `orange-500` / `#F97316`. |

---

## Project structure

```
app/
  app/
    (auth)/           # sign-in, sign-up pages
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
  lib/
    db/index.ts       # lazy Drizzle singleton (Proxy pattern)
    db/schema.ts      # agencies, projectTypes, intakeLinks, intakeIterations, scopes
    anthropic.ts
    prompts/          # intake + generation system prompts
    prompts/core-behavior.ts  # plain prose only in chat — no markdown
    run-generate-scope.ts     # shared generation logic
    schemas.ts        # Zod shape for GeneratedScope
    resend.ts         # lazy Resend singleton
  types/              # Message, GeneratedScope, RiskFlag, ReviewFlag, etc.
  proxy.ts            # Clerk middleware (Next.js 16: proxy.ts not middleware.ts)
```

---

## Next.js 16 breaking changes

- **Middleware file is `proxy.ts`**, not `middleware.ts`.
- **Dynamic params are a Promise**: always `await params` before use.
- **`searchParams` is a Promise** in page components.
- **`cookies()` and `headers()`** are async — `await cookies()`.
- **`after()` from `next/server`** runs post-response. Requires `experimental: { after: true }` in `next.config.ts`.

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
- **Marketing website** (P1) — new `(marketing)` route group replacing the static `monocular.html`; pricing page, all nav links wired, login/signup CTAs connected
- **Custom auth pages** (P1) — replace bare `<SignIn />` / `<SignUp />` Clerk embeds with custom-designed pages using Clerk's headless `useSignIn()` / `useSignUp()` hooks
- **Team management / admin console** (P2) — Clerk org memberships → product roles (Admin, Member)
- **Production infrastructure wiring** (P2) — `INNGEST_EVENT_KEY`/`INNGEST_SIGNING_KEY`, Clerk webhook prod URL, Resend sender domain verification

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
