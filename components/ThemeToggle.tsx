'use client'

import { useTheme } from '@/components/ThemeProvider'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const OPTIONS = [
  { value: 'light',  Icon: Sun,     label: 'Light' },
  { value: 'dark',   Icon: Moon,    label: 'Dark'  },
  { value: 'system', Icon: Monitor, label: 'System'},
] as const

/** Compact single-icon cycling button — used in the sidebar */
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-8 h-8" />

  function cycle() {
    if (theme === 'system') setTheme('light')
    else if (theme === 'light') setTheme('dark')
    else setTheme('system')
  }

  const Icon = OPTIONS.find((o) => o.value === theme)?.Icon ?? Monitor

  return (
    <button
      onClick={cycle}
      title={`Theme: ${theme}`}
      className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-3 hover:text-ink-2 hover:bg-panel-hover transition-colors"
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  )
}

/** Three-symbol segmented control — used in the top header */
export function ThemeSegment({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-24 h-8" />

  return (
    <div className={cn(
      'flex items-center gap-0.5 bg-panel border border-line rounded-lg p-0.5',
      className
    )}>
      {OPTIONS.map(({ value, Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          title={label}
          className={cn(
            'w-8 h-7 flex items-center justify-center rounded-md transition-all',
            theme === value
              ? 'bg-orange text-white shadow-sm'
              : 'text-ink-3 hover:text-ink-2 hover:bg-panel-hover'
          )}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}
    </div>
  )
}
