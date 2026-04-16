import { after } from 'next/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { intakeLinks, intakeSessions, scopes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { inngest } from '@/inngest/client'
import { runGenerateScope } from '@/lib/run-generate-scope'
import type { Message } from '@/types'

export async function POST(req: NextRequest) {
  const { token } = await req.json()

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }

  const [session] = await db
    .select()
    .from(intakeSessions)
    .where(eq(intakeSessions.token, token))
    .limit(1)

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const [link] = await db
    .select()
    .from(intakeLinks)
    .where(eq(intakeLinks.token, token))
    .limit(1)

  // Idempotency: if a scope already exists for this link, return it
  if (link?.usedAt) {
    const [existing] = await db
      .select({ id: scopes.id })
      .from(scopes)
      .where(eq(scopes.intakeLinkId, link.id))
      .limit(1)
    if (existing) {
      return NextResponse.json({ scopeId: existing.id })
    }
  }

  // Create a stub scope record — Inngest will fill in generatedScope asynchronously
  const [scope] = await db
    .insert(scopes)
    .values({
      agencyId: session.agencyId,
      intakeLinkId: link?.id,
      projectTypeId: session.projectTypeId ?? null,
      status: 'draft',
      clientName: link?.clientName,
      clientEmail: link?.clientEmail,
      transcript: session.messages as Message[],
      extractedData: session.extractedData,
    })
    .returning()

  // Mark link as used
  if (link) {
    await db
      .update(intakeLinks)
      .set({ usedAt: new Date() })
      .where(eq(intakeLinks.token, token))
  }

  // Delete session
  await db.delete(intakeSessions).where(eq(intakeSessions.token, token))

  // Schedule generation to run after response is sent.
  // after() is used so the client gets scopeId immediately without waiting for Claude.
  // Inngest is also fired as a backup if cloud keys are configured.
  after(async () => {
    try {
      await runGenerateScope(scope.id)
    } catch (err) {
      console.error('[generate-scope] inline generation failed', err)
    }
  })

  // Fire Inngest event if keys are present (production) — safe to fail silently in dev.
  if (process.env.INNGEST_EVENT_KEY) {
    inngest.send({ name: 'scope/generate', data: { scopeId: scope.id } }).catch(() => {})
  }

  return NextResponse.json({ scopeId: scope.id })
}
