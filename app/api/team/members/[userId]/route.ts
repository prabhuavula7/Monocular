import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { orgId, orgRole, userId: currentUserId } = await auth()
  if (!orgId || !currentUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (orgRole !== 'org:admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = await params
  const { role } = await req.json() as { role: string }

  if (!['org:admin', 'org:member'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }
  if (userId === currentUserId) {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
  }

  const clerk = await clerkClient()
  await clerk.organizations.updateOrganizationMembership({
    organizationId: orgId,
    userId,
    role,
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { orgId, orgRole, userId: currentUserId } = await auth()
  if (!orgId || !currentUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (orgRole !== 'org:admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = await params

  if (userId === currentUserId) {
    return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })
  }

  const clerk = await clerkClient()
  await clerk.organizations.deleteOrganizationMembership({
    organizationId: orgId,
    userId,
  })

  return NextResponse.json({ ok: true })
}
