import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { orgId, orgRole, userId } = await auth()
  if (!orgId || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (orgRole !== 'org:admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  const clerk = await clerkClient()
  await clerk.organizations.revokeOrganizationInvitation({
    organizationId: orgId,
    invitationId: id,
    requestingUserId: userId,
  })

  return NextResponse.json({ ok: true })
}
