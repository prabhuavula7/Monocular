# Monocular — Product Roadmap

> Living document. Phases are sequential but items within a phase can run in parallel.
> Last updated: 2026-04-26

---

## Phase 1 — Revenue Foundation `[IN PROGRESS]`
*Goal: charge money, close first paying customers.*

### 1.1 Stripe Billing Integration

#### Done ✅
- [x] Install `stripe` + `@stripe/stripe-js`
- [x] Add env vars: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- [x] Create Stripe products + prices for three tiers:
  - **Solo** — $49/mo · $490/yr (20 scopes/mo, 1 seat — freelancers & independents)
  - **Studio** — $109/mo · $1,090/yr (75 scopes/mo, 3 seats — small-mid agencies)
  - **Agency** — $219/mo · $2,190/yr (unlimited scopes & seats — full-service firms)
- [x] DB columns: `stripeCustomerId`, `stripeSubscriptionId`, `plan`, `planStatus`, `trialEndsAt` on `agencies`
- [x] `POST /api/billing/checkout` — create Stripe Checkout session, reuse existing customer
- [x] `POST /api/billing/portal` — Stripe Billing Portal session
- [x] `POST /api/webhooks/stripe` — handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- [x] Stripe customer seeded on org creation (Clerk `organization.created` webhook extended)
- [x] 7-day free trial — app-managed (`trialEndsAt = now + 7d`), no card required
- [x] Paywall: dashboard layout redirects to `/pricing?expired=1` if trial expired, `/pricing` if canceled
- [x] 60-day data retention banner on expired-trial pricing page
- [x] `/pricing` public page: monthly/annual toggle, three-column plan cards, Stripe Checkout flow
- [x] `/account` billing section: plan name, status badge, days-remaining, Manage billing / Upgrade CTA
- [x] **Wire `STRIPE_WEBHOOK_SECRET`** — done 2026-04-26; `stripe listen` secret in `.env.local`, all webhooks returning 200
- [x] **Guard duplicate subscriptions** — done 2026-04-26; checkout route checks Stripe for active sub, redirects to portal if found

#### P1 — Remaining E2E verification
- [ ] Verify trial expiry: set `trialEndsAt` to a past date in DB → confirm redirect to `/pricing?expired=1`
- [x] Full billing flow tested 2026-04-26 — webhooks verified, DB sync confirmed, duplicate guard confirmed
- [x] `invoice.payment_failed` handler code-verified correct (fires `past_due` update by customerId)
- [x] Portal link verified — Manage billing + duplicate guard both open Stripe Billing Portal correctly

#### P4 — Scope usage enforcement `[PRE-LAUNCH]`
- [ ] Before creating a scope (in `/api/intake/complete`), count scopes for the org since the billing period start
- [ ] If count ≥ `PLANS[plan].scopeLimit`, return 402 with a usage-limit error
- [ ] Surface scope usage meter in admin console billing page: "X of Y scopes used this month"
- [ ] Upgrade CTA shown inline when >80% of limit used

---

### 1.2 Pricing Page ✅
- [x] `/pricing` route — public, no auth required
- [x] Monthly / Annual toggle (annual = 2 months free)
- [x] Three-column plan cards with feature lists
- [x] Checkout flow: unauthenticated users redirected to `/sign-in?redirect_url=/pricing`
- [x] Studio highlighted as "Most popular"
- [ ] Authenticated admins redirect from `/pricing` → `/admin/billing` (post admin console build)
- [ ] "Contact us" CTA for enterprise / custom needs (post-MVP)
- [ ] Pricing section on marketing homepage (Phase 2)

---

### 1.3 Account Page
- [x] `/account` — personal profile for all members: avatar, name, email, Edit profile, Sign out
- [x] Admin-only sections: Org name, AI preferences, Intake defaults
- [x] Billing card (admin-only): plan badge, status, days remaining, Manage billing / Upgrade CTA
- [ ] Strip billing section from `/account` after admin console is live — billing lives in `/admin/billing` only
- [ ] Account page becomes personal profile only (accessible to all members)

---

### 1.4 Admin Console `[NEXT PRIORITY]`
*Goal: `org:admin` users have total visibility and control over billing, team, and usage from a single place. `org:member` users can never access this area.*

#### Overview

The admin console is a dedicated route group (`/admin/**`) inside `(dashboard)`, with its own layout and sidebar. Every route in this group hard-redirects members to `/dashboard`. It replaces the billing section in `/account` and the team page in `/team`.

**Route structure:**
```
/admin                          → Admin overview (plan status, seats used, scopes used this period)
/admin/billing                  → Billing & Plans
/admin/team                     → Team management (replaces /team for admins)
/admin/settings                 → Settings hub (merges current /settings)
/admin/settings/project-types   → Project type CRUD
/admin/integrations             → Third-party integrations
/admin/api                      → API platform (Coming Soon placeholder)
```

**Role enforcement:**
- `(dashboard)/layout.tsx` already gates all dashboard routes to authenticated users
- New `(admin)/layout.tsx` adds `if (orgRole !== 'org:admin') redirect('/dashboard')`
- `/team` old URL redirects to `/admin/team`
- `/settings/**` old URLs redirect to `/admin/settings/**`
- Members never see Admin link in the main sidebar

#### AC-1 — Admin Console shell
- [ ] `app/(dashboard)/(admin)/` route group with `layout.tsx` — `org:admin` guard → redirect `/dashboard`
- [ ] Admin sidebar: Overview · Billing & Plans · Team · Settings · Integrations · API
- [ ] Main dashboard sidebar: add "Admin" section (admin-only) linking to `/admin`
- [ ] Consolidate `SEAT_LIMITS` out of two files and into `lib/stripe.ts` alongside `PLANS`

#### AC-2 — Billing & Plans page `/admin/billing`
- [ ] Current plan card: plan name, status badge, renewal date, next invoice amount
- [ ] Payment method on file: last 4, expiry, brand icon; "Update card" → Stripe portal
- [ ] Seat usage: `X of Y seats used` (Clerk member count vs `SEAT_LIMITS[plan]`)
- [ ] Scope usage: `X of Y scopes used this month` with progress bar (P4 item above)
- [ ] All three plan cards (Solo / Studio / Agency) — current plan highlighted, upgrade/downgrade buttons
  - **Upgrade**: confirmation modal → `POST /api/billing/switch` → `stripe.subscriptions.update` with proration
  - **Downgrade**: modal warns about feature/seat/scope limit changes; effective at period end
  - **First checkout** (trial → paid): still goes through Stripe Checkout session
- [ ] Invoice history table: date, amount, status (paid/open/void), PDF download (Stripe-hosted)
- [ ] Cancel subscription: confirmation modal with "data retained 60 days" messaging → `POST /api/billing/cancel` → `cancel_at_period_end: true`
- [ ] Auto-refresh on plan change: Stripe webhook → DB update → `router.refresh()` + optimistic UI
- [ ] New API routes: `GET /api/billing/status`, `POST /api/billing/switch`, `POST /api/billing/cancel`

#### AC-3 — Stripe ↔ DB sync
- [x] Wire `STRIPE_WEBHOOK_SECRET` — done 2026-04-26
- [x] Guard duplicate subscriptions in `/api/billing/checkout` — done 2026-04-26
- [ ] `POST /api/billing/sync` admin-only — manually re-pulls subscription state from Stripe API, writes to DB; exposed as "Sync with Stripe" button in admin console (emergency escape hatch)
- [ ] Webhook handlers made idempotent: check existing values before overwriting

#### AC-4 — Usage dashboard (within `/admin/billing` or `/admin` overview)
- [ ] Scopes this billing period: count vs plan limit, visual progress bar
- [ ] Scopes all-time: total created, won, lost, sent, in-review
- [ ] Team seats: used vs plan limit
- [ ] All metrics server-side on page load

#### AC-5 — Team management `/admin/team`
- [ ] Move `/team` page + `TeamClient.tsx` under `/admin/team`
- [ ] Redirect old `/team` URL → `/admin/team`
- [ ] Member list: name, email, role badge, joined date
- [ ] Invite by email (Clerk invitation, seat-limit check)
- [ ] Role toggle (admin ↔ member), remove member; self-action guards stay
- [ ] Seat limit warning when near limit (currently just blocks at limit)
- [ ] Clerk webhook `organizationMembership.created` for real-time seat enforcement

#### AC-6 — Settings `/admin/settings`
- [ ] Redirect `/settings/**` → `/admin/settings/**`
- [ ] Keep all existing project-types CRUD under new URL
- [ ] Settings hub page updated to new admin sidebar context

#### AC-7 — Integrations page `/admin/integrations`
- [ ] Static placeholder page with integration cards: Zapier, Slack, HubSpot, Notion, Salesforce
- [ ] All cards show "Coming soon" with a waitlist email CTA
- [ ] No backend needed — wired up in Phase 4

#### AC-8 — API platform page `/admin/api`
- [ ] "Coming soon" placeholder page explaining what the API will do
- [ ] Brief description: send intake transcripts or structured data → get scope JSON back; integrate Monocular's scoping engine into your own tools
- [ ] Email CTA for API early access waitlist
- [ ] No backend, no key generation — Phase 4 item

#### AC-9 — Admin access controls
- [ ] Admins can view all org scopes (confirm org-scoped query, not user-scoped)
- [ ] Admins can delete any scope or intake link
- [ ] Org-wide activity feed in `/admin` overview (last 20 events: created, generated, sent, won, lost)

---

### 1.5 Role-Based Access Cleanup `[AFTER ADMIN CONSOLE]`
- [ ] Strip billing section from `/account` — personal profile only remains
- [ ] Remove Admin link from main sidebar for `org:member`
- [ ] `/pricing` → redirect to `/admin/billing` for authenticated admins
- [ ] Audit: confirm no admin-only data surfaces to members anywhere in the app

---

## Phase 2 — Marketing Website `[NEXT AFTER PHASE 1]`
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

### 3.1 Production Infrastructure
- [ ] Upgrade Vercel to Pro — Hobby plan caps at 12 serverless functions; app has 30+ routes (🔴 blocks every GitHub-triggered deploy)
- [ ] Switch Clerk to production keys (`pk_live_` / `sk_live_`) — dev keys are set in Vercel prod env
- [ ] Wire `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` in Vercel production env
- [ ] Set Stripe production keys + webhook endpoint in Vercel env
- [ ] Set Clerk webhook production URL pointing to production domain
- [ ] Verify sender domain in Resend dashboard (currently `onboarding@resend.dev` — limited to verified recipients)
- [ ] Set `NEXT_PUBLIC_APP_URL` in Vercel to production domain

### 3.2 Scope Editor Polish
- [ ] In-line comment threads on scope sections (reviewer collaboration)
- [ ] Version history — track each edit with timestamp + author
- [ ] Approval workflow: reviewer marks scope `approved` before PDF unlocked for export
- [ ] Scope templates: pre-fill from past approved scopes (semantic similarity via embeddings)

### 3.3 Analytics & Observability
- [ ] Scope generation success/failure rate tracking
- [ ] Token usage per org per month (cost visibility)
- [ ] Inngest event tracing dashboard integration

---

## Phase 4 — Scope Engine & API Platform `[Q3 2026]`
*Goal: stop being "a scoping tool" — become the intelligence layer service firms run on.*

### 4.1 Public API
The API platform allows other businesses to embed Monocular's scope generation engine into their own tools. A CRM, proposal software, or custom internal system can POST discovery call transcripts or structured intake data and receive a fully formatted scope JSON back. Usage is billed against the org's plan; rate limits are per API key.

- [ ] `POST /v1/scope` — submit intake transcript → receive structured scope JSON
- [ ] `GET /v1/scopes/{id}` — retrieve a generated scope
- [ ] Webhooks: `scope.generated`, `scope.approved`, `scope.exported` events posted to registered URLs
- [ ] API reference docs (auto-generated from Zod schemas)

### 4.2 API Key Infrastructure
- [ ] `apiKeys` table: `(id, agencyId, name, keyHash, keyPrefix, createdAt, lastUsedAt, revokedAt)`
  - Store only the hash; display the prefix (e.g. `mk_live_abc...`)
  - Full key shown once on creation — never stored in plaintext
- [ ] `GET /api/api-keys` — list org's keys
- [ ] `POST /api/api-keys` — generate new key, return full key once
- [ ] `DELETE /api/api-keys/[id]` — revoke key
- [ ] Admin console `/admin/api` upgraded from "Coming soon" to live key management UI
- [ ] Rate limiting per API key tied to plan tier
- [ ] Usage tracked per key (request count, last used, scopes consumed)

### 4.3 Integrations
- [ ] HubSpot: push approved scope as a Deal
- [ ] Salesforce: scope as Opportunity
- [ ] Zapier / Make connector
- [ ] Slack: post scope summary to a channel
- [ ] Wire `/admin/integrations` cards to real OAuth flows

### 4.4 Template Marketplace
- [ ] Org-level template library
- [ ] Global template library (curated by Monocular team)
- [ ] Template picker in intake link creation

### 4.5 Custom Branding
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

1. **P1:** Verify trial expiry — set `trialEndsAt` to past date in DB, confirm `/dashboard` → `/pricing?expired=1` redirect
2. **AC-1:** Scaffold `/admin` route group with layout, admin sidebar, `org:admin` guard
3. **AC-2:** Build `/admin/billing` — current plan, payment method, seat usage, upgrade/downgrade/cancel modals + Stripe integration
4. **AC-3:** Add `POST /api/billing/sync` manual re-sync endpoint
5. **AC-4:** Scope usage meter in admin billing page
6. **AC-5:** Move `/team` → `/admin/team`, restrict to admins
7. **AC-6:** Migrate `/settings/**` → `/admin/settings/**`
8. **AC-7 + AC-8:** Integrations + API coming soon placeholder pages
9. **1.5:** Strip billing from `/account`, clean up role enforcement
10. **P4:** Scope usage enforcement at `/api/intake/complete`
11. Phase 2: Marketing website scaffold + `/create-org` redesign

---

## Known Blockers

| Severity | Issue | Fix |
|---|---|---|
| 🔴 | **Vercel Hobby plan** — 12-function cap blocks all GitHub-triggered deploys | Upgrade to Pro at vercel.com |
| 🟡 | **Clerk dev keys in Vercel prod** — auth breaks on non-localhost | Switch to `pk_live_`/`sk_live_` in Vercel env |
| 🟡 | **Scope limits not enforced** — `scopeLimit` defined in PLANS but never checked at intake | P4 above |
| 🟡 | **Resend shared domain** — `onboarding@resend.dev` limited to verified recipients | Verify custom sender domain |

---

## Tech Debt

- `proxy.ts` is the Clerk middleware file (Next.js 16 quirk — document for new devs)
- `INNGEST_EVENT_KEY` absent in dev → SDK attempts localhost:8288; keep the guard
- Schema comment on `agencies.plan` still says `'starter' | 'firm' | 'scale'` — update to `'solo' | 'studio' | 'agency'`
- `scripts/stripe-setup.ts` is now outdated (products created manually + via CLI) — safe to delete or update
- `SEAT_LIMITS` duplicated in `app/api/team/route.ts` and `TeamClient.tsx` — consolidate into `lib/stripe.ts`
