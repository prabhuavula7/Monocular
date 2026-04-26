import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agencies } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const PatchAgencySchema = z.object({
  name:                z.string().min(1).max(80).optional(),
  tonePreference:      z.string().optional(),
  rateMin:             z.number().optional(),
  rateMax:             z.number().optional(),
  rateCurrency:        z.string().optional(),
  standardAssumptions: z.array(z.string()).optional(),
  customRiskFlags:     z.array(z.string()).optional(),
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
  const { orgId, orgRole } = await auth()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (orgRole !== 'org:admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = PatchAgencySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Sync name to Clerk org if provided
  if (parsed.data.name) {
    try {
      const clerk = await clerkClient()
      await clerk.organizations.updateOrganization(orgId, { name: parsed.data.name })
    } catch (err) {
      console.error('[settings] failed to sync name to Clerk', err)
      // Non-fatal — DB update still proceeds
    }
  }

  const [updated] = await db
    .update(agencies)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(agencies.clerkOrgId, orgId))
    .returning()

  return NextResponse.json(updated)
}
