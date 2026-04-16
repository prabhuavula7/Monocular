import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agencies, intakeLinks, projectTypes } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'

const LinkContextSchema = z.object({
  projectTypeId:       z.string().uuid().optional().nullable(),
  // Client identity
  label:               z.string().max(200).optional().nullable(),
  clientEmail:         z.string().email().optional().nullable(),
  clientName:          z.string().max(200).optional().nullable(),
  clientCompany:       z.string().max(200).optional().nullable(),
  clientWebsite:       z.string().max(500).optional().nullable(),
  clientIndustry:      z.string().max(200).optional().nullable(),
  // Prompt context
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
      label:           intakeLinks.label,
      clientName:      intakeLinks.clientName,
      clientEmail:     intakeLinks.clientEmail,
      clientCompany:   intakeLinks.clientCompany,
      expiresAt:       intakeLinks.expiresAt,
      usedAt:          intakeLinks.usedAt,
      isDeprecated:    intakeLinks.isDeprecated,
      createdAt:       intakeLinks.createdAt,
      iterationCount:  intakeLinks.iterationCount,
      latestScopeId:   intakeLinks.latestScopeId,
      engagementType:  intakeLinks.engagementType,
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
  const parsed = LinkContextSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })

  const { data } = parsed
  const token = nanoid(32)

  const [link] = await db
    .insert(intakeLinks)
    .values({
      agencyId:           agency.id,
      projectTypeId:      data.projectTypeId ?? null,
      token,
      label:              data.label ?? null,
      clientEmail:        data.clientEmail ?? null,
      clientName:         data.clientName ?? null,
      clientCompany:      data.clientCompany ?? null,
      clientWebsite:      data.clientWebsite ?? null,
      clientIndustry:     data.clientIndustry ?? null,
      primaryObjective:   data.primaryObjective ?? null,
      successDefinition:  data.successDefinition ?? null,
      budgetContext:      data.budgetContext ?? null,
      timelineContext:    data.timelineContext ?? null,
      stakeholderContext: data.stakeholderContext ?? null,
      technicalContext:   data.technicalContext ?? null,
      mustCapture:        data.mustCapture ?? null,
      excludedTopics:     data.excludedTopics ?? null,
      agencyInstructions: data.agencyInstructions ?? null,
      engagementType:     data.engagementType ?? 'general',
      iterationCount:     0,
    })
    .returning()

  const intakeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/intake/${token}`
  return NextResponse.json({ token, url: intakeUrl, link })
}
