# Monocular — Changelog

After each coding session, append an entry:
`## [YYYY-MM-DD] <summary of what changed>`

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
