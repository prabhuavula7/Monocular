import { db } from '@/lib/db'
import { scopes } from '@/lib/db/schema'
import { and, eq, gte, count } from 'drizzle-orm'
import { getStripe, PLANS, type PlanKey } from '@/lib/stripe'

// Trial isn't a paid PLANS entry — cap it separately, same spirit as SEAT_LIMITS.trial.
const TRIAL_SCOPE_LIMIT = 5

export function getScopeLimit(plan: string): number {
  if (plan === 'trial') return TRIAL_SCOPE_LIMIT
  return PLANS[plan as PlanKey]?.scopeLimit ?? 0
}

export interface ScopeUsage {
  used: number
  limit: number
  remaining: number
  periodStart: Date
}

// Best-effort billing-period start: the Stripe subscription's current period
// for paying plans, else calendar month (trial has no Stripe subscription).
async function getPeriodStart(agency: {
  stripeSubscriptionId: string | null
}): Promise<Date> {
  if (agency.stripeSubscriptionId) {
    try {
      const stripe = getStripe()
      const sub = await stripe.subscriptions.retrieve(agency.stripeSubscriptionId)
      const periodStart = sub.items.data[0]?.current_period_start
      if (periodStart) return new Date(periodStart * 1000)
    } catch {
      // Stripe unreachable or subscription gone — fall through to calendar month
    }
  }
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

export async function getScopeUsage(agency: {
  id: string
  plan: string | null
  stripeSubscriptionId: string | null
}): Promise<ScopeUsage> {
  const plan = agency.plan ?? 'trial'
  const limit = getScopeLimit(plan)
  const periodStart = await getPeriodStart(agency)

  const [row] = await db
    .select({ value: count() })
    .from(scopes)
    .where(and(eq(scopes.agencyId, agency.id), gte(scopes.createdAt, periodStart)))

  const used = Number(row?.value ?? 0)
  return { used, limit, remaining: Math.max(limit - used, 0), periodStart }
}

export function isOverScopeLimit(usage: ScopeUsage): boolean {
  return Number.isFinite(usage.limit) && usage.used >= usage.limit
}
