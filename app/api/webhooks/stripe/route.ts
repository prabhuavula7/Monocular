import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agencies } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getStripe, PLANS } from '@/lib/stripe'
import type Stripe from 'stripe'

export async function POST(req: Request) {
  const body = await req.text()
  const headersList = await headers()
  const sig = headersList.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  const stripe = getStripe()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const agencyId = session.metadata?.agencyId
      const plan = session.metadata?.plan
      if (!agencyId || !plan) break

      const subscription = typeof session.subscription === 'string'
        ? await stripe.subscriptions.retrieve(session.subscription)
        : session.subscription

      await db.update(agencies).set({
        stripeSubscriptionId: subscription?.id ?? null,
        plan,
        planStatus: 'active',
        trialEndsAt: null,
        updatedAt: new Date(),
      }).where(eq(agencies.id, agencyId))
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

      const statusMap: Record<string, string> = {
        active: 'active',
        past_due: 'past_due',
        canceled: 'canceled',
        unpaid: 'past_due',
        trialing: 'trialing',
      }

      // Plan comes from subscription metadata (set via subscription_data.metadata at checkout time).
      // Fall back to PLANS price-ID lookup for subscriptions created outside of Checkout.
      const priceId = sub.items.data[0]?.price.id
      const planKey = (sub.metadata?.plan as string | undefined)
        ?? Object.entries(PLANS).find(
          ([, p]) => p.monthlyPriceId === priceId || p.annualPriceId === priceId
        )?.[0]

      const baseFields = {
        planStatus: statusMap[sub.status] ?? sub.status,
        stripeSubscriptionId: sub.id,
        updatedAt: new Date(),
      }

      if (planKey) {
        await db.update(agencies)
          .set({ ...baseFields, plan: planKey })
          .where(eq(agencies.stripeCustomerId, customerId))
      } else {
        await db.update(agencies)
          .set(baseFields)
          .where(eq(agencies.stripeCustomerId, customerId))
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

      await db.update(agencies).set({
        plan: 'trial',
        planStatus: 'canceled',
        stripeSubscriptionId: null,
        updatedAt: new Date(),
      }).where(eq(agencies.stripeCustomerId, customerId))
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
      if (!customerId) break

      await db.update(agencies).set({
        planStatus: 'past_due',
        updatedAt: new Date(),
      }).where(eq(agencies.stripeCustomerId, customerId))
      break
    }

    case 'invoice.payment_succeeded': {
      // Stripe retried a past_due invoice and it went through — restore active status.
      // customer.subscription.updated also fires in this case, but this is explicit insurance.
      const invoice = event.data.object as Stripe.Invoice
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
      if (!customerId) break
      // Only act on subscription invoices (not one-off invoices)
      if (!invoice.subscription) break

      await db.update(agencies).set({
        planStatus: 'active',
        updatedAt: new Date(),
      }).where(eq(agencies.stripeCustomerId, customerId))
      break
    }
  }

  return NextResponse.json({ received: true })
}
