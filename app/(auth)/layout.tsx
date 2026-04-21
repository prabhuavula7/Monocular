import { WaveBackground } from '@/components/ui/wave-background'
import { ThemeSegment } from '@/components/ThemeToggle'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      <WaveBackground />

      {/* Hide Clerk "Secured by" + "Development mode" branding.
          aria-label="Clerk logo" is stable across versions. Direct parent only — never ancestor. */}
      <style>{`
        a[aria-label="Clerk logo"],
        div:has(> a[aria-label="Clerk logo"]),
        div:has(> div > a[aria-label="Clerk logo"]) {
          display: none !important;
        }
      `}</style>

      {/* Theme toggle — top-right corner */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeSegment />
      </div>

      {children}
    </div>
  )
}
