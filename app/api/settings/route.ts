import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agencies } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const PatchAgencySchema = z.object({
  tonePreference: z.string().optional(),
  rateMin: z.number().optional(),
  rateMax: z.number().optional(),
  rateCurrency: z.string().optional(),
  standardAssumptions: z.array(z.string()).optional(),
  customRiskFlags: z.array(z.string()).optional(),
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

  return NextResponse.json(agency)
}

export async function PATCH(req: NextRequest) {
  const { orgId } = await auth()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = PatchAgencySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const [updated] = await db
    .update(agencies)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(agencies.clerkOrgId, orgId))
    .returning()

  return NextResponse.json(updated)
}
