import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agencies } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const SEAT_LIMITS: Record<string, number> = {
  trial:  3,
  solo:   1,
  studio: 5,
  agency: Infinity,
}

export async function GET() {
  const { orgId, orgRole } = await auth()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clerk = await clerkClient()

  const memberships = await clerk.organizations.getOrganizationMembershipList({
    organizationId: orgId,
    limit: 100,
  })

  let invitations: object[] = []
  if (orgRole === 'org:admin') {
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

  return NextResponse.json({
    members: memberships.data.map(m => ({
      id: m.id,
      userId: m.publicUserData?.userId,
      role: m.role,
      createdAt: m.createdAt,
      firstName: m.publicUserData?.firstName ?? null,
      lastName: m.publicUserData?.lastName ?? null,
      email: m.publicUserData?.identifier ?? null,
      imageUrl: m.publicUserData?.imageUrl ?? null,
    })),
    invitations,
    isAdmin: orgRole === 'org:admin',
  })
}

export async function POST(req: NextRequest) {
  const { orgId, orgRole, userId } = await auth()
  if (!orgId || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (orgRole !== 'org:admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, role = 'org:member' } = await req.json() as { email: string; role?: string }
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })
  if (!['org:admin', 'org:member'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const [agency] = await db
    .select({ plan: agencies.plan })
    .from(agencies)
    .where(eq(agencies.clerkOrgId, orgId))
    .limit(1)

  const plan = agency?.plan ?? 'trial'
  const limit = SEAT_LIMITS[plan] ?? 1

  const clerk = await clerkClient()
  const memberships = await clerk.organizations.getOrganizationMembershipList({
    organizationId: orgId,
    limit: 100,
  })

  if (memberships.totalCount >= limit) {
    const limitStr = limit === Infinity ? 'unlimited' : String(limit)
    return NextResponse.json({
      error: `Your ${plan} plan allows up to ${limitStr} seat${limit === 1 ? '' : 's'}. Upgrade to add more members.`,
    }, { status: 402 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const invitation = await clerk.organizations.createOrganizationInvitation({
    organizationId: orgId,
    emailAddress: email,
    role,
    redirectUrl: `${appUrl}/dashboard`,
  })

  return NextResponse.json({
    id: invitation.id,
    email: invitation.emailAddress,
    role: invitation.role,
    createdAt: invitation.createdAt,
  })
}
