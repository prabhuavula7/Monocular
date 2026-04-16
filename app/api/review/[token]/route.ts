import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agencies, intakeLinks, scopes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const [scope] = await db
    .select()
    .from(scopes)
    .where(eq(scopes.reviewToken, token))
    .limit(1)

  if (!scope || !scope.generatedScope) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const [agency] = await db
    .select({ name: agencies.name })
    .from(agencies)
    .where(eq(agencies.id, scope.agencyId))
    .limit(1)

  // Resolve intake link token for "request changes" redirect
  let intakeLinkToken: string | null = null
  if (scope.intakeLinkId) {
    const [link] = await db
      .select({ token: intakeLinks.token, isDeprecated: intakeLinks.isDeprecated })
      .from(intakeLinks)
      .where(eq(intakeLinks.id, scope.intakeLinkId))
      .limit(1)
    if (link && !link.isDeprecated) intakeLinkToken = link.token
  }

  return NextResponse.json({
    scope: {
      id: scope.id,
      name: scope.name,
      clientName: scope.clientName,
      status: scope.status,
      generatedScope: scope.generatedScope,
      createdAt: scope.createdAt,
    },
    agencyName: agency?.name ?? 'Your agency',
    intakeLinkToken,
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { action, feedback } = await req.json()

  const [scope] = await db
    .select({ id: scopes.id, status: scopes.status })
    .from(scopes)
    .where(eq(scopes.reviewToken, token))
    .limit(1)

  if (!scope) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (action === 'approve') {
    await db
      .update(scopes)
      .set({ status: 'won', approvedAt: new Date(), updatedAt: new Date() })
      .where(eq(scopes.id, scope.id))
    return NextResponse.json({ ok: true, action: 'approved' })
  }

  if (action === 'request_changes') {
    const updates: Record<string, unknown> = { status: 'in_review', updatedAt: new Date() }
    if (feedback?.trim()) updates.clientFeedback = feedback.trim()
    await db.update(scopes).set(updates).where(eq(scopes.id, scope.id))

    // Return the intake link token so the client can be redirected
    let intakeLinkToken: string | null = null
    const [full] = await db
      .select({ intakeLinkId: scopes.intakeLinkId })
      .from(scopes)
      .where(eq(scopes.id, scope.id))
      .limit(1)

    if (full?.intakeLinkId) {
      const [link] = await db
        .select({ token: intakeLinks.token, isDeprecated: intakeLinks.isDeprecated })
        .from(intakeLinks)
        .where(eq(intakeLinks.id, full.intakeLinkId))
        .limit(1)
      if (link && !link.isDeprecated) intakeLinkToken = link.token
    }

    return NextResponse.json({ ok: true, action: 'request_changes', intakeLinkToken })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
