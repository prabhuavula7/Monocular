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
| Email | Resend v6 | `lib/resend.ts` lazy singleton. Agency notification wired in `/api/intake/complete`. **Sender domain `notifications@monocular.so` must be verified in Resend dashboard before emails deliver.** |
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

- Links are **reusable by default** and should remain valid until the agency explicitly deletes or deprecates them.
- Completing an intake must **not** invalidate the token. A single intake link may produce multiple scope iterations over time.
- `usedAt` should be treated as **last completed iteration timestamp**, not as a lock or one-time-use marker.
- A link is deactivated by setting `isDeprecated = true` via PATCH `/api/links/[id]`.
- `expiresAt` is optional and still checked — set it only for intentionally time-limited links.
- Future iterative behavior must preserve prior iteration context instead of deleting the useful history the next round needs.

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

## What's been built

- **P0 complete — Intake Links V2 + iterative intake/session memory**: rich link context fields, `intakeIterations` history table, iterative prompt injection, decision card (Continue / Modify / Complete), 4-step `CreateLinkModal`, reusable links
- **Scope naming**: `scopes.name` column; computed at completion as `"{ClientCompany} — {Label} v{N}"` with graceful fallbacks. Shown in list and editor header.
- **Agency notification email**: fires via `after()` in `/api/intake/complete`. Uses Resend → sends to all Clerk org admins via `clerkClient().organizations.getOrganizationMembershipList`. Silently swallowed on failure. **Requires `notifications@monocular.so` sender domain verified in Resend dashboard before emails deliver.**
- **Scope editor — full redesign**: full-height two-panel layout (left scrolls, right transcript panel is fixed-width and **user-draggable** — drag handle between panels, 240–640px range). Inline editing for ALL fields: executiveSummary, deliverables (title/desc/phase), milestones (name/duration, reorder), outOfScope, riskFlags (severity/title/desc), assumptions, pricingEstimate (low/high/currency). Add/remove/reorder throughout. Left content fills available space when sidebar collapses.
- **PDF stale indicator**: orange dot badge on Export PDF button after any edit; clears on successful export. Tooltip: "Changes made since last export".
- **Version history strip**: scope editor fetches sibling scopes by `intakeLinkId`. Shows v1/v2/v3 pills above the scope title — current version in orange, others are grey nav links.
- **Scopes list grouping**: scopes sharing an `intakeLinkId` are grouped into one card. Latest version is the main row; older versions appear in an "Earlier" strip below with individual links, status badges, and timestamps.
- **Scope editor currencies**: full ISO 4217 currency list (~150 currencies) in the pricing section. Top 10 by BIS trading volume in a pinned group (USD, EUR, INR, JPY, GBP, AUD, CAD, CHF, CNY, HKD), then all others alphabetically.
- **Sidebar user card**: avatar + name + email, links to `/account`. Clerk `UserButton` removed.
- **Account page**: personal profile card at top (edit profile via `openUserProfile()`, sign out), org settings, AI preferences, intake defaults.
- **Settings project-type editor**: back button and post-save redirect fixed (were 404ing due to spurious `/dashboard/` prefix).

## What's not built yet

- **Send scope to client** — ✅ Done. `/api/scopes/[id]/send` route generates PDF, emails via Resend, updates status to `sent`. Button in scope editor toolbar, disabled when `clientEmail` is absent. **Email is dev-guarded** (`NODE_ENV === 'development'` skips the send and logs to console). Resend requires a verified sender domain — `prabhuavula7@gmail.com` is unverified. Fix before production: either verify a domain in Resend dashboard (recommended: `monocular.so`) or swap transport to Nodemailer + Gmail SMTP with an App Password.
- **Client scope acceptance** — ✅ Done. `POST /api/scopes/[id]/review-link` generates an opaque `reviewToken`. Public page at `/review/[token]` shows scope read-only with Approve / Request Changes actions. Approve → sets `status: won`. Request Changes → saves `clientFeedback`, sets `status: in_review`, redirects client to intake link for iterative revision round. "Share" button in scope editor toolbar copies the review URL to clipboard. **Requires DB migration** (run once in Supabase SQL editor): `ALTER TABLE scopes ADD COLUMN IF NOT EXISTS review_token text UNIQUE; ALTER TABLE scopes ADD COLUMN IF NOT EXISTS client_feedback text;`
- **Team management / admin console** — placeholder in Account page; roles (Admin, Ops, Team Member), org email vs personal email segregation planned
- **Inngest production keys** — `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` still need wiring for production
- **Clerk webhook production config** — `organization.created` webhook needs to point to production URL

---

## Deep Dive Implementation Gameplan

This section is the source of truth for the next major build phase. The goal is to support:

- General-purpose intake links and existing-template intake links
- Rich link-level context fields that get attached to the intake system prompt
- Reusable, iterative links that survive multiple rounds of discovery and re-scoping
- A clean client experience with zero dead ends and explicit post-conversation choices: continue, modify, or complete

### Priority order

1. ~~**P0: Intake Links V2 + iterative intake/session memory**~~ ✅ Done
2. ~~**P1: Inline editing for deliverables and milestones**~~ ✅ Done (full scope editor redesign — all fields editable, draggable transcript panel)
3. ~~**P2: Agency notification on intake complete**~~ ✅ Done (Resend, fires in `after()`)
4. ~~**PDF stale indicator**~~ ✅ Done
5. ~~**Version history strip + scopes list grouping**~~ ✅ Done
6. ~~**P1: Send scope to client**~~ ✅ Done
7. ~~**P2: Client-facing scope acceptance / revision loop**~~ ✅ Done
8. **P3: Team management / admin console**
9. **P3: Production infrastructure wiring**

### P0 — Intake Links V2 + iterative intake/session memory

#### Product requirements

- Agencies must be able to create a link for either:
  - a **general-purpose scope** with no pre-selected template
  - an **existing template scope** backed by a `projectTypeId`
- The create/edit flow must capture more than client name/email. The link needs reusable context that can influence Claude's intake behavior.
- Links stay valid until deprecated or deleted. Completing one scope is just one iteration, not the end of the link.
- After iteration 1 is complete and the first scope is generated, the next intake round must pull a **summarized memory** of:
  - the prior conversation
  - the prior generated scope
  - any requested changes or unresolved questions
- The end-client experience must remain smooth and low-friction. No abrupt dead-end completion state, no blocking alerts, no fragile edge-case behavior.
- When Claude reaches a logical stopping point, the client should see a post-message card or modal with three actions:
  - **Continue**
  - **Modify / clarify**
  - **Complete intake**

#### Data model changes

Touch these files first:

- `lib/db/schema.ts`
- `types/index.ts`
- `app/api/links/route.ts`
- `app/api/links/[id]/route.ts`
- `app/api/intake/start/route.ts`
- `app/api/intake/message/route.ts`
- `app/api/intake/complete/route.ts`

Add link-level prompt context to `intakeLinks`. Suggested fields:

- `label` or `projectLabel` — internal label for the agency
- `clientCompany`
- `clientWebsite`
- `clientIndustry`
- `primaryObjective`
- `successDefinition`
- `budgetContext`
- `timelineContext`
- `stakeholderContext`
- `technicalContext`
- `mustCapture` — things Claude must make sure to cover
- `excludedTopics` — topics deliberately out of scope
- `agencyInstructions` — internal steering notes for the intake assistant
- `engagementType` — e.g. `general` or `template`
- `latestScopeId` — optional pointer to the most recent scope for faster lookup
- `iterationCount` — cached count for dashboard display

Expand `intakeSessions` so the client can stop at a decision point instead of being forced straight into completion. Suggested fields:

- `status` — `active | awaiting_confirmation | completed`
- `iterationNumber`
- `parentScopeId` — most recent prior scope if this is a follow-up round
- `linkContextSnapshot` — frozen copy of link context used for this round
- `priorIterationSummary` — compact summary injected into the prompt
- `completionCandidate` or `readyToComplete` boolean
- `completionSummary` — the summary generated for reuse in the next iteration
- `clientDecision` — `continue | modify | complete` once selected

If `intakeSessions` becomes too overloaded, add a dedicated history table (for example `intakeIterations`) instead of stuffing every historical artifact into `scopes`. That table should store:

- `intakeLinkId`
- `scopeId`
- `iterationNumber`
- `conversationSummary`
- `scopeSummary`
- `changeLog`
- `openQuestions`
- `createdAt`

#### Prompt architecture

Keep `composeIntakePrompt()` as the public entry point, but split it into smaller helpers:

- `renderAgencyContext()`
- `renderProjectTypeContext()`
- `renderLinkContext()`
- `renderIterativeMemoryContext()`
- `renderCompletionStateInstructions()`

Rules for iterative memory:

- Do **not** replay the entire prior transcript after the first round. That will grow tokens too fast and produce repetitive chat.
- Inject only a compact memory block with:
  - prior goals
  - confirmed decisions
  - unresolved questions
  - changes requested since the last scope
  - a short summary of the latest generated scope
- For a **modify** flow, explicitly instruct Claude that the last scope is the current baseline and the goal is to gather deltas, not rediscover the entire project from scratch.
- For a **general** link with no template, start broad. For a **template** link, stay inside the project-type schema but allow iteration-specific overrides from the link context.

Recommended prompt shape:

1. Core behavior
2. Agency context
3. Project type context, if present
4. Link context
5. Prior iteration memory, if present
6. Conversation-state instructions:
   - fresh round
   - modification round
   - confirmation-ready round

#### Summaries that feed the next round

Every completed round should generate two summary artifacts:

- `conversationSummary` — what the client said, what was decided, what stayed uncertain
- `scopeSummary` — short, structured summary of the generated scope and major assumptions

Also capture:

- `openQuestions`
- `changeLog`
- `riskCarryForward`

Implementation rule: older history must be compressed as rounds accumulate. Do not send 5 full prior summaries into Claude. After 2-3 rounds, compress older rounds into a single `historicalSummary` and keep only the latest round detailed.

#### Dashboard UX — create/edit link flow

Primary files:

- `components/dashboard/CreateLinkModal.tsx`
- `app/(dashboard)/intake/page.tsx`

The new create flow should be multi-step and minimal, not one dense form:

1. **Choose mode**
   - General scope
   - Existing template
2. **Choose template**
   - Only shown when template mode is selected
3. **Add client + project context**
   - client/contact basics
   - company / website / industry
   - objective / timeline / budget / stakeholders
   - technical notes / must-cover notes / exclusions
4. **Review and create**
   - compact summary of what the AI will know
   - final shareable link

UI requirements:

- No `alert()` usage
- Inline validation only
- Back button between steps
- Draft state preserved while modal is open
- Clear distinction between **client-facing data** and **internal agency-only guidance**
- Clean copy in the final state: link is reusable and stays active until deprecated or deleted

The edit modal in `app/(dashboard)/intake/page.tsx` should be upgraded to the same schema. Do not maintain a tiny edit form for name/email while the create flow has a larger model.

#### Public intake UX — zero-error client flow

Primary file:

- `app/intake/[token]/IntakeChatClient.tsx`

Current behavior hard-completes too early. Replace that with a decision state.

Target behavior:

- Claude asks one question at a time as it already does.
- When Claude reaches its completion signal, the UI shows a post-message decision card embedded in the chat, not a hard redirect to a terminal “thanks” state.
- The decision card must offer:
  - **Continue** — keep chatting in the same session
  - **Modify / clarify** — ask what should be changed or clarified and continue in the same session
  - **Complete intake** — finalize, create the scope, then show a calm success state

Completion UX rules:

- Continue should simply dismiss the confirmation card and keep the input enabled.
- Modify should inject a clear assistant follow-up like “Tell me what you want to change or clarify” and keep the session active.
- Complete should call `/api/intake/complete`, then show a non-dead-end success screen that explicitly says the same link can be reopened later for another revision round.
- On refresh, the client should resume the session or the confirmation state cleanly.
- Network failures must be recoverable inline:
  - keep unsent draft text
  - show a retry message
  - never lose the visible transcript

#### API behavior changes

`POST /api/links`

- Accept the expanded link payload
- Persist reusable link context
- Return enough data for the dashboard to optimistically render the new link row

`PATCH /api/links/[id]`

- Support editing all prompt-context fields, not just name/email/template/deprecation

`POST /api/intake/start`

- Load link context + latest completed iteration summary + latest scope summary
- Resume an active session if one exists
- If starting a new round after a completed scope, seed a new session with iterative memory instead of deleting useful history

`POST /api/intake/message`

- Continue streaming assistant replies
- Detect “ready to complete” state, but do **not** auto-complete the intake
- Return a clear signal such as `X-Intake-Ready-To-Complete: true`
- Persist session status as `awaiting_confirmation` when appropriate

`POST /api/intake/complete`

- Be explicitly client-driven
- Create a new scope row for this iteration
- Update link metadata (`usedAt`, `latestScopeId`, `iterationCount`)
- Persist summary artifacts for the next round
- Keep the link reusable
- Be idempotent: completing the same round twice should return the existing scope id

#### Scope generation changes for iterative rounds

Primary files:

- `lib/run-generate-scope.ts`
- `lib/prompts/generation.ts`

For follow-up iterations, generation should know whether this round is:

- a fresh scope
- a revised scope based on a prior one

The generation prompt should include a compact note about the previous scope when present so the new scope reflects deltas instead of drifting or rewriting unrelated areas.

If this becomes noisy in the main generation prompt, add a separate helper for “previous scope baseline context” rather than inlining it directly in `buildGenerationPrompt()`.

#### Non-negotiable implementation rules

- Never use `usedAt` to block reuse.
- Never delete historical summaries that the next iteration needs.
- Never auto-finalize when Claude says it has enough; the client must explicitly choose complete.
- Never rely on modal-only state for critical session data. Refresh must be safe.
- Never present blocking browser alerts to the end client.

### P1 — Send scope to client

Files:

- `app/api/scopes/[id]/export/route.tsx`
- new `app/api/scopes/[id]/send/route.ts`
- `app/(dashboard)/scopes/[id]/ScopeEditorClient.tsx`

Plan:

- Add a send action that generates or reuses the latest PDF, emails it via Resend, and updates scope status to `sent`.
- Require `clientEmail`; disable the action in the UI when missing.
- Use a shared helper for PDF creation so export and send do not duplicate logic.
- Keep the email template plain, short, and branded. No large HTML system.

### P1 — Inline editing for deliverables and milestones

Files:

- `app/(dashboard)/scopes/[id]/ScopeEditorClient.tsx`

Plan:

- Move generated scope editing to a normalized local editor state.
- Support add/edit/delete/reorder for deliverables and milestones.
- Preserve IDs so downstream PDF/export logic remains stable.
- Auto-save with the same debounce pattern already used for `executiveSummary`.

### P2 — Client-facing scope acceptance / revision loop

This should connect directly to the Intake Links V2 work.

Plan:

- Add a signed client review URL per scope
- Client can approve, request changes, or leave comments
- “Request changes” should reopen the same intake link in iterative mode with the prior scope summary injected as memory

### P2 — Agency notification on intake complete

Plan:

- On scope creation, send an internal email or inbox notification to the agency
- Include:
  - client name
  - project type
  - link to the scope record
  - quick summary of risk level / confidence

### P3 — Team management / admin console

Plan:

- Use Clerk org memberships and map them to product roles
- Keep permissions explicit: Admin, Ops, Team Member
- Separate personal email identity from org-managed contact channels
- Add invite / remove / role-change flows only after the intake and scope loop is stable

### P3 — Production infrastructure wiring

Plan:

- Wire `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` in production
- Point Clerk `organization.created` webhook to production
- Add a lightweight deployment checklist in this doc once those values are live
- Keep dev behavior safe when these keys are absent

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
