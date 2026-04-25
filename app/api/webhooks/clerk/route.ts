import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agencies, projectTypes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { DEFAULT_PROJECT_TYPES } from '@/lib/defaults'
import { getStripe } from '@/lib/stripe'

export async function POST(req: Request) {
  const body = await req.text()
  const headersList = await headers()

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!)

  let event: { type: string; data: { id: string; name: string } }
  try {
    event = wh.verify(body, {
      'svix-id': headersList.get('svix-id')!,
      'svix-timestamp': headersList.get('svix-timestamp')!,
      'svix-signature': headersList.get('svix-signature')!,
    }) as typeof event
  } catch {
    return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 })
  }

  if (event.type === 'organization.created') {
    const { id: clerkOrgId, name } = event.data

    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

    const [agency] = await db
      .insert(agencies)
      .values({ clerkOrgId, name, plan: 'trial', planStatus: 'trialing', trialEndsAt })
      .returning()

    await db.insert(projectTypes).values(
      DEFAULT_PROJECT_TYPES.map((pt) => ({
        agencyId: agency.id,
        name: pt.name,
        description: pt.description,
        extractionSchema: pt.extractionSchema,
        milestonePattern: pt.milestonePattern,
        riskFlags: pt.riskFlags,
        pricingContext: pt.pricingContext,
      }))
    )

    // Create Stripe customer in the background — non-fatal if it fails
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = getStripe()
        const customer = await stripe.customers.create({
          name,
          metadata: { clerkOrgId, agencyId: agency.id },
        })
        await db
          .update(agencies)
          .set({ stripeCustomerId: customer.id })
          .where(eq(agencies.id, agency.id))
      } catch (err) {
        console.error('[clerk-webhook] Stripe customer creation failed:', err)
      }
    }
  }

  return NextResponse.json({ received: true })
}
