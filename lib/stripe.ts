import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set')
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' })
  }
  return _stripe
}

export const PLANS = {
  solo: {
    name: 'Solo',
    monthlyPriceId: process.env.STRIPE_PRICE_SOLO ?? '',
    annualPriceId: process.env.STRIPE_PRICE_SOLO_ANNUAL ?? '',
    monthlyAmount: 4900,    // $49/mo
    annualAmount: 49000,    // $490/yr
    scopeLimit: 20,
    seatLimit: 1,
    description: 'Freelancers & independents',
    features: {
      reviewLinks: false,
      emailDelivery: false,
      intakeLinkCustomization: false,
      prioritySupport: false,
    },
  },
  studio: {
    name: 'Studio',
    monthlyPriceId: process.env.STRIPE_PRICE_STUDIO ?? '',
    annualPriceId: process.env.STRIPE_PRICE_STUDIO_ANNUAL ?? '',
    monthlyAmount: 10900,   // $109/mo
    annualAmount: 109000,   // $1,090/yr
    scopeLimit: 75,
    seatLimit: 3,
    description: 'Small agencies & studios',
    features: {
      reviewLinks: true,
      emailDelivery: true,
      intakeLinkCustomization: true,
      prioritySupport: false,
    },
  },
  agency: {
    name: 'Agency',
    monthlyPriceId: process.env.STRIPE_PRICE_AGENCY ?? '',
    annualPriceId: process.env.STRIPE_PRICE_AGENCY_ANNUAL ?? '',
    monthlyAmount: 21900,   // $219/mo
    annualAmount: 219000,   // $2,190/yr
    scopeLimit: Infinity,
    seatLimit: Infinity,
    description: 'Full-service firms',
    features: {
      reviewLinks: true,
      emailDelivery: true,
      intakeLinkCustomization: true,
      prioritySupport: true,
    },
  },
} as const

export type PlanKey = keyof typeof PLANS

// Seat limits by plan — safe to import in client components (no env var dependency)
export const SEAT_LIMITS: Record<string, number> = {
  trial:  3,
  solo:   1,
  studio: 3,
  agency: Infinity,
}

// Returns true if the plan has access to a given feature
export function planHasFeature(
  plan: string,
  feature: keyof (typeof PLANS)[PlanKey]['features']
): boolean {
  if (plan === 'trial') return false
  return PLANS[plan as PlanKey]?.features[feature] ?? false
}
