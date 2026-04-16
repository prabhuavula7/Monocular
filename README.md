# Monocular

**AI-powered project scoping for digital agencies.**

Monocular turns a client conversation into a structured, ready-to-send project scope — automatically. Agencies send an intake link, the client chats with an AI that asks the right questions for their industry, and a complete scope document (deliverables, milestones, pricing estimate, risk flags) is waiting in the dashboard when they're done.

---

## How it works

1. **Create an intake link** — pick a project template (Web Dev, Mobile App, Brand Identity, E-commerce, SEO, Social Media, Video, UX Redesign, SaaS Build, Digital Marketing, or a general open intake), optionally pre-fill the client name and email.

2. **Send the link to your client** — the client opens a chat interface in their browser. No login required. An AI (Claude) conducts the intake conversation, probing for all the information relevant to that project type.

3. **Scope is generated automatically** — when the client marks the chat as complete, a background job extracts structured data from the transcript and generates a full scope document:
   - Executive summary
   - Deliverables list with phases
   - Milestone timeline
   - Pricing estimate range
   - Risk flags
   - Assumptions and out-of-scope items

4. **Review, edit, and export** — the scope appears in your dashboard. Click in to edit any field inline (auto-saved). Change the pipeline status (Draft → In Review → Sent → Won/Lost). Export to PDF when it's ready to send.

---

## Tech stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) |
| Auth & orgs | Clerk v7 — multi-tenant via Organizations |
| Database | Supabase Postgres + Drizzle ORM |
| File storage | Supabase Storage (`scope-pdfs` bucket) |
| AI | Anthropic Claude (intake chat + scope generation) |
| Background jobs | Inngest |
| Email | Resend (stubbed — not yet wired) |
| PDF | @react-pdf/renderer |
| Deployment | Vercel |

---

## Local development

### Prerequisites

- Node.js 20+
- A Supabase project
- Clerk account with Organizations enabled
- Anthropic API key
- Inngest account (or run `npx inngest-cli@latest dev` locally)

### Setup

```bash
cd app
npm install
```

Copy `.env.local.example` to `.env.local` and fill in all values:

```env
DATABASE_URL=postgresql://...           # Supabase direct connection URL
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

ANTHROPIC_API_KEY=sk-ant-...

RESEND_API_KEY=re_...

INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Database

```bash
npm run db:push       # push schema to Supabase
```

### Clerk webhook (local)

Point Clerk's webhook (event: `organization.created`) to your ngrok URL:

```
https://<your-ngrok-url>/api/webhooks/clerk
```

The webhook seeds an agency row and default project types when you create your first Clerk organization.

### Supabase Storage

Create a public bucket named `scope-pdfs` in the Supabase Dashboard → Storage.

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, create an organization, and you'll land on the dashboard.

---

## First run walkthrough

1. Sign up at `/sign-up`
2. Create an organization at `/create-org` — this fires the Clerk webhook and seeds the DB
3. You land on `/dashboard` — click **New Intake Link**
4. Pick a template, optionally add client details, copy the generated link
5. Open the link in a new tab (or incognito) — complete the intake chat as if you were the client
6. Return to the dashboard — scope should appear within ~30 seconds (Inngest job)
7. Click the scope to review, edit fields inline, change status, and export to PDF

---

## Project structure

See [`AGENTS.md`](./AGENTS.md) for a full file-by-file breakdown, known broken items, and development conventions.
