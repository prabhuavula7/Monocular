# Monocular — Agent & Developer Guide

## What this project is

Monocular is a multi-tenant SaaS for digital agencies. Agencies create intake links, send them to clients, and the app uses AI to turn the client's chat responses into a structured project scope document. Agencies then review, edit, and export the scope as a PDF.

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
| Background jobs | Inngest v4.1 | 2-arg `createFunction` API. Function at `inngest/functions/generate-scope.ts`. Only fires when `INNGEST_EVENT_KEY` is set — empty key causes SDK to hang trying localhost:8288. |
| Email | Resend v6 | Currently stubbed — key present, no sends wired yet. |
| PDF | `@react-pdf/renderer` v4.3 | Used in `/api/scopes/[id]/export` route. |
| Validation | Zod v4.3 | |
| Styling | Tailwind CSS | Orange brand color: `orange-500` / `#F97316`. |

---

## Project structure

```
app/
  app/
    (auth)/           # sign-in, sign-up pages (Clerk hosted UI)
    (dashboard)/      # authenticated area — layout: h-screen overflow-hidden
      dashboard/      # overview: recent scopes + top intake links
      intake/         # intake link management (create, copy, deprecate, delete)
      scopes/         # scope pipeline (filterable list, auto-polls while any scope is generating)
      scopes/[id]/    # scope editor (2-panel: editor + transcript)
      account/        # org profile + AI preferences + intake defaults
      settings/       # hub: links to project-types and account
      settings/project-types/         # list + toggle/delete
      settings/project-types/[id]/    # edit a project type
    create-org/       # post-signup org creation (Clerk CreateOrganization)
    intake/[token]/   # public client-facing chat (no auth required)
    api/
      intake/start|message|complete   # intake chat endpoints (streaming SSE)
      links/                          # CRUD intake links (reusable, no default expiry)
      links/[id]/                     # PATCH (name, isDeprecated) + DELETE
      scopes/                         # list scopes
      scopes/[id]/                    # get/patch scope
      scopes/[id]/generate/           # POST — re-trigger scope generation synchronously
      scopes/[id]/export/             # generate + upload PDF, return URL
      settings/                       # get/patch agency profile (name syncs to Clerk)
      settings/project-types/         # CRUD project types
      webhooks/clerk/                 # org.created → seed agency + default project types
      inngest/                        # Inngest webhook receiver
  inngest/
    client.ts                         # Inngest client singleton
    functions/generate-scope.ts       # background scope generation (calls lib/run-generate-scope)
  lib/
    db/index.ts       # lazy Drizzle singleton (Proxy pattern — read this before touching DB init)
    db/schema.ts      # Drizzle schema: agencies, projectTypes, intakeLinks, scopes
    supabase.ts       # lazy Supabase client singleton
    anthropic.ts      # Anthropic client
    prompts/          # system prompts for intake chat and scope generation
    prompts/core-behavior.ts  # FORMATTING section: plain prose only, no markdown in chat
    run-generate-scope.ts     # shared scope generation logic (used by after() and Inngest)
    schemas.ts        # Zod schemas for generated scope shape
    defaults.ts       # default project types seeded on org creation
    utils.ts          # formatRelativeTime, etc.
  components/
    dashboard/
      CreateLinkModal.tsx
      ScopeStatusBadge.tsx
      Sidebar.tsx       # fixed sidebar: active nav states, primary + secondary nav, theme toggle
    ThemeProvider.tsx   # FOUC prevention — inline script lives in app/layout.tsx <head>, not here
    ThemeToggle.tsx
  types/              # shared TypeScript types (Message, GeneratedScope, RiskFlag, etc.)
  proxy.ts            # Clerk middleware (Next.js 16 uses proxy.ts, not middleware.ts)
```

---

## Next.js 16 breaking changes you must know

- **Middleware file is `proxy.ts`**, not `middleware.ts`. Both the file name and export name changed.
- **Dynamic route params are a Promise**: `params: Promise<{ id: string }>` — always `await params` before accessing values.
- **`searchParams` is also a Promise** in page components — same pattern.
- **`cookies()` and `headers()`** from `next/headers` are now async — `await cookies()`.
- **`notFound()` and `redirect()`** are still synchronous throws — do not await them.
- **`after()` from `next/server`** runs code after the response is flushed. Requires `experimental: { after: true }` in `next.config.ts`. Used for inline scope generation post-intake.
- Read `node_modules/next/dist/docs/` for the full migration guide before writing new route handlers or page components.

---

## Clerk v7 conventions

- `auth()` is async: `const { orgId, userId } = await auth()`
- Use `orgId` for all multi-tenant queries — every agency, project type, and scope is scoped to an org
- Webhook at `/api/webhooks/clerk` handles `organization.created` to seed the agency row
- `CLERK_WEBHOOK_SECRET` must match the signing secret in the Clerk dashboard
- Org name can be synced via `clerkClient().organizations.updateOrganization(orgId, { name })` — done in `/api/settings` PATCH

---

## Database patterns

The DB singleton uses a Proxy to defer initialization until first use. This prevents build-time crashes when `DATABASE_URL` isn't available. **Do not** refactor to top-level `const db = drizzle(...)`.

```ts
// Correct — uses the proxy export
import { db } from '@/lib/db'
const rows = await db.select().from(agencies).where(...)
```

Connection string priority: `DATABASE_URL` → `POSTGRES_URL` (Vercel Supabase integration injects `POSTGRES_URL`).

---

## Intake link behavior

- Links are **reusable by default** — no `expiresAt` set on creation.
- `usedAt` is updated to `now()` on each session start (tracks last use, does not block reuse).
- A link is deactivated by setting `isDeprecated = true` via PATCH `/api/links/[id]`.
- `expiresAt` is optional and still checked — set explicitly if time-limited links are needed.
- Stale incomplete sessions for a link are cleared when the same link is started again after a prior completion.

---

## Scope generation

Generation runs two ways:
1. **Inline via `after()`**: `/api/intake/complete` calls `runGenerateScope(scopeId)` inside `after()` — fires immediately post-response, no queue needed.
2. **Inngest background job**: only triggered when `INNGEST_EVENT_KEY` is set (guards against SDK hang in dev with empty keys).

Both paths use `lib/run-generate-scope.ts`. The scope editor polls `/api/scopes/[id]` every 4s while `generatedScope` is null, and offers a "retry" button that calls POST `/api/scopes/[id]/generate`.

---

## Sidebar layout

The dashboard layout uses `h-screen overflow-hidden` on the outer container. The sidebar has `h-full`. The `<main>` gets `overflow-y-auto`. This ensures the sidebar never scrolls and is always full-height.

Active nav item styling: `bg-orange-dim text-orange font-medium`.

After any settings save that changes agency-level data, call `router.refresh()` to re-run server components and propagate the new values (e.g., org name in the sidebar).

---

## Known broken links (fix before shipping)

`app/app/(dashboard)/settings/project-types/page.tsx`:
- Line 44: back link → `/dashboard/settings` should be `/settings`
- Line 84: Edit link → `/dashboard/settings/project-types/${id}` should be `/settings/project-types/${id}`
- Line 102: Add link → `/dashboard/settings/project-types/new` — route does not exist yet

---

## What's not built yet

- **Send scope to client** — Resend is wired but no email send implemented
- **New project type creation UI** — `/settings/project-types/new` route does not exist
- **Inline editing for deliverables/milestones** — only `executiveSummary` is editable in the scope editor; other fields are read-only
- **Client scope acceptance** — no client-facing scope review/sign-off flow
- **Agency notification on intake complete** — no email sent when a client finishes the intake chat
- **Team management / admin console** — placeholder built in Account page; roles (Admin, Ops, Team Member), org email vs personal email segregation planned
- **Inngest production keys** — `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` still need wiring for production
- **Clerk webhook production config** — `organization.created` webhook needs to point to production URL

---

## Environment variables required

```
DATABASE_URL                        # Supabase direct connection (local dev)
POSTGRES_URL                        # Injected by Vercel Supabase integration (prod)
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
CLERK_WEBHOOK_SECRET
ANTHROPIC_API_KEY
RESEND_API_KEY
INNGEST_EVENT_KEY                   # Optional — omit in dev to skip queue; required in prod
INNGEST_SIGNING_KEY                 # Optional — same as above
NEXT_PUBLIC_APP_URL                 # e.g. https://monocular-eta.vercel.app
```
