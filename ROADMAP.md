# Monocular — Product Roadmap

> Living document. Phases are sequential but items within a phase can run in parallel.
> Last updated: 2026-04-21

---

## Phase 1 — Revenue Foundation `[NOW]`
*Goal: charge money, close first paying customers.*

### 1.1 Stripe Billing Integration `[CRITICAL PATH]`
- [ ] Install `stripe` + `@stripe/stripe-js` + `@stripe/react-stripe-js`
- [ ] Add env vars: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- [ ] Create Stripe products + prices matching the three tiers:
  - **Starter** — $49/mo (solo consultants, ≤50 scopes/mo)
  - **Firm** — $99/mo (agencies/studios, ≤200 scopes/mo)
  - **Scale** — $249/mo (high-volume, unlimited scopes + priority support)
- [ ] DB: add `stripeCustomerId`, `stripeSubscriptionId`, `plan`, `planStatus`, `trialEndsAt` to `agencies` table (Drizzle migration)
- [ ] `POST /api/billing/checkout` — create Stripe Checkout session, redirect user
- [ ] `POST /api/billing/portal` — create Stripe Billing Portal session
- [ ] `POST /api/webhooks/stripe` — handle `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- [ ] Seed `stripeCustomerId` on org creation (Clerk `organization.created` webhook already exists — extend it)
- [ ] Paywall middleware: gate `/dashboard/*` routes on active subscription; redirect to `/pricing` if plan is `free` or `inactive`
- [ ] Usage limiter: count `scopes` per org per billing period, block generation when over plan limit, surface upgrade CTA
- [ ] 14-day free trial on signup — no card required, `trialEndsAt` enforced by middleware

### 1.2 Pricing Page
- [ ] `/pricing` route in the Next.js app (not the HTML file)
- [ ] Three-column plan cards matching Stripe price IDs
- [ ] "Start free trial" → Stripe Checkout; "Contact sales" for enterprise inquiries
- [ ] Highlight `Firm` as recommended tier

### 1.3 Account / Billing UI
- [ ] `/account` page: show current plan, next renewal date, usage meter (scopes used / limit)
- [ ] "Upgrade plan" and "Manage billing" buttons → Stripe portal
- [ ] Downgrade/cancel flow with confirmation modal

---

## Phase 2 — Marketing Website `[NEXT]`
*Goal: replace the static `monocular.html` with a real Next.js marketing site that converts.*

### 2.1 Public Site Architecture
- [ ] New Next.js route group `(marketing)` with its own layout (no auth nav)
- [ ] Pages: `/` (hero + features + how-it-works + pricing + FAQ + CTA), `/pricing`, `/about`, `/contact`
- [ ] Shared design system: extend existing Tailwind config — orange accent (`#F97316`), dark-first palette matching monocular.html tokens, JetBrains Mono for code/mono elements
- [ ] Fully responsive (mobile-first); hero + feature sections from monocular.html adapted to React components

### 2.2 Navigation
- [ ] Top nav: Logo · Features · Pricing · About · `Sign In` → `/sign-in` · `Start free` → `/sign-up`
- [ ] All anchor links (`#features`, `#how-it-works`, etc.) work
- [ ] Mobile hamburger menu

### 2.3 Custom Auth Pages (Clerk-powered, custom UI)
- [ ] Design custom sign-in layout: dark bg, Monocular logo, email/password fields, Google OAuth button — Clerk's `useSignIn()` hook under the hood
- [ ] Design custom sign-up layout: same treatment + org name field, feeds into Clerk's `useSignUp()` + org creation flow
- [ ] Remove bare `<SignIn />` / `<SignUp />` Clerk embeds — replace with custom components that call Clerk's headless APIs
- [ ] Keep `/create-org` flow but redesign it to match the new auth look
- [ ] Error states, loading spinners, password visibility toggle — all custom

### 2.4 Hero & Feature Sections
- [ ] Hero: headline, sub-headline, animated terminal/chat demo mockup (CSS-only), two CTAs (Start free / Book demo)
- [ ] "How it works" — 3-step: Create Link → Client Chats → Scope Generated
- [ ] Feature grid: AI intake, PDF export, team review, confidence scoring, Resend email delivery
- [ ] Social proof section: placeholder for design partner quotes / logos
- [ ] ROI section: numbers from `POSITIONING.md` (2 hrs → 18 min, $3,200/mo saved)
- [ ] Pricing section (pulls Phase 1 tier data)
- [ ] FAQ section (content from `OBJECTIONS.md`)
- [ ] Footer: links, copyright, legal (Terms / Privacy stubs)

### 2.5 Legal Stubs
- [ ] `/terms` — Terms of Service placeholder
- [ ] `/privacy` — Privacy Policy placeholder

---

## Phase 3 — Product Hardening `[Q2 2026]`
*Goal: production-ready, team-ready, trustworthy.*

### 3.1 Team Management
- [ ] Leverage Clerk org memberships → surface `Admin` / `Member` roles in product
- [ ] Admin console: invite team members, manage roles, view org-wide scope history
- [ ] Role-based access: only Admins can manage billing, create/delete intake links

### 3.2 Production Infrastructure
- [ ] Wire `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` in Vercel production env
- [ ] Verify `notifications@monocular.so` sender domain in Resend dashboard
- [ ] Set Clerk webhook production URL
- [ ] Vercel preview deployments with seeded test data

### 3.3 Scope Editor Polish
- [ ] In-line comment threads on scope sections (reviewer collaboration)
- [ ] Version history — track each edit with timestamp + author
- [ ] Approval workflow: reviewer marks scope `approved` before PDF is unlocked for export
- [ ] Scope templates: pre-fill from past approved scopes (semantic similarity via embeddings)

### 3.4 Analytics & Observability
- [ ] Scope generation success/failure rate tracking
- [ ] Token usage per org per month (cost visibility for you, usage enforcement for plan limits)
- [ ] Inngest event tracing dashboard integration

---

## Phase 4 — Scope Engine `[Q3 2026]`
*Goal: stop being "a scoping tool" — become the intelligence layer service firms run scoping on.*

### 4.1 Public API
- [ ] REST API: `POST /v1/scope` — submit transcript, get structured scope JSON back
- [ ] API keys per org (generated, rotatable, scoped to org)
- [ ] Rate limiting per API key tied to plan tier
- [ ] API reference docs (auto-generated from Zod schemas)
- [ ] Webhook delivery: fire `scope.generated`, `scope.approved`, `scope.exported` events to customer URLs

### 4.2 Integrations
- [ ] HubSpot: push approved scope as a Deal with custom properties
- [ ] Salesforce: same — scope as Opportunity
- [ ] Zapier / Make connector (via webhook + OAuth)
- [ ] Slack: post scope summary to a channel on generation

### 4.3 Template Marketplace
- [ ] Org-level template library: save approved scopes as reusable templates
- [ ] Global template library: curated by Monocular team (agency, branding, dev, consulting)
- [ ] Template picker in intake link creation flow

### 4.4 Custom Branding
- [ ] White-label intake chat: agency's logo, brand color, custom domain for the intake URL
- [ ] White-label PDF: agency header/footer, custom cover page

---

## Phase 5 — ML Intelligence Layer `[Q4 2026]`
*Full spec in `ML-ARCHITECTURE.md`. Summary:*

- [ ] **Zero-data (ship immediately)**: RAG over past scopes, semantic similarity for template matching, embedding-based duplicate detection
- [ ] **V2 ML models** (once 500+ scopes in prod): risk classifier, pricing regression, win/loss predictor, scope completion detector, quality scorer
- [ ] **V3 fine-tuning** (once 5,000+ approved scopes): DPO fine-tune on `(transcript, rejected_scope, accepted_scope)` triples — own the model, cut Claude costs
- [ ] Confidence scores surfaced in UI per scope section
- [ ] Pricing guardrails: flag scopes where AI-suggested price deviates >20% from org historical average

---

## Phase 6 — Vertical Expansion `[2027]`
*Goal: replicate the agency playbook across adjacent service verticals.*

| Vertical | TAM | Unlock trigger |
|---|---|---|
| Law firms (417K US) | $25B+ | Phase 4 API stable + legal design partners |
| Physician practices (395K US) | $18B+ | HIPAA BAA signed, data residency |
| Architecture / Engineering (68K US) | $8B+ | CAD/spec attachment parsing |
| Accounting / CPA firms | $12B+ | Financial disclosure handling |

- [ ] Vertical-specific intake prompt sets
- [ ] Vertical-specific scope templates
- [ ] Compliance layer (HIPAA for medical, data residency controls)
- [ ] Dedicated vertical landing pages

---

## Immediate Next Actions (this week)

1. **Stripe** — start with 1.1: DB migration → webhook handler → checkout session → paywall middleware
2. **Website** — scaffold `(marketing)` route group, port monocular.html sections to React components
3. **Custom auth pages** — swap `<SignIn />` embed for headless Clerk-powered custom UI

---

## Tech Debt / Known Issues
- `proxy.ts` is the Clerk middleware file (Next.js 16 quirk) — document this for any new devs
- `INNGEST_EVENT_KEY` absent in dev causes SDK to attempt localhost:8288 — keep the guard
- Resend sender domain not yet verified for production
- Sign-in/sign-up pages are bare Clerk embeds — no brand design
