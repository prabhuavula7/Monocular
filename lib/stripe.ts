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
    monthlyAmount: 4900,
    annualAmount: 49000,
    scopeLimit: 40,
    description: 'Freelancers & independents',
  },
  studio: {
    name: 'Studio',
    monthlyPriceId: process.env.STRIPE_PRICE_STUDIO ?? '',
    annualPriceId: process.env.STRIPE_PRICE_STUDIO_ANNUAL ?? '',
    monthlyAmount: 9900,
    annualAmount: 99000,
    scopeLimit: 150,
    description: 'Small agencies & studios',
  },
  agency: {
    name: 'Agency',
    monthlyPriceId: process.env.STRIPE_PRICE_AGENCY ?? '',
    annualPriceId: process.env.STRIPE_PRICE_AGENCY_ANNUAL ?? '',
    monthlyAmount: 17900,
    annualAmount: 179000,
    scopeLimit: Infinity,
    description: 'Full-service firms',
  },
} as const

export type PlanKey = keyof typeof PLANS
