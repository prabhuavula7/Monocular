import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { orgId, orgRole } = await auth()
  if (!orgId) redirect('/sign-in')
  if (orgRole !== 'org:admin') redirect('/dashboard')
  return <>{children}</>
}
