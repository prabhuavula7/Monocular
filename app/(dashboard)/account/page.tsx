import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import AccountClient from './AccountClient'

export default async function AccountPage() {
  const { orgId, orgRole } = await auth()
  if (!orgId) redirect('/sign-in')

  return <AccountClient isAdmin={orgRole === 'org:admin'} />
}
