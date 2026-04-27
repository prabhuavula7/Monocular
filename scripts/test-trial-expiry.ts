/**
 * Safely test trial expiry without losing access.
 *
 * Usage:
 *   npx tsx scripts/test-trial-expiry.ts           # force trial-expired state
 *   npx tsx scripts/test-trial-expiry.ts --reset   # restore original plan state
 *   npx tsx scripts/test-trial-expiry.ts --org <clerkOrgId>  # target a specific org
 *
 * Test flow:
 *   1. Run with no flags → forces plan=trial + trialEndsAt=yesterday
 *   2. Open browser → navigate to /dashboard → should redirect to /pricing?expired=1
 *   3. Run with --reset → restores original plan, planStatus, stripeSubscriptionId, trialEndsAt
 */

import postgres from 'postgres'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(__dirname, '../.env.local') })

const isReset = process.argv.includes('--reset')
const orgFlag = process.argv.indexOf('--org')
const targetOrgId = orgFlag !== -1 ? process.argv[orgFlag + 1] : null

// Snapshot file — persists original state between expire and reset runs
const SNAPSHOT_FILE = resolve(__dirname, '.trial-test-snapshot.json')

async function run() {
  const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL
  if (!connectionString) throw new Error('DATABASE_URL or POSTGRES_URL is not set in .env.local')

  const client = postgres(connectionString, { prepare: false, max: 1 })

  const whereClause = targetOrgId
    ? client`WHERE clerk_org_id = ${targetOrgId}`
    : client`LIMIT 1`

  const rows = await client`
    SELECT id, name, clerk_org_id, plan, plan_status, trial_ends_at, stripe_subscription_id
    FROM agencies
    ${whereClause}
  `

  if (!rows.length) {
    console.error(targetOrgId ? `No agency found for org: ${targetOrgId}` : 'No agencies found in DB.')
    await client.end()
    process.exit(1)
  }

  const agency = rows[0]

  if (isReset) {
    // Restore from snapshot
    const fs = await import('fs')
    if (!fs.existsSync(SNAPSHOT_FILE)) {
      console.error('No snapshot found. Run without --reset first to create one.')
      await client.end()
      process.exit(1)
    }

    const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf-8'))

    await client`
      UPDATE agencies SET
        plan               = ${snapshot.plan},
        plan_status        = ${snapshot.plan_status},
        trial_ends_at      = ${snapshot.trial_ends_at},
        stripe_subscription_id = ${snapshot.stripe_subscription_id},
        updated_at         = NOW()
      WHERE id = ${snapshot.id}
    `

    fs.unlinkSync(SNAPSHOT_FILE)
    console.log(`✅ Restored "${agency.name}" to original state:`)
    console.log(`   plan: ${snapshot.plan} | status: ${snapshot.plan_status}`)
    console.log(`   Navigate to /dashboard — access should be back.`)
  } else {
    // Save snapshot then force expired trial state
    const fs = await import('fs')
    fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify({
      id:                    agency.id,
      plan:                  agency.plan,
      plan_status:           agency.plan_status,
      trial_ends_at:         agency.trial_ends_at,
      stripe_subscription_id: agency.stripe_subscription_id,
    }))

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

    await client`
      UPDATE agencies SET
        plan               = 'trial',
        plan_status        = 'trialing',
        trial_ends_at      = ${yesterday},
        stripe_subscription_id = NULL,
        updated_at         = NOW()
      WHERE id = ${agency.id}
    `

    console.log(`⏰ Trial EXPIRED for "${agency.name}" (${agency.clerk_org_id})`)
    console.log(`   Original state saved to .trial-test-snapshot.json`)
    console.log(`   → Open /dashboard in the browser — should redirect to /pricing?expired=1`)
    console.log(`   → When done: npx tsx scripts/test-trial-expiry.ts --reset`)
  }

  await client.end()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
