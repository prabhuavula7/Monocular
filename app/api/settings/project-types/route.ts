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

const CreateProjectTypeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  extractionSchema: z.array(SchemaFieldSchema),
  milestonePattern: z.array(z.string()),
  riskFlags: z.array(z.string()).optional(),
  pricingContext: z.string().optional(),
})

export async function GET() {
  const { orgId } = await auth()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [agency] = await db
    .select()
    .from(agencies)
    .where(eq(agencies.clerkOrgId, orgId))
    .limit(1)

  if (!agency) return NextResponse.json({ error: 'Agency not found' }, { status: 404 })

  const types = await db
    .select()
    .from(projectTypes)
    .where(eq(projectTypes.agencyId, agency.id))

  return NextResponse.json(types)
}

export async function POST(req: NextRequest) {
  const { orgId } = await auth()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [agency] = await db
    .select()
    .from(agencies)
    .where(eq(agencies.clerkOrgId, orgId))
    .limit(1)

  if (!agency) return NextResponse.json({ error: 'Agency not found' }, { status: 404 })

  const body = await req.json()
  const parsed = CreateProjectTypeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const [pt] = await db
    .insert(projectTypes)
    .values({
      agencyId: agency.id,
      ...parsed.data,
      riskFlags: parsed.data.riskFlags ?? [],
    })
    .returning()

  return NextResponse.json(pt)
}
