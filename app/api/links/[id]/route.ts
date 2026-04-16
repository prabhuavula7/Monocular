import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agencies, intakeLinks } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const UpdateLinkSchema = z.object({
  clientName:    z.string().optional(),
  clientEmail:   z.string().email().optional().nullable(),
  projectTypeId: z.string().uuid().optional().nullable(),
  isDeprecated:  z.boolean().optional(),
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

  const [updated] = await db
    .update(intakeLinks)
    .set({
      ...(parsed.data.clientName    !== undefined && { clientName:    parsed.data.clientName }),
      ...(parsed.data.clientEmail   !== undefined && { clientEmail:   parsed.data.clientEmail }),
      ...(parsed.data.projectTypeId !== undefined && { projectTypeId: parsed.data.projectTypeId }),
      ...(parsed.data.isDeprecated  !== undefined && { isDeprecated:  parsed.data.isDeprecated }),
    })
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
