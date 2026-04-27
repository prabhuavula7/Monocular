/**
 * Creates new Stripe prices for the updated plan pricing.
 * Run AFTER confirming the new prices with the team.
 *
 * Usage: npx tsx scripts/update-stripe-prices.ts
 *
 * What it does:
 *   - Creates new monthly + annual prices for Studio ($109) and Agency ($219)
 *   - Solo prices are unchanged ($49/mo) — no new prices needed
 *   - Archives the old Studio and Agency prices so they can't be used for new checkouts
 *   - Prints the new price IDs to paste into .env.local and Vercel env vars
 *
 * After running:
 *   1. Paste the new STRIPE_PRICE_STUDIO / STRIPE_PRICE_STUDIO_ANNUAL /
 *      STRIPE_PRICE_AGENCY / STRIPE_PRICE_AGENCY_ANNUAL into .env.local
 *   2. Update the same vars in Vercel (Settings → Environment Variables)
 *   3. Existing subscribers on old prices continue billing at the old rate
 *      until you migrate them (via admin console plan switch, to be built)
 */

import Stripe from 'stripe'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(__dirname, '../.env.local') })

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })

const NEW_PRICES = [
  {
    planKey: 'STUDIO',
    productName: 'Monocular Studio',
    monthly: { amount: 10900, envVar: 'STRIPE_PRICE_STUDIO' },
    annual:  { amount: 109000, envVar: 'STRIPE_PRICE_STUDIO_ANNUAL' },
    oldMonthlyPriceId: process.env.STRIPE_PRICE_STUDIO,
    oldAnnualPriceId:  process.env.STRIPE_PRICE_STUDIO_ANNUAL,
  },
  {
    planKey: 'AGENCY',
    productName: 'Monocular Agency',
    monthly: { amount: 21900, envVar: 'STRIPE_PRICE_AGENCY' },
    annual:  { amount: 219000, envVar: 'STRIPE_PRICE_AGENCY_ANNUAL' },
    oldMonthlyPriceId: process.env.STRIPE_PRICE_AGENCY,
    oldAnnualPriceId:  process.env.STRIPE_PRICE_AGENCY_ANNUAL,
  },
]

async function run() {
  console.log('Creating new Stripe prices...\n')

  const newEnvLines: string[] = []

  for (const tier of NEW_PRICES) {
    // Find or create the product by name
    const products = await stripe.products.list({ active: true })
    let product = products.data.find(p => p.name === tier.productName)
    if (!product) {
      product = await stripe.products.create({
        name: tier.productName,
        metadata: { plan: tier.planKey.toLowerCase() },
      })
      console.log(`Created product: ${product.name} (${product.id})`)
    } else {
      console.log(`Using existing product: ${product.name} (${product.id})`)
    }

    // Create monthly price
    const monthly = await stripe.prices.create({
      product: product.id,
      unit_amount: tier.monthly.amount,
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { plan: tier.planKey.toLowerCase() },
    })
    newEnvLines.push(`${tier.monthly.envVar}=${monthly.id}`)

    // Create annual price
    const annual = await stripe.prices.create({
      product: product.id,
      unit_amount: tier.annual.amount,
      currency: 'usd',
      recurring: { interval: 'year' },
      metadata: { plan: tier.planKey.toLowerCase() },
    })
    newEnvLines.push(`${tier.annual.envVar}=${annual.id}`)

    // Archive old prices so they can't be used for new checkouts
    if (tier.oldMonthlyPriceId) {
      await stripe.prices.update(tier.oldMonthlyPriceId, { active: false })
      console.log(`  Archived old monthly price: ${tier.oldMonthlyPriceId}`)
    }
    if (tier.oldAnnualPriceId) {
      await stripe.prices.update(tier.oldAnnualPriceId, { active: false })
      console.log(`  Archived old annual price: ${tier.oldAnnualPriceId}`)
    }

    console.log(`  New monthly (${tier.planKey}): $${tier.monthly.amount / 100}/mo → ${monthly.id}`)
    console.log(`  New annual  (${tier.planKey}): $${tier.annual.amount / 100}/yr → ${annual.id}`)
    console.log()
  }

  console.log('─'.repeat(60))
  console.log('Paste these into .env.local and Vercel env vars:\n')
  newEnvLines.forEach(line => console.log(line))
  console.log('\nSolo prices are unchanged — no action needed.')
  console.log('Existing Studio/Agency subscribers keep their old billing rate until manually migrated.')
}

run().catch(console.error)
