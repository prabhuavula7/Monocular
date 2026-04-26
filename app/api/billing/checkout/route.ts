import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agencies } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getStripe, PLANS, type PlanKey } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const { orgId, orgRole } = await auth()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (orgRole !== 'org:admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { plan, interval = 'monthly' } = await req.json() as { plan: PlanKey; interval?: 'monthly' | 'annual' }

  if (!PLANS[plan]) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const [agency] = await db
    .select()
    .from(agencies)
    .where(eq(agencies.clerkOrgId, orgId))
    .limit(1)

  if (!agency) return NextResponse.json({ error: 'Agency not found' }, { status: 404 })

  const stripe = getStripe()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const priceId = interval === 'annual' ? PLANS[plan].annualPriceId : PLANS[plan].monthlyPriceId

  if (!priceId) {
    return NextResponse.json({ error: 'Price not configured' }, { status: 500 })
  }

  // Reuse existing Stripe customer or create one
  let customerId = agency.stripeCustomerId ?? undefined

  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { clerkOrgId: orgId, agencyId: agency.id },
      name: agency.name,
    })
    customerId = customer.id
    await db.update(agencies).set({ stripeCustomerId: customerId }).where(eq(agencies.id, agency.id))
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/account?billing=success`,
    cancel_url: `${appUrl}/pricing`,
    allow_promotion_codes: true,
    metadata: { agencyId: agency.id, plan },
  })

  return NextResponse.json({ url: session.url })
}
