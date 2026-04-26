'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Link2, FileText,
  Users, Settings, ChevronLeft, ChevronRight,
  Sparkles, Bell, Sun, Moon,
} from 'lucide-react'
import { useUser } from '@clerk/nextjs'
import { useTheme } from '@/components/ThemeProvider'

interface Props {
  agencyName: string
  plan?: string
  trialEndsAt?: Date | null
  isAdmin?: boolean
}

// ─── Coming Soon pill ────────────────────────────────────────

function ComingSoon() {
  return (
    <span
      className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
      style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)', color: '#F97316' }}
    >
      Soon
    </span>
  )
}

// ─── Nav config ───────────────────────────────────────────────

const NAV_MAIN = [
  { href: '/dashboard', id: 'overview', label: 'Overview', Icon: LayoutDashboard },
  { href: '/intake',    id: 'intake',   label: 'Intake',   Icon: Link2            },
  { href: '/scopes',    id: 'scopes',   label: 'Scopes',   Icon: FileText         },
]
const NAV_PEOPLE = [
  { href: '/team', id: 'team', label: 'Team', Icon: Users },
]

// ─── Sidebar ─────────────────────────────────────────────────

export function Sidebar({ agencyName, plan, trialEndsAt, isAdmin = true }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { user } = useUser()
  const { resolvedTheme, setTheme } = useTheme()

  const isDark = resolvedTheme === 'dark'

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

  const userInitial = (
    user?.firstName?.[0] ?? user?.lastName?.[0] ?? 'U'
  ).toUpperCase()

  // ── NavItem (closure over collapsed + pathname) ──
  function NavItem({ href, id, label, Icon, soon }: {
    href: string; id: string; label: string
    Icon: React.ElementType; soon?: boolean
  }) {
    const active = id === 'overview'
      ? pathname === '/dashboard'
      : pathname.startsWith(href)

    return (
      <Link
        href={href}
        title={collapsed ? label : undefined}
        className={[
          'relative flex items-center rounded-lg text-[13px] transition-all duration-[120ms]',
          collapsed ? 'justify-center mx-auto' : 'gap-2.5 px-2.5 py-[7px]',
          active
            ? 'font-semibold text-orange'
            : 'font-medium text-ink-2 hover:text-ink',
        ].join(' ')}
        style={{
          background: active ? 'rgba(249,115,22,0.08)' : undefined,
          ...(collapsed ? { width: 36, height: 36 } : {}),
        }}
      >
        {/* Left accent bar */}
        {active && !collapsed && (
          <span
            className="absolute rounded-r-sm bg-orange"
            style={{ left: -1, top: '20%', bottom: '20%', width: 2 }}
          />
        )}
        <Icon className="w-4 h-4 flex-shrink-0" />
        {!collapsed && <span className="flex-1 truncate">{label}</span>}
        {!collapsed && soon && <ComingSoon />}
      </Link>
    )
  }

  return (
    // Outer wrapper owns the width transition and provides the positioning
    // context for the collapse button so it isn't clipped by the aside's
    // overflow-hidden (needed to mask text during expand animation).
    <div
      className="relative flex-shrink-0 h-full"
      style={{
        width: collapsed ? 62 : 228,
        minWidth: collapsed ? 62 : 228,
        transition: 'width 220ms ease, min-width 220ms ease',
      }}
    >
      {/* ── Collapse / expand — straddles the sidebar border ── */}
      <button
        onClick={toggle}
        className="absolute -right-3 top-5 z-10 w-6 h-6 rounded-full bg-panel border border-line flex items-center justify-center text-ink-3 hover:text-ink hover:border-orange transition-colors shadow-sm"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed
          ? <ChevronRight className="w-3 h-3" />
          : <ChevronLeft className="w-3 h-3" />}
      </button>

    <aside
      className="flex flex-col h-full w-full bg-sidebar border-r border-sidebar-line overflow-hidden"
    >

      {/* ── Header ── */}
      <div className={`border-b border-sidebar-line overflow-hidden ${collapsed ? 'flex items-center justify-center px-0 py-4' : 'px-4 py-3.5'}`}>
        {collapsed ? (
          <Image
            src="/monocular-lens2.svg"
            alt="Monocular"
            width={32}
            height={32}
            className="w-8 h-8 flex-shrink-0"
            priority
          />
        ) : (
          <div className="flex items-center gap-2.5 min-w-0">
            <Image
              src="/monocular-lens2.svg"
              alt="Monocular"
              width={28}
              height={28}
              className="w-7 h-7 flex-shrink-0"
              priority
            />
            <span className="text-sm font-semibold text-ink truncate">{agencyName}</span>
          </div>
        )}
      </div>

      {/* ── Nav area ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ padding: '8px 6px' }}>
        {/* Navigation section */}
        {!collapsed ? (
          <div className="px-1.5 pt-2 pb-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-3">
              Navigation
            </span>
          </div>
        ) : (
          <div className="h-2" />
        )}

        {NAV_MAIN.map(item => (
          <NavItem key={item.href} {...item} />
        ))}

        {/* People section */}
        {!collapsed ? (
          <div className="px-1.5 pt-4 pb-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-3">
              People
            </span>
          </div>
        ) : (
          <div className="h-2" />
        )}

        {NAV_PEOPLE.map(item => (
          <NavItem key={item.href} {...item} />
        ))}

        {/* Trial pill */}
        {!collapsed && plan === 'trial' && trialEndsAt && (() => {
          const daysLeft = Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86_400_000))
          return (
            <div
              className="mx-1 mt-4 px-2.5 py-[7px] rounded-lg"
              style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)' }}
            >
              <div className="text-[10px] font-bold text-orange">
                Trial · {daysLeft === 0 ? 'expires today' : `${daysLeft}d left`}
              </div>
              <div className="text-[10px] text-ink-2 mt-0.5">Upgrade to unlock all features</div>
            </div>
          )
        })()}
      </div>

      {/* ── Bottom section ── */}
      <div className="border-t border-sidebar-line flex-shrink-0">
        {/* Settings — admins only */}
        {isAdmin && (
          <div className="px-1.5 pt-1 pb-0.5">
            <NavItem href="/settings" id="settings" label="Settings" Icon={Settings} />
          </div>
        )}

        {/* Tool strip */}
        <div
          className="border-t border-sidebar-line px-2.5 py-1.5 flex gap-1"
          style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
        >
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            title={isDark ? 'Light mode' : 'Dark mode'}
            className="flex items-center justify-center rounded-[7px] bg-panel border border-line hover:border-orange transition-colors"
            style={{ width: 30, height: 30 }}
          >
            {isDark
              ? <Sun className="w-3.5 h-3.5 text-yellow-400" />
              : <Moon className="w-3.5 h-3.5 text-ink-3" />}
          </button>

          {!collapsed && (
            <>
              <button
                className="flex items-center justify-center rounded-[7px] transition-colors"
                style={{ width: 30, height: 30, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)' }}
                title="AI Assistant"
              >
                <Sparkles className="w-3.5 h-3.5 text-orange" />
              </button>
              <button
                className="flex items-center justify-center rounded-[7px] bg-panel border border-line text-ink-2 hover:text-ink hover:border-orange transition-colors"
                style={{ width: 30, height: 30 }}
                title="Notifications"
              >
                <Bell className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {/* User footer */}
        <Link
          href="/account"
          title={collapsed ? 'Account' : undefined}
          className="flex items-center gap-2.5 border-t border-sidebar-line hover:bg-panel-hover transition-colors"
          style={{
            padding: collapsed ? '10px 0' : '9px 12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
        >
          {user?.imageUrl ? (
            <Image
              src={user.imageUrl}
              alt={user.fullName ?? 'User'}
              width={30}
              height={30}
              className="flex-shrink-0 rounded-full ring-1 ring-line"
            />
          ) : (
            <div
              className="flex-shrink-0 flex items-center justify-center rounded-full text-[12px] font-bold text-white"
              style={{ width: 30, height: 30, background: '#16A34A' }}
            >
              {userInitial}
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-ink truncate leading-tight">
                {user?.fullName ?? user?.firstName ?? 'Account'}
              </div>
              <div className="text-[10px] text-ink-2 truncate leading-tight">
                {user?.primaryEmailAddress?.emailAddress ?? ''}
              </div>
            </div>
          )}
        </Link>
      </div>
    </aside>
    </div>
  )
}
