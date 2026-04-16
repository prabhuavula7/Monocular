import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agencies, scopes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { runGenerateScope } from '@/lib/run-generate-scope'

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
    .select({ id: scopes.id, agencyId: scopes.agencyId, generatedScope: scopes.generatedScope })
    .from(scopes)
    .where(eq(scopes.id, id))
    .limit(1)

  if (!scope || scope.agencyId !== agency.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await runGenerateScope(id)

  const [updated] = await db
    .select({ generatedScope: scopes.generatedScope })
    .from(scopes)
    .where(eq(scopes.id, id))
    .limit(1)

  return NextResponse.json({ ok: true, generatedScope: updated?.generatedScope ?? null })
}
