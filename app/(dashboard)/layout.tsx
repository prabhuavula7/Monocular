import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Settings } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import { db } from '@/lib/db'
import { agencies } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import Image from 'next/image'

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
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5">
          <Image
            src="/monocular_logo_pack/monocular-icon-color.svg"
            alt="Monocular"
            width={28}
            height={28}
            className="h-7 w-7 flex-shrink-0"
            priority
          />
          <span className="text-sm font-medium text-gray-900 truncate">
            {agency?.name ?? 'Monocular'}
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors group"
          >
            <LayoutDashboard className="w-4 h-4 group-hover:text-orange-500" />
            Dashboard
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors group"
          >
            <Settings className="w-4 h-4 group-hover:text-orange-500" />
            Settings
          </Link>
        </nav>

        <div className="px-4 py-4 border-t border-gray-100 flex items-center gap-2.5">
          <UserButton />
          <span className="text-xs text-gray-400 flex-1 truncate">Account</span>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
