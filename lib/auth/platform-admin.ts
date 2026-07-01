import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { platformAdmins } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// Cross-org Monocular staff access — orthogonal to Clerk orgRole, which only
// ever describes a user's role within a single client org.
export async function isPlatformAdmin(userId: string | null): Promise<boolean> {
  if (!userId) return false
  const [row] = await db
    .select({ id: platformAdmins.id })
    .from(platformAdmins)
    .where(eq(platformAdmins.clerkUserId, userId))
    .limit(1)
  return !!row
}

// For server components / layouts under /internal — redirects non-admins to '/'.
export async function requirePlatformAdmin() {
  const { userId } = await auth()
  if (!(await isPlatformAdmin(userId))) redirect('/')
}
