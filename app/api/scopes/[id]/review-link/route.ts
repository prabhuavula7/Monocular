import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agencies, scopes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await auth()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [agency] = await db
    .select()
    .from(agencies)
    .where(eq(agencies.clerkOrgId, orgId))
    .limit(1)

  if (!agency) return NextResponse.json({ error: 'Agency not found' }, { status: 404 })

  const [scope] = await db
    .select({ id: scopes.id, agencyId: scopes.agencyId, reviewToken: scopes.reviewToken })
    .from(scopes)
    .where(eq(scopes.id, id))
    .limit(1)

  if (!scope || scope.agencyId !== agency.id) {
    return NextResponse.json({ error: 'Scope not found' }, { status: 404 })
  }

  let reviewToken = scope.reviewToken
  if (!reviewToken) {
    reviewToken = nanoid(32)
    await db
      .update(scopes)
      .set({ reviewToken, updatedAt: new Date() })
      .where(eq(scopes.id, id))
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return NextResponse.json({ url: `${appUrl}/review/${reviewToken}` })
}
