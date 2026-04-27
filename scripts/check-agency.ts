import postgres from 'postgres'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(__dirname, '../.env.local') })

async function run() {
  const client = postgres(process.env.DATABASE_URL ?? process.env.POSTGRES_URL!, { prepare: false, max: 1 })
  const rows = await client`
    SELECT id, name, plan, plan_status, trial_ends_at, stripe_customer_id, stripe_subscription_id
    FROM agencies
  `
  console.log(JSON.stringify(rows, null, 2))
  await client.end()
}

run().catch(console.error)
