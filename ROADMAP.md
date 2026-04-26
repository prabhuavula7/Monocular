# Monocular — Product Roadmap

> Living document. Phases are sequential but items within a phase can run in parallel.
> Last updated: 2026-04-25

---

## Phase 1 — Revenue Foundation `[IN PROGRESS]`
*Goal: charge money, close first paying customers.*

### 1.1 Stripe Billing Integration

#### Done ✅
- [x] Install `stripe` + `@stripe/stripe-js`
- [x] Add env vars: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- [x] Create Stripe products + prices for three tiers:
  - **Solo** — $49/mo · $490/yr (40 scopes/mo, freelancers & independents)
  - **Studio** — $99/mo · $990/yr (150 scopes/mo, small agencies & studios)
  - **Agency** — $179/mo · $1,790/yr (unlimited scopes, full-service firms)
- [x] DB columns: `stripeCustomerId`, `stripeSubscriptionId`, `plan`, `planStatus`, `trialEndsAt` on `agencies`
- [x] `POST /api/billing/checkout` — create Stripe Checkout session, reuse existing customer
- [x] `POST /api/billing/portal` — Stripe Billing Portal session
- [x] `POST /api/webhooks/stripe` — handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- [x] Stripe customer seeded on org creation (Clerk `organization.created` webhook extended)
- [x] 7-day free trial — app-managed (`trialEndsAt = now + 7d`), no card required (reduced from 14d)
- [x] Paywall: dashboard layout redirects to `/pricing?expired=1` if trial expired, `/pricing` if canceled
- [x] 60-day data retention banner on expired-trial pricing page
- [x] `/pricing` public page: monthly/annual toggle, three-column plan cards, Stripe Checkout flow
- [x] `/account` billing section: plan name, status badge, days-remaining, Manage billing / Upgrade CTA

#### P0 — Fix broken things `[MUST DO BEFORE SHOWING ANYONE]`
- [ ] **Wire `STRIPE_WEBHOOK_SECRET`** — currently empty in `.env.local`; run `stripe listen --forward-to localhost:3000/api/webhooks/stripe`, paste the printed webhook secret; without this, every webhook event fails signature verification and DB never syncs
- [ ] **Guard duplicate subscriptions** — `/api/billing/checkout` creates a new subscription even if one already exists; add a check: if `agency.stripeSubscriptionId` is set and subscription is active, redirect to portal instead

#### P1 — E2E test `[BEFORE LAUNCH]`
- [ ] Run full billing flow locally: sign up → org created → trial set → open /pricing → checkout test card → webhook fires → DB syncs → dashboard unlocked
- [ ] Verify Stripe test card `4242 4242 4242 4242` flow works end-to-end
- [ ] Verify `invoice.payment_failed` path sets `planStatus: 'past_due'` in DB
- [ ] Verify trial expiry redirects to `/pricing` correctly (can fast-forward by setting `trialEndsAt` to a past date in DB)

#### P2 — Role-based access ✅ `[DONE 2026-04-25]`
- [x] Read Clerk `orgRole` (`org:admin` / `org:member`) in dashboard layout, pass to Sidebar
- [x] Gate `/account` org/billing/AI sections to `org:admin` — members see personal profile only
- [x] Gate entire `/settings/**` subtree to `org:admin` via `settings/layout.tsx` server guard
- [x] Sidebar: Settings nav link hidden for `org:member`; Team link live (no longer "soon")
- [x] API: `PATCH /api/settings`, `POST /api/billing/checkout`, `POST /api/billing/portal` return 403 for non-admins

#### P3 — Team management ✅ `[DONE 2026-04-25]`
- [x] `/team` page: member list with role, joined date; pending invitations with revoke
- [x] Invite by email via Clerk organization invitations (email sent by Clerk)
- [x] Role change (admin ↔ member) and member removal; guards prevent self-action
- [x] Seat limits enforced at invite time (trial=3, solo=1, studio=5, agency=∞)
- [ ] Seat limit warning in UI when near limit — currently just blocks at limit (upgrade CTA shown)
- [ ] Clerk webhook on `organizationMembership.created` for real-time seat enforcement (currently only at invite time)

#### P4 — Scope usage enforcement `[PRE-LAUNCH]`
- [ ] Before creating a scope (in `/api/intake/complete`), count scopes for the org since the billing period start
- [ ] If count ≥ `PLANS[plan].scopeLimit`, return 402 with a usage-limit error
- [ ] Surface scope usage meter on `/account` billing section: "X of Y scopes used this month"
- [ ] Upgrade CTA shown inline when >80% of limit used

#### P4 — Scope usage enforcement `[PRE-LAUNCH]`
- [ ] Before creating a scope (in `/api/intake/complete`), count scopes for the org since the billing period start
- [ ] If count ≥ `PLANS[plan].scopeLimit`, return 402 with a usage-limit error
- [ ] Surface scope usage meter on `/account` billing section: "X of Y scopes used this month"
- [ ] Upgrade CTA shown inline when >80% of limit used

---

### 1.4 Admin Console `[NEXT PRIORITY]`
*Goal: admins have total visibility and control over billing, team, and usage from a single place. No need to leave the app to manage anything Stripe-related.*

#### AC-1 — Admin Console shell
- [ ] `/admin` route group — `app/(dashboard)/admin/` with its own layout
- [ ] Admin layout: breadcrumb nav, section links (Overview · Billing · Team · Usage · Settings)
- [ ] Gate entire `/admin/**` subtree to `org:admin`; redirect members to `/dashboard`
- [ ] Sidebar: add Admin link for `org:admin` users (between Team and Settings)

#### AC-2 — Billing management UI
- [ ] Current plan card: plan name, status badge (trialing/active/past_due/canceled), renewal date, next invoice amount
- [ ] Inline plan switching: show all three plans, current highlighted, upgrade/downgrade buttons
  - Upgrade: call `stripe.subscriptions.update` with new price + `proration_behavior: 'create_prorations'`
  - Downgrade: confirmation modal listing what changes (scope limit, seat limit); effective at period end
  - Immediate plan change reflected via Stripe webhook → DB sync
- [ ] Invoice history table: date, amount, status (paid/open/void), PDF download link (Stripe-hosted)
- [ ] Payment method display: last 4 digits, expiry, brand icon; "Update card" → Stripe portal
- [ ] Danger zone: cancel subscription (with "data retained 60 days" messaging)

#### AC-3 — Stripe ↔ DB sync guarantee
- [ ] Wire `STRIPE_WEBHOOK_SECRET` — this is P0 and blocks everything else in billing
- [ ] Guard duplicate subscriptions in `/api/billing/checkout` — if `stripeSubscriptionId` is set and sub is `active`, redirect to portal
- [ ] Add `POST /api/billing/sync` admin-only endpoint — manually re-pulls subscription state from Stripe API and writes to DB; shown as "Sync with Stripe" button in admin console
- [ ] Stripe webhook handler extended: log all events to a `billingEvents` table (event type, payload, processed_at) for debugging and audit trail
- [ ] Webhook retry safety: make all handlers idempotent (check `stripeSubscriptionId` before overwriting)

#### AC-4 — Usage dashboard
- [ ] Scopes this billing period: count vs plan limit, visual progress bar
- [ ] Scopes all-time: total created, won, lost, sent, in-review
- [ ] Team seats: used vs plan limit
- [ ] Token usage (if tracked): AI cost per month estimate
- [ ] All metrics refreshed server-side on page load (no client polling needed)

#### AC-5 — Plan switching flows (complete)
- [ ] `/pricing` upgraded to support authenticated plan switching (not just first-time checkout)
  - If org already has active subscription, show "Current plan" badge + "Switch" button
  - "Switch" calls a new `POST /api/billing/switch` that calls `stripe.subscriptions.update`
- [ ] Proration preview: show estimated credit/charge before confirming switch
- [ ] Post-switch: webhook updates DB; admin sees new plan immediately in admin console

#### AC-6 — Admin access controls (total access)
- [ ] Admins can access all scopes in the org (currently scopes are user-created only — confirm org-scoped)
- [ ] Admins can delete any scope (members can only delete their own)
- [ ] Admins can deprecate/delete any intake link
- [ ] Admins can edit all project types
- [ ] Admin console shows org-wide scope activity feed (last 20 events: created, generated, sent, won, lost)

---

### 1.2 Pricing Page ✅
- [x] `/pricing` route — public, no auth required
- [x] Monthly / Annual toggle (annual = 2 months free)
- [x] Three-column plan cards with feature lists
- [x] Checkout flow: unauthenticated users redirected to `/sign-in?redirect_url=/pricing`
- [x] Studio highlighted as "Most popular"
- [ ] "Contact us" CTA for enterprise / custom needs (post-MVP)
- [ ] Pricing section on marketing homepage (Phase 2)

---

### 1.3 Account / Billing UI
- [x] `/account` billing section: plan name, status badge, days-remaining in trial
- [x] "Manage billing" → Stripe portal (for paying customers)
- [x] "Upgrade plan" → `/pricing` (for trialing / canceled accounts)
- [ ] Scope usage meter (P4 above)
- [ ] Plan switching inline UI (P5 above)
- [ ] Next renewal date displayed (requires subscription period_end from Stripe)

---

## Phase 2 — Marketing Website `[NEXT]`
*Goal: replace the static `monocular.html` with a real Next.js marketing site that converts.*

### 2.1 Public Site Architecture
- [ ] New Next.js route group `(marketing)` with its own layout (no auth nav)
- [ ] Pages: `/` (hero + features + how-it-works + pricing + FAQ + CTA), `/pricing`, `/about`, `/contact`
- [ ] Shared design system: extend existing Tailwind config — orange accent (`#F97316`), dark-first palette, Plus Jakarta Sans
- [ ] Fully responsive (mobile-first); hero + feature sections from `monocular.html` adapted to React

### 2.2 Navigation
- [ ] Top nav: Logo · Features · Pricing · About · `Sign In` → `/sign-in` · `Start free` → `/sign-up`
- [ ] All anchor links (`#features`, `#how-it-works`, etc.) work
- [ ] Mobile hamburger menu

### 2.3 Auth Pages
- [x] Full-screen WebGL2 wave background (DitheringShader) — theme-aware
- [x] Glassmorphism Clerk panel
- [x] Clerk appearance variables themed
- [x] Clerk branding hidden
- [x] ThemeSegment toggle
- [ ] Redesign `/create-org` to match auth pages

### 2.4 Content Sections
- [ ] Hero: headline, sub-headline, animated chat mockup (CSS-only), two CTAs
- [ ] "How it works" — 3-step: Create Link → Client Chats → Scope Generated
- [ ] Feature grid: AI intake, PDF export, team review, confidence scoring, email delivery
- [ ] Social proof: placeholder for design partner quotes / logos
- [ ] ROI section: 2 hrs → 18 min, $3,200/mo saved (from `POSITIONING.md`)
- [ ] Pricing section (pulls Phase 1 plan data)
- [ ] FAQ (from `OBJECTIONS.md`)
- [ ] Footer: links, copyright, legal stubs

### 2.5 Legal Stubs
- [ ] `/terms` — Terms of Service placeholder
- [ ] `/privacy` — Privacy Policy placeholder

---

## Phase 3 — Product Hardening `[Q2 2026]`
*Goal: production-ready, team-ready, trustworthy.*

### 3.1 Team Management
- [x] Clerk org memberships used for multi-tenancy (admin/member roles exist in Clerk)
- [ ] Role-based access enforced in product (P2 above, moved up to Phase 1 pre-launch)
- [ ] Admin console: invite team members, manage roles, view org-wide scope history
- [ ] Seat management per plan (P3 above, moved up to Phase 1 pre-launch)

### 3.2 Production Infrastructure
- [ ] Upgrade Vercel to Pro — Hobby plan caps at 12 serverless functions; app has 30+ routes (🔴 blocks every GitHub-triggered deploy)
- [ ] Switch Clerk to production keys (`pk_live_` / `sk_live_`) — dev keys are set in Vercel prod env (🟡 auth behaves erratically on non-localhost)
- [ ] Wire `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` in Vercel production env
- [ ] Set Stripe production keys + webhook endpoint in Vercel env
- [ ] Set Clerk webhook production URL pointing to production domain
- [ ] Verify sender domain in Resend dashboard (currently using `onboarding@resend.dev` shared domain — limited to verified recipients)

### 3.3 Scope Editor Polish
- [ ] In-line comment threads on scope sections (reviewer collaboration)
- [ ] Version history — track each edit with timestamp + author
- [ ] Approval workflow: reviewer marks scope `approved` before PDF unlocked for export
- [ ] Scope templates: pre-fill from past approved scopes (semantic similarity via embeddings)

### 3.4 Analytics & Observability
- [ ] Scope generation success/failure rate tracking
- [ ] Token usage per org per month (cost visibility)
- [ ] Inngest event tracing dashboard integration

---

## Phase 4 — Scope Engine `[Q3 2026]`
*Goal: stop being "a scoping tool" — become the intelligence layer service firms run on.*

### 4.1 Public API
- [ ] REST API: `POST /v1/scope` — submit transcript, get structured scope JSON back
- [ ] API keys per org (generated, rotatable, scoped to org)
- [ ] Rate limiting per API key tied to plan tier
- [ ] API reference docs (auto-generated from Zod schemas)
- [ ] Webhook delivery: `scope.generated`, `scope.approved`, `scope.exported` events

### 4.2 Integrations
- [ ] HubSpot: push approved scope as a Deal
- [ ] Salesforce: scope as Opportunity
- [ ] Zapier / Make connector
- [ ] Slack: post scope summary to a channel

### 4.3 Template Marketplace
- [ ] Org-level template library
- [ ] Global template library (curated by Monocular team)
- [ ] Template picker in intake link creation

### 4.4 Custom Branding
- [ ] White-label intake chat: agency logo, brand color, custom domain
- [ ] White-label PDF: agency header/footer, custom cover page

---

## Phase 5 — ML Intelligence Layer `[Q4 2026]`
*Full spec in `ML-ARCHITECTURE.md`.*

- [ ] RAG over past scopes for semantic template matching
- [ ] V2 models (500+ scopes in prod): risk classifier, pricing regression, win/loss predictor
- [ ] V3 fine-tuning (5,000+ approved scopes): DPO on `(transcript, rejected, accepted)` triples
- [ ] Confidence scores per scope section in UI
- [ ] Pricing guardrails: flag when AI estimate deviates >20% from org historical average

---

## Phase 6 — Vertical Expansion `[2027]`

| Vertical | TAM | Unlock trigger |
|---|---|---|
| Law firms (417K US) | $25B+ | Phase 4 API stable + legal design partners |
| Physician practices (395K US) | $18B+ | HIPAA BAA signed, data residency |
| Architecture / Engineering (68K US) | $8B+ | CAD/spec attachment parsing |
| Accounting / CPA firms | $12B+ | Financial disclosure handling |

---

## Immediate Next Actions

### Admin console (next session)
1. **AC-3 P0:** Wire `STRIPE_WEBHOOK_SECRET` — run `stripe listen --forward-to localhost:3000/api/webhooks/stripe`, paste secret into `.env.local` and Vercel env
2. **AC-3 P0:** Guard duplicate subscriptions in `/api/billing/checkout` — check `stripeSubscriptionId` before creating new checkout session
3. **AC-1:** Scaffold `/admin` route group with layout, breadcrumb nav, admin-only gate
4. **AC-2:** Billing management page — current plan, inline plan switching, invoice history
5. **P4:** Scope usage enforcement — count at `/api/intake/complete`, surface meter in admin console

### After admin console
6. **P1 E2E test:** Full billing flow with test card `4242 4242 4242 4242` — checkout → webhook → DB sync → dashboard unlocked
7. **Phase 2:** Marketing website scaffold, `/create-org` redesign

---

## Known Blockers

| Severity | Issue | Fix |
|---|---|---|
| 🔴 | **Vercel Hobby plan** — 12-function cap blocks all GitHub-triggered deploys | Upgrade to Pro at vercel.com |
| 🔴 | **`STRIPE_WEBHOOK_SECRET` empty** — webhooks never verify, DB never syncs after payment | `stripe listen`, paste secret |
| 🟡 | **Clerk dev keys in Vercel prod** — auth breaks on non-localhost | Switch to `pk_live_`/`sk_live_` in Vercel env |
| 🟡 | **Duplicate subscription risk** — checkout creates a 2nd sub if org already subscribed | AC-3 guard in checkout API |
| 🟡 | **Scope limits not enforced** — `scopeLimit` defined in PLANS but never checked at intake | P4 above |
| 🟡 | **Resend shared domain** — `onboarding@resend.dev` limited to verified recipients | Verify custom sender domain |

---

## Tech Debt

- `proxy.ts` is the Clerk middleware file (Next.js 16 quirk — document for new devs)
- `INNGEST_EVENT_KEY` absent in dev → SDK attempts localhost:8288; keep the guard
- Schema comment on `agencies.plan` still says `'starter' | 'firm' | 'scale'` — update to `'solo' | 'studio' | 'agency'`
- `scripts/stripe-setup.ts` is now outdated (products created manually + via CLI) — safe to delete or update
