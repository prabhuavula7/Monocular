import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agencies, scopes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const PatchScopeSchema = z.object({
  status: z.enum(['draft', 'in_review', 'sent', 'won', 'lost']).optional(),
  agencyNotes: z.string().optional(),
  generatedScope: z.record(z.string(), z.unknown()).optional(),
  wonAt: z.string().optional(),
  lostAt: z.string().optional(),
  lostReason: z.string().optional(),
  editMagnitude: z.enum(['none', 'minor', 'moderate', 'substantial']).optional(),
  priceEstimateApproved: z.number().optional(),
  actualClosePrice: z.number().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await auth()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [agency] = await db
    .select()
    .from(agencies)
    .where(eq(agencies.clerkOrgId, orgId))
    .limit(1)

  if (!agency) return NextResponse.json({ error: 'Agency not found' }, { status: 404 })

  const [scope] = await db
    .select()
    .from(scopes)
    .where(eq(scopes.id, id))
    .limit(1)

  if (!scope || scope.agencyId !== agency.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(scope)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await auth()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [agency] = await db
    .select()
    .from(agencies)
    .where(eq(agencies.clerkOrgId, orgId))
    .limit(1)

  if (!agency) return NextResponse.json({ error: 'Agency not found' }, { status: 404 })

  const [scope] = await db
    .select({ id: scopes.id, agencyId: scopes.agencyId })
    .from(scopes)
    .where(eq(scopes.id, id))
    .limit(1)

  if (!scope || scope.agencyId !== agency.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const parsed = PatchScopeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  const d = parsed.data

  if (d.status !== undefined) {
    updates.status = d.status
    if (d.status === 'won') updates.wonAt = new Date()
    if (d.status === 'lost') updates.lostAt = new Date()
  }
  if (d.agencyNotes !== undefined) updates.agencyNotes = d.agencyNotes
  if (d.generatedScope !== undefined) updates.generatedScope = d.generatedScope
  if (d.lostReason !== undefined) updates.lostReason = d.lostReason
  if (d.editMagnitude !== undefined) updates.editMagnitude = d.editMagnitude
  if (d.priceEstimateApproved !== undefined) updates.priceEstimateApproved = d.priceEstimateApproved
  if (d.actualClosePrice !== undefined) updates.actualClosePrice = d.actualClosePrice

  const [updated] = await db
    .update(scopes)
    .set(updates)
    .where(eq(scopes.id, id))
    .returning()

  return NextResponse.json(updated)
}
