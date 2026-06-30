# Monocular

**Agentic project scoping for service businesses.**

A client gets an intake link. A domain-expert AI agent — not a form, not a generic chatbot — conducts a structured scoping conversation, probing the right depth for the right vertical. A complete project scope lands in the firm's dashboard: deliverables, milestones, risk flags, assumptions, and a price estimate. The firm reviews, edits inline, and sends.

The AI compresses the work. The firm keeps the judgment.

**→ [Full product overview, roadmap & investment thesis](https://prabhuavula7.github.io/Monocular/public/monocular.html)**

---

## How it works

```
  Client receives intake link
         │
         ▼
  ┌──────────────────────────────────────────────────────┐
  │  intake/[token]                                      │
  │                                                      │
  │  User: "We need a Shopify store. Currently on        │
  │         Squarespace, 40 products, QuickBooks sync."  │
  │                                                      │
  │  Agent: "One-way (Shopify → QuickBooks) or           │
  │          bidirectional inventory sync?"              │
  │                                                      │
  │  User: "Just one-way. Shopify orders into QB         │
  │         for accounting."                             │
  │                                                      │
  │  Agent: "Shipping — flat rate or weight/zone?        │
  │          And for the blog: managed in Shopify?"      │
  │                                                      │
  │             [ readyToComplete: true ]                │
  └──────────────────────┬───────────────────────────────┘
                         │
                         ▼
  ┌──────────────────────────────────────────────────────┐
  │  lib/engine/                                         │
  │                                                      │
  │  orchestrator ──► synthesize_scope ──► Claude        │
  │                                                      │
  │  → Structured scope JSON                             │
  │  → agent_runs + agent_steps trace rows               │
  └──────────────────────┬───────────────────────────────┘
                         │
                         ▼
  ┌──────────────────────────────────────────────────────┐
  │  /scopes/[id]                                        │
  │  Inline editor · PDF export · Client review link     │
  └──────────────────────────────────────────────────────┘
```

The example above is verbatim from a live engine run — the agent identified that QuickBooks sync direction was the single most scope-determining question before flagging ready to wrap.

---

## Engine architecture

The agentic engine is the core of the product. All model calls flow through one function — `callGateway()` in `gateway.ts` — making the entire agentic path traceable, auditable, and replaceable.

```
lib/engine/
├── index.ts                runEngine(input) → EngineResult  [single entry point]
├── orchestrator.ts         agent loop: plan → tool → observe → repeat (MAX_STEPS=10)
├── gateway.ts              Anthropic call-site; token accounting; prompt caching
├── runs.ts                 agent_runs + agent_steps persistence
├── tools/
│   ├── registry.ts         Zod-typed tool registration
│   ├── ask-followup.ts     loop-exit: returns next question to the client
│   ├── synthesize-scope.ts loop-exit: generates structured scope JSON
│   └── research.ts         URL-grounded research (SSRF-protected)
└── verticals/
    ├── types.ts             VerticalConfig: persona prompt + schema + risk library
    └── web-dev.ts           V1 vertical — senior web-dev consultant persona
```

**The design principle:** a vertical is a config file, not a code branch. The web-dev agent probes CMS vs custom, auth, integrations, content migration, mobile, analytics — and flags scope-creep triggers in real time. `web-dev.ts` is ~120 lines: a persona prompt, a Zod extraction schema, and a risk library. A legal or architecture vertical is the same shape.

```typescript
// One entry point — intake turns, scope generation, operator chat, background jobs
const result = await runEngine({
  mode: 'intake',
  agencyId,
  vertical: 'web-dev',
  context: { messages, userMessage, agencyName },
})
// → { kind: 'followup', followupQuestion: string, readyToComplete: boolean, runId, steps, tokensUsed }
```

Every run writes to `agent_runs` (one row per invocation) and `agent_steps` (one row per model call or tool call). This is the debug substrate and the ML flywheel — trace, eval, and future fine-tuning all read from these tables.

---

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Auth & orgs | Clerk v7 — multi-tenant via Organizations |
| Database | Supabase Postgres + Drizzle ORM v0.45 |
| AI | Anthropic Claude — Haiku 4.5 intake · Sonnet 4.6 generation |
| Background jobs | Inngest |
| Email | Resend |
| Billing | Stripe — subscriptions, webhooks, billing portal |
| PDF | @react-pdf/renderer |
| Deployment | Vercel |
| UI | Tailwind CSS + shadcn/ui · Plus Jakarta Sans · WebGL2 auth animations |

---

## Getting started

**Prerequisites:** Node 20+, Supabase project, Clerk account (Organizations enabled), Anthropic API key, Stripe test account.

```bash
cd app
npm install
cp .env.local.example .env.local   # fill in all values — see below
npm run db:push
npm run dev
```

In a second terminal (required for billing webhooks):
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Sign up → create an org (fires Clerk webhook, seeds DB) → dashboard. Full walkthrough:

1. `/sign-up` → create account
2. `/create-org` → create org, Clerk webhook fires, seeds `agencies` + default project types
3. Dashboard → **New Intake Link** → copy link
4. Open in incognito, complete intake as the client
5. Return to dashboard — scope appears within ~30 seconds
6. Scope editor → edit inline → export PDF

<details>
<summary>Environment variables</summary>

```env
# Database
DATABASE_URL=postgresql://...           # Supabase direct connection
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...          # from Clerk dashboard → Webhooks

# AI
ANTHROPIC_API_KEY=sk-ant-...

# Email
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Monocular <onboarding@resend.dev>

# Background jobs
INNGEST_EVENT_KEY=...                   # optional in dev — required in prod
INNGEST_SIGNING_KEY=...

# Payments
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...         # from: stripe listen --forward-to ...
STRIPE_PRICE_SOLO=price_...
STRIPE_PRICE_SOLO_ANNUAL=price_...
STRIPE_PRICE_STUDIO=price_...
STRIPE_PRICE_STUDIO_ANNUAL=price_...
STRIPE_PRICE_AGENCY=price_...
STRIPE_PRICE_AGENCY_ANNUAL=price_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
USE_ENGINE=true                         # routes intake + generation through lib/engine/
```

**Clerk webhook:** in the Clerk dashboard, point `organization.created` to `https://<ngrok>/api/webhooks/clerk`.

**Supabase Storage:** create a public bucket named `scope-pdfs` in Supabase → Storage.

**Next.js 16 notes:** middleware file is `proxy.ts` (not `middleware.ts`). Dynamic params, `searchParams`, `cookies()`, and `headers()` are async — `await` before use.
</details>

---

## What's being built next

The engine routes real intake conversations. These surfaces are in active development:

| | Item | Description |
|---|---|---|
| 🏗 | `/admin/runs` trace viewer | List `agent_runs`, click into any run, inspect every `agent_steps` row — tool I/O, latency, token cost |
| 🏗 | Admin console | Full operator control: billing management, team, usage dashboard, plan switching |
| 📋 | Operator chat | Firm-side chat with the engine for manual regeneration and scope gap analysis |
| 📋 | New verticals | Legal, architecture, accounting — each is a new `VerticalConfig`, not a code change |
| 📋 | Public API | `POST /v1/scope` — embed Monocular's scoping engine in any CRM or proposal tool |
| 📋 | Marketing website | `(marketing)` route group — the design handoff is ready, needs Next.js implementation |

Full phased plan: [ROADMAP.md](./ROADMAP.md)

---

## Contributing

The engine core is under 500 lines of clean TypeScript. Zod end-to-end. No framework dependencies. No LangChain. If you want to dig in, orient with `lib/engine/index.ts` → `orchestrator.ts` → `verticals/web-dev.ts`. The entire agentic loop is ~150 lines in the orchestrator.

**New verticals** are the highest-leverage contribution. A vertical is a single `VerticalConfig` in `lib/engine/verticals/`. The `web-dev.ts` reference is the template — a persona prompt, an extraction schema, and a risk library. Legal, architecture, and accounting verticals are all well-scoped problems with real TAM.

**The trace viewer** (`/admin/runs`) is ready to be built. The data exists — `agent_runs` and `agent_steps` are populated on every engine run. A `shadcn/ui` table + detail pane reading from a new `/api/admin/runs` route is the full surface. Protected behind Clerk `publicMetadata.role === 'admin'` in middleware.

**Research tool depth** — `lib/engine/tools/research.ts` does URL fetch + text extraction. Structured data extraction, better chunking, or embeddings-based retrieval would meaningfully improve scope quality for research-heavy projects.

**Test harness** — `POST /api/dev/test-engine` (blocked in production) runs 3 hardcoded transcripts through the engine. More test cases and a proper repeatable benchmark suite are open work.

**Marketing website** — the design handoff lives in `design_handoff_monocular/` and `public/monocular.html`. The `(marketing)` route group is scaffolded in the app but empty. This is a good first contribution for frontend-focused engineers.

---

## License

MIT
