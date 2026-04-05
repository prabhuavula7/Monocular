import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agencies, projectTypes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const SchemaFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(['string', 'string[]', 'boolean', 'number', 'object']),
  required: z.boolean(),
  probeHint: z.string().optional(),
})

const PatchProjectTypeSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  extractionSchema: z.array(SchemaFieldSchema).optional(),
  milestonePattern: z.array(z.string()).optional(),
  riskFlags: z.array(z.string()).optional(),
  pricingContext: z.string().optional(),
  isActive: z.boolean().optional(),
})

async function getAgencyForOrg(orgId: string) {
  const [agency] = await db
    .select()
    .from(agencies)
    .where(eq(agencies.clerkOrgId, orgId))
    .limit(1)
  return agency
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await auth()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const agency = await getAgencyForOrg(orgId)
  if (!agency) return NextResponse.json({ error: 'Agency not found' }, { status: 404 })

  const [pt] = await db
    .select({ id: projectTypes.id, agencyId: projectTypes.agencyId })
    .from(projectTypes)
    .where(eq(projectTypes.id, id))
    .limit(1)

  if (!pt || pt.agencyId !== agency.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const parsed = PatchProjectTypeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const [updated] = await db
    .update(projectTypes)
    .set(parsed.data)
    .where(eq(projectTypes.id, id))
    .returning()

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await auth()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const agency = await getAgencyForOrg(orgId)
  if (!agency) return NextResponse.json({ error: 'Agency not found' }, { status: 404 })

  const [pt] = await db
    .select({ id: projectTypes.id, agencyId: projectTypes.agencyId })
    .from(projectTypes)
    .where(eq(projectTypes.id, id))
    .limit(1)

  if (!pt || pt.agencyId !== agency.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await db.delete(projectTypes).where(eq(projectTypes.id, id))

  return NextResponse.json({ deleted: true })
}
