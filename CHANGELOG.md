# Monocular — Changelog

After each coding session, append an entry:
`## [YYYY-MM-DD] <summary of what changed>`

---

## [2026-04-21] Token optimization — prompt caching + history trimming

- `cache_control: ephemeral` added to intake system prompt in `/start` and `/message`
  routes — ~90% reduction on Haiku input token cost after turn 1 (~$0.004/session)
- Generation prompt split into `buildGenerationSystemPrompt` (static schema, cached)
  and `buildGenerationUserPrompt` (transcript only) — Sonnet schema block cached
  across generations for the same agency
- Conversation history trimmed to last 20 messages in `/message` to cap input growth

## [2026-04-21] Deployment fix — next.config.ts experimental.after removed

- `after: true` removed from `experimental` block — `after()` is stable in Next.js 15.1+
  and the flag no longer exists in `ExperimentalConfig` on 16.x, breaking Vercel builds

## [2026-04-21] Known blocking issues (unresolved)

### 🔴 Vercel Hobby plan — 12 serverless function limit
The app produces 30 routes (17 API + dynamic pages), exceeding the Hobby plan cap of
12 serverless functions per deployment. Every `git push`-triggered deploy silently
fails to upload function outputs — all routes return 404.
**Fix:** Upgrade team `prabhu-kiran-avulas-projects` to Vercel Pro ($20/mo) at
`vercel.com/teams/prabhu-kiran-avulas-projects/settings/billing`.
Alternative: consolidate API routes to ≤12 (see ROADMAP for route consolidation plan).

### 🟡 Clerk development keys in production
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in the Vercel production
environment are `pk_test_` / `sk_test_` (dev instance: `famous-sailfish-7.clerk.accounts.dev`).
Dev keys work erratically on non-localhost domains — auth redirects, session persistence,
and Organizations behave differently than production.
**Fix:** Clerk dashboard → Switch to Production → copy `pk_live_` / `sk_live_` keys →
update in Vercel env vars → update Clerk webhook URL to production domain → redeploy.

### 🟡 Vercel project root directory — GitHub integration
Vercel project `monocular` now has `rootDirectory: app` set via API (fixed 2026-04-21),
but the first GitHub-triggered build after this fix should be verified to confirm the
integration respects the new root directory. Manual CLI deploys work correctly.

---

## [pre-2026-04-21] P0 — Intake Links V2 + iterative intake/session memory

- Rich link context fields on `intakeLinks` (clientCompany, primaryObjective, budgetContext, etc.)
- `intakeIterations` history table — stores conversationSummary, scopeSummary, changeLog, openQuestions per round
- Iterative prompt injection — prior round summary injected as compact memory block
- Decision card (Continue / Modify / Complete) in client intake UI
- 4-step `CreateLinkModal` (mode → template → context → review)
- Reusable links — `usedAt` is last-completed-iteration timestamp, not a lock

## [pre-2026-04-21] P1 — Inline scope editor redesign

- Full-height two-panel layout: left scrolls, right transcript panel fixed-width + user-draggable (240–640px)
- Inline editing for all fields: executiveSummary, deliverables, milestones, outOfScope, riskFlags, assumptions, pricingEstimate
- Add/remove/reorder throughout
- Full ISO 4217 currency list in pricing section (top-10 BIS pinned group + alphabetical)

## [pre-2026-04-21] P2 — Agency notification on intake complete

- Resend email via `after()` in `/api/intake/complete`
- Sends to all Clerk org admins via `getOrganizationMembershipList`
- Silently swallowed on failure
- **Requires `notifications@monocular.so` sender domain verified in Resend dashboard**

## [pre-2026-04-21] P1 — Send scope to client

- `/api/scopes/[id]/send` generates PDF, emails via Resend, updates status to `sent`
- Button in scope editor toolbar, disabled when `clientEmail` absent
- **Email dev-guarded** (`NODE_ENV === 'development'` skips send, logs to console)
- Requires verified Resend sender domain before production use

## [pre-2026-04-21] P2 — Client-facing scope acceptance / revision loop

- `POST /api/scopes/[id]/review-link` generates opaque `reviewToken`
- Public page `/review/[token]` — read-only scope with Approve / Request Changes
- Approve → `status: won`; Request Changes → saves `clientFeedback`, sets `status: in_review`, redirects to intake link for revision round
- "Share" button in editor toolbar copies review URL
- **Requires DB migration (run once in Supabase SQL editor):**
  ```sql
  ALTER TABLE scopes ADD COLUMN IF NOT EXISTS review_token text UNIQUE;
  ALTER TABLE scopes ADD COLUMN IF NOT EXISTS client_feedback text;
  ```

## [pre-2026-04-21] Scope naming

- `scopes.name` column — computed at completion as `"{ClientCompany} — {Label} v{N}"` with graceful fallbacks

## [pre-2026-04-21] PDF stale indicator

- Orange dot badge on Export PDF button after any edit; clears on successful export

## [pre-2026-04-21] Version history + scopes list grouping

- Version pills (v1/v2/v3) above scope title — current in orange, others grey nav links
- Scopes list groups by `intakeLinkId` — latest version is main row, earlier versions in strip below

## [pre-2026-04-21] Sidebar user card

- Avatar + name + email, links to `/account`. Clerk `UserButton` removed.

## [pre-2026-04-21] Account page

- Personal profile card (edit via `openUserProfile()`, sign out), org settings, AI preferences, intake defaults

## [pre-2026-04-21] Settings project-type editor

- Back button and post-save redirect fixed (were 404ing due to spurious `/dashboard/` prefix)
