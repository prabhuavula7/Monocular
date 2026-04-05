import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

// Lazy singleton — avoids crashing at build time when env vars aren't present.
// Local dev: DATABASE_URL (direct connection, port 5432)
// Vercel: POSTGRES_URL (transaction pooler, port 6543 — set automatically by Supabase integration)
// prepare: false is required for PgBouncer; harmless for direct connections.
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

function getDb() {
  if (!_db) {
    const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL
    if (!connectionString) throw new Error('DATABASE_URL or POSTGRES_URL is required')
    const client = postgres(connectionString, { prepare: false })
    _db = drizzle(client, { schema })
  }
  return _db
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    return (getDb() as any)[prop]
  },
})
