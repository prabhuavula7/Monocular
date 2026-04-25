/**
 * Run once to create Stripe products + prices in test mode.
 * Usage: npx tsx scripts/stripe-setup.ts
 * Paste the printed price IDs into .env.local
 */
import Stripe from 'stripe'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(__dirname, '../.env.local') })

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })

const TIERS = [
  { key: 'starter', name: 'Monocular Starter', amount: 4900, description: 'Solo consultants — up to 50 scopes/mo' },
  { key: 'firm',    name: 'Monocular Firm',    amount: 9900, description: 'Agencies & studios — up to 200 scopes/mo' },
  { key: 'scale',   name: 'Monocular Scale',   amount: 24900, description: 'High-volume teams — unlimited scopes' },
]

async function run() {
  console.log('Creating Stripe products and prices...\n')

  for (const tier of TIERS) {
    const product = await stripe.products.create({
      name: tier.name,
      description: tier.description,
      metadata: { plan: tier.key },
    })

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: tier.amount,
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { plan: tier.key },
    })

    console.log(`STRIPE_PRICE_${tier.key.toUpperCase()}=${price.id}`)
  }

  console.log('\nPaste the lines above into .env.local and Vercel env vars.')
}

run().catch(console.error)
