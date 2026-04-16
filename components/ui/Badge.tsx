import { cn } from '@/lib/utils'

type Variant = 'gray' | 'amber' | 'blue' | 'green' | 'red'

const VARIANTS: Record<Variant, string> = {
  gray:  'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  blue:  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  red:   'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
}

interface BadgeProps {
  children: React.ReactNode
  variant?: Variant
  className?: string
}

export function Badge({ children, variant = 'gray', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium',
        VARIANTS[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
