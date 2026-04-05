import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agencies, intakeLinks } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'

const CreateLinkSchema = z.object({
  projectTypeId: z.string().uuid().optional(),
  clientEmail: z.string().email().optional(),
  clientName: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const { orgId } = await auth()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = CreateLinkSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const [agency] = await db
    .select()
    .from(agencies)
    .where(eq(agencies.clerkOrgId, orgId))
    .limit(1)

  if (!agency) {
    return NextResponse.json({ error: 'Agency not found' }, { status: 404 })
  }

  const token = nanoid(32)

  const [link] = await db
    .insert(intakeLinks)
    .values({
      agencyId: agency.id,
      projectTypeId: parsed.data.projectTypeId ?? null,
      token,
      clientEmail: parsed.data.clientEmail ?? null,
      clientName: parsed.data.clientName ?? null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    })
    .returning()

  const intakeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/intake/${token}`

  // TODO: Send email via Resend if clientEmail is provided
  // await sendIntakeLinkEmail(parsed.data.clientEmail, intakeUrl, agency.name)
  console.log('[intake link created]', intakeUrl)

  return NextResponse.json({ token, url: intakeUrl, link })
}
