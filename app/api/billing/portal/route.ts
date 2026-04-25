import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agencies } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getStripe } from '@/lib/stripe'

export async function POST() {
  const { orgId } = await auth()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [agency] = await db
    .select({ stripeCustomerId: agencies.stripeCustomerId })
    .from(agencies)
    .where(eq(agencies.clerkOrgId, orgId))
    .limit(1)

  if (!agency?.stripeCustomerId) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 404 })
  }

  const stripe = getStripe()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const session = await stripe.billingPortal.sessions.create({
    customer: agency.stripeCustomerId,
    return_url: `${appUrl}/account`,
  })

  return NextResponse.json({ url: session.url })
}
