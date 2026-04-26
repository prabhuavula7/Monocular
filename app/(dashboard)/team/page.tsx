import { auth, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { agencies } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import TeamClient from './TeamClient'

export default async function TeamPage() {
  const { orgId, orgRole, userId } = await auth()
  if (!orgId || !userId) redirect('/sign-in')

  const isAdmin = orgRole === 'org:admin'

  const clerk = await clerkClient()

  const [membershipsResult, agency] = await Promise.all([
    clerk.organizations.getOrganizationMembershipList({ organizationId: orgId, limit: 100 }),
    db.select({ plan: agencies.plan }).from(agencies).where(eq(agencies.clerkOrgId, orgId)).limit(1),
  ])

  let invitations: { id: string; email: string; role: string; createdAt: number }[] = []
  if (isAdmin) {
    const inv = await clerk.organizations.getOrganizationInvitationList({
      organizationId: orgId,
      status: ['pending'],
    })
    invitations = inv.data.map(i => ({
      id: i.id,
      email: i.emailAddress,
      role: i.role,
      createdAt: i.createdAt,
    }))
  }

  return (
    <TeamClient
      plan={agency[0]?.plan ?? 'trial'}
      initialData={{
        members: membershipsResult.data.map(m => ({
          id: m.id,
          userId: m.publicUserData?.userId ?? '',
          role: m.role,
          createdAt: m.createdAt,
          firstName: m.publicUserData?.firstName ?? null,
          lastName: m.publicUserData?.lastName ?? null,
          email: m.publicUserData?.identifier ?? null,
          imageUrl: m.publicUserData?.imageUrl ?? null,
        })),
        invitations,
        isAdmin,
      }}
    />
  )
}
