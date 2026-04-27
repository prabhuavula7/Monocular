# Monocular — Changelog

After each coding session, append an entry:
`## [YYYY-MM-DD] <summary of what changed>`

---

## [2026-04-26] Plan restructure + feature gating + dark theme contrast

### Pricing overhaul
- Plans repriced and restructured for upgrade pressure (Option B):
  - Solo: $49/mo · $490/yr — 20 scopes/mo, 1 seat (scope limit reduced from 40)
  - Studio: $109/mo · $1,090/yr — 75 scopes/mo, 3 seats (was $99, 150 scopes, 5 seats)
  - Agency: $219/mo · $2,190/yr — unlimited scopes + seats (was $179)
- New Stripe prices created for Studio and Agency; old prices archived
- `lib/stripe.ts` — added `seatLimit` and `features` object to each plan entry
- Exported `SEAT_LIMITS` constant and `planHasFeature()` helper from `lib/stripe.ts`

### Feature gating (Studio/Agency only)
- Review links (`POST /api/scopes/[id]/review-link`) — returns 402 for Solo/trial
- Email delivery (`POST /api/scopes/[id]/send`) — returns 402 for Solo/trial
- Scope editor: Share and Send buttons show lock icon + link to `/pricing` for gated plans
- Pricing page updated with ✓/✗ feature rows per plan

### Seat limits updated
- Studio: 5 → 3 seats (API route + TeamClient both updated)
- `SEAT_LIMITS` in `api/team/route.ts` and `TeamClient.tsx` synced to new values

### UI: dark theme contrast fix
- `--ink-2` dark: `#71717a` → `#a1a1aa` (zinc-400, ~6.3:1 contrast — was failing WCAG AA)
- `--ink-3` dark: `#3f3f46` → `#71717a` (zinc-500, more readable placeholder text)
- `--ink-2` light: `#52525b` → `#3f3f46` (zinc-700, stronger secondary text)
- `--ink-3` light: `#a1a1aa` → `#71717a` (zinc-500, was ~2.4:1 — now passes AA for large text)

### Stripe webhook
- Added `invoice.payment_succeeded` handler — resets `planStatus` to `active` when Stripe auto-retries a failed payment and succeeds

### Test tooling
- `scripts/test-trial-expiry.ts` — safely expires and restores trial state for any org (snapshots original plan before expiry, restores on `--reset`)
- `scripts/check-agency.ts` — quick DB query to inspect current agency plan state
- `scripts/update-stripe-prices.ts` — creates new prices, archives old ones, prints env vars

### P1 verified
- Trial expiry redirect confirmed: `/dashboard` → `/pricing?expired=1` when `trialEndsAt` past
- Full billing E2E verified across all webhook paths

---

## [2026-04-26] P0 billing fixes + E2E test

### P0 fixes
- `STRIPE_WEBHOOK_SECRET` wired in `.env.local` — webhooks now verify signatures and update DB
- Duplicate subscription guard added to `POST /api/billing/checkout`: if org has an active/trialing/past_due subscription, redirects to Stripe Billing Portal instead of creating a new checkout session

### E2E billing test results (all passed)
- Webhook signature verification: all events return 200
- `customer.created` → 200 on first checkout
- `customer.subscription.updated` → correctly syncs `planStatus` + `stripeSubscriptionId` to DB
- `checkout.session.completed` → 200, handler correct
- Duplicate subscription guard → redirects to Billing Portal (verified in browser)
- `invoice.payment_failed` handler → code-verified correct

### Known gap (low priority)
- `customer.subscription.created` not handled in webhook router — not critical for checkout path (always goes through `checkout.session.completed`) but would miss sync if subscription created outside checkout flow

---

## [2026-04-25] Team management, RBAC, trial hardening

### Trial changes
- Trial period reduced from 14 days to 7 days (`api/webhooks/clerk/route.ts`)
- Trial expiry redirect now goes to `/pricing?expired=1` (was just `/pricing`)
- Pricing page shows orange data-retention banner when `?expired=1`: 60-day data retention warning before permanent deletion
- Sidebar trial pill now shows dynamic days remaining computed from `trialEndsAt` (was hardcoded "12 days left")

### Team management — new /team page
- `/team` — full team management page (server component fetches Clerk data, renders client UI)
- Admin view: member list with inline role selector + remove button; pending invitations with revoke; invite modal (email + role)
- Member view: read-only member list with role badges
- Seat limits enforced at invite time: trial=3, solo=1, studio=5, agency=∞; returns 402 with upgrade prompt if at limit

### New API routes
- `GET /api/team` — lists members + pending invitations (invitations returned only to admins)
- `POST /api/team` — sends Clerk invitation email; checks seat limits; admin-only
- `PATCH /api/team/members/[userId]` — change role; admin-only; cannot change own role
- `DELETE /api/team/members/[userId]` — remove member; admin-only; cannot remove self
- `DELETE /api/team/invitations/[id]` — revoke pending invitation; admin-only

### Role-based access (P2 — complete)
- Dashboard layout fetches `orgRole` from `auth()`, passes `isAdmin` to Sidebar
- Sidebar: Settings nav item hidden for `org:member`; Team link "soon" badge removed (page now live)
- `/settings/**` entire subtree gated by new `settings/layout.tsx` server component — non-admins redirected to `/dashboard`
- `/account` page converted to server wrapper + `AccountClient`; admin-only sections (Organisation, Billing, AI Prefs, Intake Defaults) wrapped in `{isAdmin && ...}`; members see only personal profile
- `PATCH /api/settings` — now returns 403 for non-admins
- `POST /api/billing/checkout` — now returns 403 for non-admins
- `POST /api/billing/portal` — now returns 403 for non-admins

### What admins can do that members cannot
- Access `/settings` and all sub-pages (project types, org config)
- View and modify billing (Stripe portal, upgrade, plan info)
- Invite/remove/role-change team members
- Change org name, AI tone, rate range, intake defaults

---

## [2026-04-24] Stripe billing integration — Wave 2 complete

### Pricing tiers renamed and repriced
- Replaced Starter/Firm/Scale with **Solo / Studio / Agency**
- Solo: $49/mo · $490/yr (40 scopes, freelancers)
- Studio: $99/mo · $990/yr (150 scopes, small agencies)
- Agency: $179/mo · $1,790/yr (unlimited, full-service firms) — gap from Studio reduced from $150 → $80
- Old Stripe products archived; 6 new products + prices created via Stripe API
- `lib/stripe.ts` updated with new `PLANS` config and corrected API version (`2026-04-22.dahlia`)
- `.env.local` updated with new price IDs

### New API routes
- `POST /api/billing/checkout` — creates Stripe Checkout session, reuses existing customer, supports monthly/annual interval
- `POST /api/billing/portal` — creates Stripe Billing Portal session for managing subscriptions
- `POST /api/webhooks/stripe` — handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`; syncs plan/status to `agencies` table

### DB changes
- Added to `agencies` table: `stripeCustomerId`, `stripeSubscriptionId`, `plan`, `planStatus`, `trialEndsAt`
- Applied via raw SQL (Drizzle interactive prompt bypassed)

### Clerk webhook extended
- On `organization.created`: sets `plan: 'trial'`, `planStatus: 'trialing'`, `trialEndsAt = now + 14 days`, creates Stripe customer (non-fatal if fails)
- Fixed missing `eq` import from drizzle-orm

### Paywall
- `app/(dashboard)/layout.tsx` redirects to `/pricing` when trial expired or plan canceled
- `proxy.ts` updated to allow `/pricing` as public route

### New pages
- `/pricing` — public plan comparison page with monthly/annual toggle, feature lists, Stripe Checkout flow; unauthenticated users redirected to sign-in
- `/account` billing section — shows plan name, status badge, days remaining in trial, Manage billing / Upgrade CTA

### Bugs fixed
- Stripe API version corrected from `2025-03-31.basil` to `2026-04-22.dahlia` in `lib/stripe.ts` and `scripts/stripe-setup.ts`
- Missing `eq` import added to `app/api/webhooks/clerk/route.ts`

### Known issues (not yet fixed — tracked in ROADMAP.md P0/P1)
- `STRIPE_WEBHOOK_SECRET` still empty in `.env.local` — webhook signature verification fails; DB never syncs
- No guard against duplicate subscriptions if checkout is called for an existing subscriber
- Scope usage limits defined in PLANS but not enforced at API level
- No role-based access: all org members can access billing and settings

---

## [2026-04-21] Custom auth pages — wave background + transparent Clerk panels

- Full-screen WebGL2 wave background (`DitheringShader`, shape=wave, pxSize=3, speed=0.6)
  from 21st.dev registry (`dithering-shader.tsx` + `wave-background.tsx`)
- Theme-aware wave: dark = `#0a0a0a` + `#F97316`, light = `#ffffff` + `#F97316`
- Auth layout: wave fixed behind content, ThemeSegment toggle top-right corner
- `ClerkSignIn` / `ClerkSignUp` client components: glassmorphism panel
  (dark: `bg-black/50 backdrop-blur-2xl`, light: `bg-white/80`)
- Clerk appearance variables wired to `resolvedTheme` — all text, inputs, dividers, buttons themed
- Footer blends into card: matching alpha bg + hairline divider, high-contrast text
- `HideClerkBanner` client component: `MutationObserver` walks 4 levels up from
  `a[aria-label="Clerk logo"]` to remove the branding container after mount
- CSS in auth layout targets `a[aria-label="Clerk logo"]` + direct/grandchild parents
  (stable across Clerk version bumps — `cl-internal-*` hashes change, aria-label doesn't)
- Font set to `"Plus Jakarta Sans", system-ui` by name (CSS var didn't resolve inside Clerk)
- shadcn/ui initialized (`components.json`) for future component installs
- `CLAUDE-DESIGN-PROMPT.md` added to repo root — comprehensive prompt for marketing site

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
