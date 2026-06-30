/**
 * Dev-only route for testing the agentic engine end-to-end.
 * Blocked in production via NODE_ENV check.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agencies, scopes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { runEngine } from '@/lib/engine'

if (process.env.NODE_ENV === 'production') {
  throw new Error('Dev route loaded in production — this should not happen')
}

const TEST_TRANSCRIPTS = [
  {
    label: 'E-commerce replatform (Squarespace → Shopify + QuickBooks)',
    messages: [
      { role: 'assistant', content: 'Hi! Tell me about the project you have in mind.' },
      { role: 'user', content: "We need to redo our website. We sell handmade furniture and our current site is really old and doesn't work on mobile. We want something modern." },
      { role: 'assistant', content: "Got it — are you looking to keep Squarespace or move to a different platform? And how many products do you carry?" },
      { role: 'user', content: "We use Squarespace right now but we've heard Shopify is better for products. We have about 40 products. We also need to integrate with our QuickBooks for inventory." },
      { role: 'assistant', content: "Makes sense. Who will manage the site after launch — uploading new products, updating content?" },
      { role: 'user', content: "My wife will handle it. She's good with computers but not a developer." },
      { role: 'assistant', content: "And do you have a timeline in mind, or a budget range?" },
      { role: 'user', content: "We'd like it done by the holidays — so end of November. Budget is flexible, maybe $15-25k?" },
    ],
  },
  {
    label: 'SaaS MVP — personal trainer platform with subscriptions',
    messages: [
      { role: 'assistant', content: 'Hi! Tell me about the project you have in mind.' },
      { role: 'user', content: "We're building a platform for personal trainers to manage their clients. They need to send workout plans, track progress, and charge for sessions." },
      { role: 'assistant', content: "Is this a web app, mobile app, or both? And how does billing work — trainers charge their own clients, or clients pay your platform?" },
      { role: 'user', content: "Web app for now, maybe mobile later. Trainers set their own pricing and clients pay them monthly subscriptions. We take a cut. We need Stripe, and clients should get email reminders for workouts." },
      { role: 'assistant', content: "Got it. Do you have design assets — brand guidelines, wireframes — or does that need to be part of the scope?" },
      { role: 'user', content: "No design yet, we need everything. I'm the founder, making the call. Budget is $40-60k. We MUST launch before January 15th for a fitness conference." },
    ],
  },
  {
    label: 'Architecture firm portfolio with CMS + SEO',
    messages: [
      { role: 'assistant', content: 'Hi! Tell me about the project you have in mind.' },
      { role: 'user', content: "I run a small architecture firm, 8 people. Need a new website, current one is from 2018. Mainly show our work and generate leads." },
      { role: 'assistant', content: "Portfolio site with lead generation — got it. Are you thinking WordPress, Webflow, or something custom? And who updates it after launch?" },
      { role: 'user', content: "Whatever's easiest to update ourselves. We add projects a few times a year. I want to stay away from WordPress if possible, had bad experiences." },
      { role: 'assistant', content: "Webflow would be a great fit then. Do you have brand assets, photography, and copy ready — or do those need to be part of the project?" },
      { role: 'user', content: "We have a logo and fonts. Photography — we have some images but a professional shoot would improve things. We need to write new copy for the about page. Also very important: we want to rank on Google when people search architects in Austin." },
    ],
  },
]

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const { testIndex = 0 } = await req.json().catch(() => ({})) as { testIndex?: number }
  const test = TEST_TRANSCRIPTS[testIndex]

  if (!test) {
    return NextResponse.json({ error: `Invalid testIndex. Use 0-${TEST_TRANSCRIPTS.length - 1}` }, { status: 400 })
  }

  // Find any agency to test with
  const [agency] = await db.select().from(agencies).limit(1)
  if (!agency) {
    return NextResponse.json({ error: 'No agencies in DB — sign up first' }, { status: 400 })
  }

  // Create a test scope record
  const [scope] = await db
    .insert(scopes)
    .values({
      agencyId: agency.id,
      status: 'draft',
      name: `[ENGINE TEST] ${test.label}`,
      transcript: test.messages,
    })
    .returning()

  const t0 = Date.now()

  try {
    const result = await runEngine({
      mode: 'generate',
      agencyId: agency.id,
      vertical: 'web-dev',
      scopeId: scope.id,
      context: {
        transcript: test.messages,
        agencyName: agency.name,
      },
    })

    // Fetch the generated scope
    const [updated] = await db.select().from(scopes).where(eq(scopes.id, scope.id)).limit(1)

    return NextResponse.json({
      ok: true,
      testLabel: test.label,
      scopeId: scope.id,
      runId: result.runId,
      engineResult: {
        kind: result.kind,
        steps: result.steps,
        tokensUsed: result.tokensUsed,
        elapsedMs: Date.now() - t0,
      },
      scope: updated.generatedScope,
    })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      testLabel: test.label,
      scopeId: scope.id,
      error: err instanceof Error ? err.message : String(err),
      elapsedMs: Date.now() - t0,
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    usage: 'POST /api/dev/test-engine with { testIndex: 0|1|2 }',
    tests: TEST_TRANSCRIPTS.map((t, i) => ({ index: i, label: t.label })),
  })
}
