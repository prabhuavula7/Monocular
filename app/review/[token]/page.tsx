import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { agencies, intakeLinks, scopes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import ReviewClient from './ReviewClient'
import type { GeneratedScope } from '@/types'

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const [scope] = await db
    .select()
    .from(scopes)
    .where(eq(scopes.reviewToken, token))
    .limit(1)

  if (!scope || !scope.generatedScope) notFound()

  const [agency] = await db
    .select({ name: agencies.name })
    .from(agencies)
    .where(eq(agencies.id, scope.agencyId))
    .limit(1)

  let intakeLinkToken: string | null = null
  if (scope.intakeLinkId) {
    const [link] = await db
      .select({ token: intakeLinks.token, isDeprecated: intakeLinks.isDeprecated })
      .from(intakeLinks)
      .where(eq(intakeLinks.id, scope.intakeLinkId))
      .limit(1)
    if (link && !link.isDeprecated) intakeLinkToken = link.token
  }

  return (
    <ReviewClient
      token={token}
      scope={{
        id: scope.id,
        name: scope.name,
        clientName: scope.clientName,
        generatedScope: scope.generatedScope as GeneratedScope,
        createdAt: scope.createdAt,
      }}
      agencyName={agency?.name ?? 'Your agency'}
      intakeLinkToken={intakeLinkToken}
    />
  )
}
