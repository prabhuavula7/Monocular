import { WaveBackground } from '@/components/ui/wave-background'
import { ThemeSegment } from '@/components/ThemeToggle'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      <WaveBackground />

      {/* Theme toggle — top-right corner */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeSegment />
      </div>

      {children}
    </div>
  )
}
