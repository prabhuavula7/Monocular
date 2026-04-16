import { db } from '@/lib/db'
import { intakeLinks, agencies } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import IntakeChatClient from './IntakeChatClient'

export default async function IntakePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const [link] = await db
    .select({
      id:           intakeLinks.id,
      agencyId:     intakeLinks.agencyId,
      expiresAt:    intakeLinks.expiresAt,
      usedAt:       intakeLinks.usedAt,
      isDeprecated: intakeLinks.isDeprecated,
    })
    .from(intakeLinks)
    .where(eq(intakeLinks.token, token))
    .limit(1)

  if (!link) notFound()

  if (link.isDeprecated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="text-center px-6">
          <p className="text-base font-medium text-ink">This link is no longer active.</p>
          <p className="text-sm text-ink-3 mt-1">Please contact the team for an updated link.</p>
        </div>
      </div>
    )
  }

  if (link.expiresAt && link.expiresAt < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="text-center px-6">
          <p className="text-base font-medium text-ink">This intake link has expired.</p>
          <p className="text-sm text-ink-3 mt-1">Please contact the team for a new link.</p>
        </div>
      </div>
    )
  }

  const [agency] = await db
    .select({ name: agencies.name })
    .from(agencies)
    .where(eq(agencies.id, link.agencyId))
    .limit(1)

  return (
    <IntakeChatClient
      token={token}
      agencyName={agency?.name ?? 'the team'}
    />
  )
}
