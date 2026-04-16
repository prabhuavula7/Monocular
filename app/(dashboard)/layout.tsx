import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { agencies } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { Sidebar } from '@/components/dashboard/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { orgId } = await auth()
  if (!orgId) redirect('/create-org')

  const [agency] = await db
    .select({ name: agencies.name })
    .from(agencies)
    .where(eq(agencies.clerkOrgId, orgId))
    .limit(1)

  return (
    <div className="h-screen flex overflow-hidden bg-canvas">
      <Sidebar agencyName={agency?.name ?? 'Monocular'} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
