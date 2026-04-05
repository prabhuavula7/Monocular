import { createClient } from '@supabase/supabase-js'

export const SCOPE_PDFS_BUCKET = 'scope-pdfs'

// Lazy singleton — avoids crashing at build time when env vars aren't present.
// Call getSupabaseAdmin() inside route handlers only (server-side, at request time).
let _client: ReturnType<typeof createClient> | null = null

export function getSupabaseAdmin() {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
    // Vercel Supabase integration sets SUPABASE_SERVICE_ROLE_KEY automatically
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Supabase URL and service role key are required')
    _client = createClient(url, key)
  }
  return _client
}
