import { requirePlatformAdmin } from '@/lib/auth/platform-admin'

export default async function InternalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requirePlatformAdmin()

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-3">
        <span className="text-sm font-semibold text-zinc-500">Monocular Internal</span>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
