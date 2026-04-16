import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agencies, scopes, projectTypes } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET() {
  const { orgId } = await auth()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [agency] = await db
    .select()
    .from(agencies)
    .where(eq(agencies.clerkOrgId, orgId))
    .limit(1)

  if (!agency) return NextResponse.json({ error: 'Agency not found' }, { status: 404 })

  const allScopes = await db
    .select({
      id: scopes.id,
      status: scopes.status,
      name: scopes.name,
      clientName: scopes.clientName,
      clientEmail: scopes.clientEmail,
      generatedScope: scopes.generatedScope,
      createdAt: scopes.createdAt,
      projectTypeId: scopes.projectTypeId,
      projectTypeName: projectTypes.name,
      intakeLinkId: scopes.intakeLinkId,
    })
    .from(scopes)
    .leftJoin(projectTypes, eq(scopes.projectTypeId, projectTypes.id))
    .where(eq(scopes.agencyId, agency.id))
    .orderBy(desc(scopes.createdAt))

  return NextResponse.json(allScopes)
}
