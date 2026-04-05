import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agencies, projectTypes } from '@/lib/db/schema'
import { DEFAULT_PROJECT_TYPES } from '@/lib/defaults'

export async function POST(req: Request) {
  const body = await req.text()
  const headersList = await headers()

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!)

  let event: { type: string; data: { id: string; name: string } }
  try {
    event = wh.verify(body, {
      'svix-id': headersList.get('svix-id')!,
      'svix-timestamp': headersList.get('svix-timestamp')!,
      'svix-signature': headersList.get('svix-signature')!,
    }) as typeof event
  } catch {
    return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 })
  }

  if (event.type === 'organization.created') {
    const { id: clerkOrgId, name } = event.data

    const [agency] = await db
      .insert(agencies)
      .values({ clerkOrgId, name })
      .returning()

    await db.insert(projectTypes).values(
      DEFAULT_PROJECT_TYPES.map((pt) => ({
        agencyId: agency.id,
        name: pt.name,
        description: pt.description,
        extractionSchema: pt.extractionSchema,
        milestonePattern: pt.milestonePattern,
        riskFlags: pt.riskFlags,
        pricingContext: pt.pricingContext,
      }))
    )
  }

  return NextResponse.json({ received: true })
}
