import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agencies, intakeLinks, projectTypes } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'

const CreateLinkSchema = z.object({
  projectTypeId: z.string().uuid().optional(),
  clientEmail:   z.string().email().optional(),
  clientName:    z.string().optional(),
})

async function getAgency(orgId: string) {
  const [agency] = await db
    .select()
    .from(agencies)
    .where(eq(agencies.clerkOrgId, orgId))
    .limit(1)
  return agency
}

export async function GET() {
  const { orgId } = await auth()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const agency = await getAgency(orgId)
  if (!agency) return NextResponse.json({ error: 'Agency not found' }, { status: 404 })

  const links = await db
    .select({
      id:              intakeLinks.id,
      token:           intakeLinks.token,
      clientName:      intakeLinks.clientName,
      clientEmail:     intakeLinks.clientEmail,
      expiresAt:       intakeLinks.expiresAt,
      usedAt:          intakeLinks.usedAt,
      isDeprecated:    intakeLinks.isDeprecated,
      createdAt:       intakeLinks.createdAt,
      projectTypeId:   intakeLinks.projectTypeId,
      projectTypeName: projectTypes.name,
    })
    .from(intakeLinks)
    .leftJoin(projectTypes, eq(intakeLinks.projectTypeId, projectTypes.id))
    .where(eq(intakeLinks.agencyId, agency.id))
    .orderBy(desc(intakeLinks.createdAt))

  return NextResponse.json(links)
}

export async function POST(req: NextRequest) {
  const { orgId } = await auth()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const agency = await getAgency(orgId)
  if (!agency) return NextResponse.json({ error: 'Agency not found' }, { status: 404 })

  const body = await req.json()
  const parsed = CreateLinkSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const token = nanoid(32)
  const [link] = await db
    .insert(intakeLinks)
    .values({
      agencyId:      agency.id,
      projectTypeId: parsed.data.projectTypeId ?? null,
      token,
      clientEmail:   parsed.data.clientEmail ?? null,
      clientName:    parsed.data.clientName ?? null,
      // No expiresAt — links are permanent until deprecated by the agency
    })
    .returning()

  const intakeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/intake/${token}`
  return NextResponse.json({ token, url: intakeUrl, link })
}
