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
      id: intakeLinks.id,
      agencyId: intakeLinks.agencyId,
      expiresAt: intakeLinks.expiresAt,
      usedAt: intakeLinks.usedAt,
    })
    .from(intakeLinks)
    .where(eq(intakeLinks.token, token))
    .limit(1)

  if (!link) notFound()

  if (link.expiresAt && link.expiresAt < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-700">This intake link has expired.</p>
          <p className="text-sm text-gray-500 mt-1">Please contact the team for a new link.</p>
        </div>
      </div>
    )
  }

  if (link.usedAt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-700">This intake has already been completed.</p>
          <p className="text-sm text-gray-500 mt-1">The team will be in touch with your scope.</p>
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
