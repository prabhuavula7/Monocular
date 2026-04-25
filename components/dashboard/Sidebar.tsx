'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Link2, FileText,
  Settings, User, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { useUser } from '@clerk/nextjs'
import { ThemeSegment, ThemeToggle } from '@/components/ThemeToggle'

interface Props {
  agencyName: string
}

const NAV_PRIMARY = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { href: '/intake',    icon: Link2,           label: 'Intake'   },
  { href: '/scopes',    icon: FileText,        label: 'Scopes'   },
]

const NAV_SECONDARY = [
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar({ agencyName }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { user } = useUser()

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved === 'true') setCollapsed(true)
  }, [])

  function toggle() {
    setCollapsed(v => {
      localStorage.setItem('sidebar-collapsed', String(!v))
      return !v
    })
  }

  function NavLink({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
    const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
    return (
      <Link
        href={href}
        title={collapsed ? label : undefined}
        className={`
          flex items-center gap-2.5 rounded-lg text-sm transition-colors
          ${collapsed ? 'justify-center px-0 py-2' : 'px-3 py-2'}
          ${active
            ? 'bg-orange-dim text-orange font-medium'
            : 'text-ink-2 hover:text-ink hover:bg-panel-hover'}
        `}
      >
        <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-orange' : ''}`} />
        {!collapsed && label}
      </Link>
    )
  }

  return (
    <aside
      className={`
        relative flex flex-col flex-shrink-0 h-full bg-sidebar border-r border-sidebar-line
        transition-all duration-200 ease-in-out
        ${collapsed ? 'w-14' : 'w-56'}
      `}
    >
      {/* Collapse toggle */}
      <button
        onClick={toggle}
        className="absolute -right-3 top-5 z-10 w-6 h-6 rounded-full bg-panel border border-line flex items-center justify-center text-ink-3 hover:text-ink hover:border-orange transition-colors shadow-sm"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Logo */}
      <div className={`border-b border-sidebar-line overflow-hidden ${collapsed ? 'flex items-center justify-center px-0 py-4' : 'px-4 py-3.5'}`}>
        {collapsed ? (
          <Image
            src="/monocular-lens2.svg"
            alt="Monocular"
            width={32}
            height={32}
            className="h-8 w-8 flex-shrink-0"
            priority
          />
        ) : (
          <div className="flex flex-col gap-0.5 min-w-0">
            <img src="/monocular-blacktext.svg" alt="Monocular" className="h-7 w-auto dark:hidden" />
            <img src="/monocular-whitetext.svg" alt="Monocular" className="h-7 w-auto hidden dark:block" />
            <span className="text-xs text-ink-3 truncate mt-0.5">{agencyName}</span>
          </div>
        )}
      </div>

      {/* Primary nav */}
      <nav className={`pt-4 space-y-0.5 ${collapsed ? 'px-1.5' : 'px-3'}`}>
        {NAV_PRIMARY.map(item => <NavLink key={item.href} {...item} />)}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Secondary nav */}
      <nav className={`pb-2 space-y-0.5 ${collapsed ? 'px-1.5' : 'px-3'}`}>
        {NAV_SECONDARY.map(item => <NavLink key={item.href} {...item} />)}
      </nav>

      {/* Theme toggle */}
      <div className={`border-t border-sidebar-line flex items-center justify-center py-3 ${collapsed ? 'px-1.5' : 'px-4'}`}>
        {collapsed ? <ThemeToggle /> : <ThemeSegment className="w-full justify-center" />}
      </div>

      {/* User card — links to /account */}
      <Link
        href="/account"
        title={collapsed ? 'Account' : undefined}
        className={`border-t border-sidebar-line flex items-center gap-2.5 py-3 transition-colors hover:bg-panel-hover group ${collapsed ? 'justify-center px-0' : 'px-4'}`}
      >
        {user?.imageUrl ? (
          <Image
            src={user.imageUrl}
            alt={user.fullName ?? 'User'}
            width={28}
            height={28}
            className="w-7 h-7 rounded-full flex-shrink-0 ring-1 ring-line"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-orange-dim border border-orange-border flex items-center justify-center flex-shrink-0">
            <User className="w-3.5 h-3.5 text-orange" />
          </div>
        )}
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink truncate leading-tight">
              {user?.fullName ?? user?.firstName ?? 'Account'}
            </p>
            <p className="text-[11px] text-ink-3 truncate leading-tight">
              {user?.primaryEmailAddress?.emailAddress ?? ''}
            </p>
          </div>
        )}
      </Link>
    </aside>
  )
}
