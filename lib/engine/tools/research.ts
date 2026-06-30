import { z } from 'zod'
import { registerTool } from './registry'

const BLOCKED_HOSTS = new Set([
  '169.254.169.254',       // AWS/GCP/Azure IMDS
  'metadata.google.internal',
  '100.100.100.200',       // Alibaba Cloud metadata
  'fd00:ec2::254',         // AWS IPv6 metadata
])

const PRIVATE_IP_RE = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
]

function isSafeUrl(raw: string): { safe: boolean; reason?: string } {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return { safe: false, reason: 'Invalid URL' }
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { safe: false, reason: 'Only HTTP/HTTPS allowed' }
  }

  const host = parsed.hostname.toLowerCase()

  if (BLOCKED_HOSTS.has(host)) return { safe: false, reason: 'Blocked host (metadata endpoint)' }
  if (PRIVATE_IP_RE.some((r) => r.test(host))) return { safe: false, reason: 'Private IP range blocked' }
  if (host === 'localhost') return { safe: false, reason: 'localhost blocked' }

  return { safe: true }
}

registerTool({
  name: 'research',
  description:
    'Fetch and summarize content from a user-provided URL to inform scoping decisions. ' +
    'Use this to read a client\'s existing website, a product brief, or technical documentation ' +
    'they\'ve shared. Only works on URLs explicitly provided by the client.',
  inputSchema: z.object({
    url: z.string().url(),
    purpose: z.string(),
  }),
  inputJsonSchema: {
    type: 'object' as const,
    properties: {
      url: { type: 'string', description: 'The URL to fetch (must be HTTP/HTTPS)' },
      purpose: { type: 'string', description: 'Why you need this content for scoping' },
    },
    required: ['url', 'purpose'],
  },
  outputSchema: z.object({
    success: z.boolean(),
    content: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async (input) => {
    const check = isSafeUrl(input.url)
    if (!check.safe) {
      return { success: false, error: `URL blocked: ${check.reason}` }
    }

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10_000)

      const res = await fetch(input.url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Monocular-Research-Agent/1.0' },
        redirect: 'follow',
      })
      clearTimeout(timeout)

      // Re-validate after redirect
      const finalUrl = res.url
      if (finalUrl !== input.url) {
        const redirectCheck = isSafeUrl(finalUrl)
        if (!redirectCheck.safe) {
          return { success: false, error: `Redirect to blocked URL: ${redirectCheck.reason}` }
        }
      }

      if (!res.ok) {
        return { success: false, error: `HTTP ${res.status}` }
      }

      const contentType = res.headers.get('content-type') ?? ''
      if (!contentType.includes('text/') && !contentType.includes('application/json')) {
        return { success: false, error: 'Non-text content type — skipped' }
      }

      // Cap at 50KB
      const text = (await res.text()).slice(0, 50_000)

      // Strip HTML tags for a rough plain-text extraction
      const plain = text
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 8_000)

      return { success: true, content: plain }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return { success: false, error: msg.includes('abort') ? 'Request timed out' : msg }
    }
  },
})
