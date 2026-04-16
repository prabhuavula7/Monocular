import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { agencies, scopes } from '@/lib/db/schema'
import { asc, eq } from 'drizzle-orm'
import ScopeEditorClient from './ScopeEditorClient'
import type { Message, GeneratedScope } from '@/types'

export default async function ScopePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { orgId } = await auth()
  if (!orgId) redirect('/sign-in')

  const { id } = await params

  const [agency] = await db
    .select()
    .from(agencies)
    .where(eq(agencies.clerkOrgId, orgId))
    .limit(1)

  if (!agency) redirect('/dashboard')

  const [scope] = await db
    .select()
    .from(scopes)
    .where(eq(scopes.id, id))
    .limit(1)

  if (!scope || scope.agencyId !== agency.id) notFound()

  // Fetch sibling versions from the same intake link (for version history strip)
  const versions =
    scope.intakeLinkId
      ? await db
          .select({ id: scopes.id, name: scopes.name, createdAt: scopes.createdAt, status: scopes.status })
          .from(scopes)
          .where(eq(scopes.intakeLinkId, scope.intakeLinkId))
          .orderBy(asc(scopes.createdAt))
      : []

  return (
    <ScopeEditorClient
      scope={{
        ...scope,
        status: scope.status ?? 'draft',
        transcript: (scope.transcript as Message[]) ?? [],
        generatedScope: scope.generatedScope as GeneratedScope | null,
      }}
      agencyName={agency.name}
      versions={versions}
    />
  )
}
