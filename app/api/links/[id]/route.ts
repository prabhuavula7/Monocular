import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agencies, intakeLinks } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const UpdateLinkSchema = z.object({
  label:               z.string().max(200).optional().nullable(),
  clientName:          z.string().max(200).optional().nullable(),
  clientEmail:         z.string().email().optional().nullable(),
  clientCompany:       z.string().max(200).optional().nullable(),
  clientWebsite:       z.string().max(500).optional().nullable(),
  clientIndustry:      z.string().max(200).optional().nullable(),
  projectTypeId:       z.string().uuid().optional().nullable(),
  primaryObjective:    z.string().max(1000).optional().nullable(),
  successDefinition:   z.string().max(1000).optional().nullable(),
  budgetContext:       z.string().max(500).optional().nullable(),
  timelineContext:     z.string().max(500).optional().nullable(),
  stakeholderContext:  z.string().max(500).optional().nullable(),
  technicalContext:    z.string().max(1000).optional().nullable(),
  mustCapture:         z.string().max(1000).optional().nullable(),
  excludedTopics:      z.string().max(1000).optional().nullable(),
  agencyInstructions:  z.string().max(1000).optional().nullable(),
  engagementType:      z.enum(['general', 'template']).optional(),
  isDeprecated:        z.boolean().optional(),
})

async function getAgency(orgId: string) {
  const [agency] = await db
    .select()
    .from(agencies)
    .where(eq(agencies.clerkOrgId, orgId))
    .limit(1)
  return agency
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await auth()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const agency = await getAgency(orgId)
  if (!agency) return NextResponse.json({ error: 'Agency not found' }, { status: 404 })

  const { id } = await params
  const body = await req.json()
  const parsed = UpdateLinkSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const d = parsed.data
  // Build update object — only include fields that were explicitly provided
  const updates: Record<string, unknown> = {}
  const fields = [
    'label', 'clientName', 'clientEmail', 'clientCompany', 'clientWebsite', 'clientIndustry',
    'projectTypeId', 'primaryObjective', 'successDefinition', 'budgetContext', 'timelineContext',
    'stakeholderContext', 'technicalContext', 'mustCapture', 'excludedTopics', 'agencyInstructions',
    'engagementType', 'isDeprecated',
  ] as const
  for (const field of fields) {
    if (d[field] !== undefined) updates[field] = d[field]
  }

  const [updated] = await db
    .update(intakeLinks)
    .set(updates)
    .where(and(eq(intakeLinks.id, id), eq(intakeLinks.agencyId, agency.id)))
    .returning()

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await auth()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const agency = await getAgency(orgId)
  if (!agency) return NextResponse.json({ error: 'Agency not found' }, { status: 404 })

  const { id } = await params
  await db
    .delete(intakeLinks)
    .where(and(eq(intakeLinks.id, id), eq(intakeLinks.agencyId, agency.id)))

  return NextResponse.json({ ok: true })
}
