# Monocular

**AI-powered project scoping for service businesses.**

Monocular turns a client conversation into a structured, ready-to-send project scope — automatically. Send an intake link, the client chats with an AI that asks the right questions, and a complete scope document lands in your dashboard. Edit inline, export PDF, send to client.

---

## Plans

| | Solo | Studio | Agency |
|---|---|---|---|
| **Price** | $49/mo | $109/mo | $219/mo |
| **Scopes/mo** | 20 | 75 | Unlimited |
| **Seats** | 1 | 3 | Unlimited |
| **Review links** | — | ✓ | ✓ |
| **Email delivery** | — | ✓ | ✓ |
| **Priority support** | — | — | ✓ |

Annual billing available (2 months free). 7-day free trial, no card required.

---

## Tech stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) |
| Auth & orgs | Clerk v7 — multi-tenant via Organizations |
| Database | Supabase Postgres + Drizzle ORM |
| File storage | Supabase Storage (`scope-pdfs` bucket) |
| AI | Anthropic Claude (Haiku 4.5 intake · Sonnet 4.6 generation) |
| Background jobs | Inngest |
| Email | Resend |
| Billing | Stripe — subscriptions, webhooks, billing portal |
| PDF | @react-pdf/renderer |
| Deployment | Vercel |

---

## Local development

### Prerequisites

- Node.js 20+
- Supabase project
- Clerk account with Organizations enabled
- Anthropic API key
- Stripe account (test mode)
- Inngest account (or `npx inngest-cli@latest dev`)

### Setup

```bash
cd app
npm install
cp .env.local.example .env.local   # fill in all values
```

### Environment variables

```env
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

ANTHROPIC_API_KEY=sk-ant-...

RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Monocular <onboarding@resend.dev>

INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...     # from: stripe listen --forward-to localhost:3000/api/webhooks/stripe
STRIPE_PRICE_SOLO=price_...
STRIPE_PRICE_SOLO_ANNUAL=price_...
STRIPE_PRICE_STUDIO=price_...
STRIPE_PRICE_STUDIO_ANNUAL=price_...
STRIPE_PRICE_AGENCY=price_...
STRIPE_PRICE_AGENCY_ANNUAL=price_...

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Database

```bash
npm run db:push
```

### Clerk webhook (local)

Point Clerk's `organization.created` webhook to:
```
https://<ngrok-url>/api/webhooks/clerk
```

This seeds the agency row and default project types on org creation.

### Stripe (local)

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the printed `whsec_...` into `.env.local` as `STRIPE_WEBHOOK_SECRET`. Without this, billing DB sync won't work.

Test card: `4242 4242 4242 4242` (any future expiry, any CVC).

### Supabase Storage

Create a public bucket named `scope-pdfs` in Supabase Dashboard → Storage.

### Run

```bash
npm run dev
```

Sign up → create org → dashboard. The Clerk webhook fires on org creation and seeds everything.

---

## First run walkthrough

1. Sign up at `/sign-up`
2. Create org at `/create-org` — fires Clerk webhook, seeds DB
3. Dashboard → **New Intake Link** → pick template → copy link
4. Open link in incognito, complete intake as the client
5. Return to dashboard — scope appears within ~30 seconds
6. Open scope → edit inline → export PDF

---

## Role model

| | `org:admin` | `org:member` |
|---|---|---|
| Dashboard, Scopes, Intake | ✓ | ✓ |
| Team page | ✓ | ✓ (read-only) |
| Billing & plan management | ✓ | — |
| Settings (project types, org config) | ✓ | — |
| Invite / remove members | ✓ | — |

---

## Scripts

| Script | Purpose |
|---|---|
| `npx tsx scripts/test-trial-expiry.ts` | Force trial expiry for testing (saves snapshot) |
| `npx tsx scripts/test-trial-expiry.ts --reset` | Restore from snapshot |
| `npx tsx scripts/check-agency.ts` | Inspect current agency DB state |
| `npx tsx scripts/update-stripe-prices.ts` | Create new Stripe prices, archive old |

---

## Project structure

See [`AGENTS.md`](./AGENTS.md) for file-by-file breakdown, dev conventions, and known blockers.
See [`ROADMAP.md`](./ROADMAP.md) for phased feature plan.
See [`CHANGELOG.md`](./CHANGELOG.md) for session-by-session history.
