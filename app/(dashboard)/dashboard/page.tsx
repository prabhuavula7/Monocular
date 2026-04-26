'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import {
  FileText, Clock, Send, Link2, ArrowRight,
  Trophy, TrendingUp, Target,
} from 'lucide-react'
import { ScopeStatusBadge } from '@/components/dashboard/ScopeStatusBadge'
import { formatRelativeTime } from '@/lib/utils'
import type { GeneratedScope } from '@/types'

// ─── Types ────────────────────────────────────────────────────

type ScopeStatus = 'draft' | 'in_review' | 'sent' | 'won' | 'lost'

interface Scope {
  id: string
  clientName: string | null
  status: ScopeStatus
  createdAt: string
  generatedScope: GeneratedScope | null
  projectTypeName: string | null
}

interface IntakeLink {
  id: string
  clientName: string | null
  projectTypeName: string | null
  usedAt: string | null
  isDeprecated: boolean
  createdAt: string
}

// ─── Helpers ─────────────────────────────────────────────────

const STATUS_COLOR: Record<ScopeStatus, string> = {
  draft:     '#71717A',
  in_review: '#F59E0B',
  sent:      '#3B82F6',
  won:       '#22C55E',
  lost:      '#EF4444',
}

function fmtMoney(n: number | null | undefined): string {
  if (!n) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${Math.round(n / 1_000)}k`
  return `$${n}`
}

function timeGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function estimate(scope: Scope): number | null {
  const gs = scope.generatedScope as GeneratedScope | null
  return gs?.pricingEstimate?.high ?? null
}

// ─── Stat card ───────────────────────────────────────────────

function StatCard({ label, value, sub, Icon, accent }: {
  label: string; value: string | number; sub?: string
  Icon: React.ElementType; accent: string
}) {
  return (
    <div className="bg-panel border border-line rounded-xl p-4 panel-shadow flex flex-col gap-3 min-w-0">
      <div
        className="w-[34px] h-[34px] flex items-center justify-center rounded-[9px] flex-shrink-0"
        style={{ background: `${accent}22` }}
      >
        <Icon className="w-[15px] h-[15px]" style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <div className="text-[26px] font-semibold leading-none text-ink font-mono truncate">
          {value}
        </div>
        <div className="text-[12px] text-ink-3 mt-1.5 font-medium">{label}</div>
        {sub && <div className="text-[10px] text-ink-3 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

// ─── AI Engine pill with pulse ────────────────────────────────

function AIEnginePill() {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium flex-shrink-0"
      style={{
        background: 'rgba(249,115,22,0.09)',
        border: '1px solid rgba(249,115,22,0.2)',
        color: '#F97316',
      }}
    >
      <span className="relative flex h-[7px] w-[7px]">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange opacity-50" />
        <span className="relative inline-flex rounded-full h-[7px] w-[7px] bg-orange" />
      </span>
      AI Engine Active
    </div>
  )
}

// ─── Mini monthly calendar ────────────────────────────────────

function MiniCalendar({ scopes }: { scopes: Scope[] }) {
  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth()
  const today = now.getDate()

  const firstDow    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // map day-of-month → scopes
  const byDay = new Map<number, Scope[]>()
  scopes.forEach(s => {
    const d = new Date(s.createdAt)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      if (!byDay.has(day)) byDay.set(day, [])
      byDay.get(day)!.push(s)
    }
  })

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const MONTH_LABEL = now.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="bg-panel border border-line rounded-xl p-4 panel-shadow">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-ink-3 uppercase tracking-widest">{MONTH_LABEL}</p>
        <p className="text-[10px] text-ink-3 font-mono">
          {byDay.size} active {byDay.size === 1 ? 'day' : 'days'}
        </p>
      </div>

      {/* DOW headers */}
      <div className="grid grid-cols-7 mb-0.5">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="text-center text-[10px] text-ink-3 py-0.5 select-none">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} className="h-9" />

          const isToday    = day === today
          const ss         = byDay.get(day) ?? []
          const hasActivity = ss.length > 0

          let dotColor = '#F97316'
          if      (ss.some(s => s.status === 'won'))       dotColor = '#22C55E'
          else if (ss.some(s => s.status === 'sent'))      dotColor = '#3B82F6'
          else if (ss.some(s => s.status === 'in_review')) dotColor = '#F59E0B'

          return (
            <div key={`d-${day}`} className="flex flex-col items-center h-9 gap-px">
              <span
                className={[
                  'text-[12px] w-7 h-7 flex items-center justify-center rounded-full leading-none select-none',
                  isToday
                    ? 'bg-orange text-white font-semibold'
                    : hasActivity
                      ? 'text-ink font-medium'
                      : 'text-ink-3',
                ].join(' ')}
              >
                {day}
              </span>
              <span
                className="w-1 h-1 rounded-full transition-opacity duration-200"
                style={{
                  background: dotColor,
                  opacity: hasActivity && !isToday ? 1 : 0,
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Active pipeline table ────────────────────────────────────

function ScopesTable({ scopes }: { scopes: Scope[] }) {
  const rows = scopes.slice(0, 7)

  if (rows.length === 0) {
    return (
      <div className="bg-panel border border-dashed border-line rounded-xl px-5 py-10 text-center">
        <p className="text-sm text-ink-3">Scopes appear here once a client completes intake.</p>
      </div>
    )
  }

  return (
    <div className="bg-panel border border-line rounded-xl overflow-hidden panel-shadow">
      <div className="px-4 py-3 border-b border-line flex items-center justify-between">
        <p className="text-xs font-semibold text-ink-3 uppercase tracking-widest">Active Pipeline</p>
        <Link href="/scopes" className="flex items-center gap-1 text-xs text-orange hover:underline">
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Column headers */}
      <div
        className="grid gap-3 px-4 py-2 border-b border-line text-[10px] font-semibold uppercase tracking-wider text-ink-3"
        style={{ gridTemplateColumns: '1fr auto auto auto' }}
      >
        <span>Client</span>
        <span className="w-[72px] text-center">Status</span>
        <span className="w-14 text-right">Value</span>
        <span className="w-12 text-right">Age</span>
      </div>

      <div className="divide-y divide-line">
        {rows.map(scope => (
          <Link
            key={scope.id}
            href={`/scopes/${scope.id}`}
            className="grid gap-3 px-4 py-2.5 hover:bg-panel-hover transition-colors items-center border-l-[3px] group"
            style={{
              gridTemplateColumns: '1fr auto auto auto',
              borderLeftColor: STATUS_COLOR[scope.status],
            }}
          >
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-ink truncate group-hover:text-orange transition-colors">
                {scope.clientName ?? 'Anonymous'}
              </p>
              {scope.projectTypeName && (
                <p className="text-[10px] text-ink-3 truncate">{scope.projectTypeName}</p>
              )}
            </div>
            <div className="w-[72px] flex justify-center">
              <ScopeStatusBadge status={scope.status} />
            </div>
            <span className="w-14 text-right text-[12px] font-mono text-ink-2">
              {fmtMoney(estimate(scope))}
            </span>
            <span className="w-12 text-right text-[11px] text-ink-3 font-mono tabular-nums">
              {formatRelativeTime(scope.createdAt)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── Pipeline distribution ────────────────────────────────────

function PipelineCard({ scopes }: { scopes: Scope[] }) {
  const stages = [
    { status: 'draft'     as ScopeStatus, label: 'Draft',     color: '#71717A' },
    { status: 'in_review' as ScopeStatus, label: 'In Review', color: '#F59E0B' },
    { status: 'sent'      as ScopeStatus, label: 'Sent',      color: '#3B82F6' },
    { status: 'won'       as ScopeStatus, label: 'Won',       color: '#22C55E' },
    { status: 'lost'      as ScopeStatus, label: 'Lost',      color: '#EF4444' },
  ]
  const total = Math.max(scopes.length, 1)

  return (
    <div className="bg-panel border border-line rounded-xl p-4 panel-shadow">
      <p className="text-xs font-semibold text-ink-3 uppercase tracking-widest mb-4">Pipeline Distribution</p>
      <div className="space-y-3">
        {stages.map(({ status, label, color }) => {
          const count = scopes.filter(s => s.status === status).length
          const pct   = Math.round((count / total) * 100)
          return (
            <div key={status} className="flex items-center gap-2.5">
              <span className="w-[62px] text-[11px] text-ink-3 flex-shrink-0 leading-none">{label}</span>
              <div className="flex-1 h-[6px] bg-panel-hover rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
              <span className="w-5 text-right text-[11px] font-mono text-ink-3 flex-shrink-0 tabular-nums">
                {count}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Win rate donut ───────────────────────────────────────────

function WinRateCard({ scopes }: { scopes: Scope[] }) {
  const won   = scopes.filter(s => s.status === 'won').length
  const lost  = scopes.filter(s => s.status === 'lost').length
  const total = won + lost
  const rate  = total ? Math.round((won / total) * 100) : null

  const R   = 26
  const C   = 2 * Math.PI * R
  const arc = rate != null ? (rate / 100) * C : 0

  return (
    <div className="bg-panel border border-line rounded-xl p-4 panel-shadow">
      <p className="text-xs font-semibold text-ink-3 uppercase tracking-widest mb-3">Win Rate</p>
      <div className="flex items-center gap-4">
        {/* SVG donut */}
        <svg width="60" height="60" viewBox="0 0 60 60" className="-rotate-90 flex-shrink-0">
          <circle
            cx="30" cy="30" r={R}
            fill="none" strokeWidth="6"
            className="stroke-panel-hover"
          />
          {rate != null && (
            <circle
              cx="30" cy="30" r={R}
              fill="none" stroke="#22C55E" strokeWidth="6"
              strokeDasharray={`${arc} ${C}`}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          )}
        </svg>
        <div>
          <div className="text-[26px] font-semibold font-mono text-ink leading-none">
            {rate != null ? `${rate}%` : '—'}
          </div>
          <div className="text-[11px] text-ink-3 mt-1">of closed scopes</div>
          <div className="flex gap-3 mt-2">
            <span className="text-[11px] font-medium" style={{ color: '#22C55E' }}>{won} won</span>
            <span className="text-[11px] font-medium" style={{ color: '#EF4444' }}>{lost} lost</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Project type breakdown ───────────────────────────────────

function ProjectTypesCard({ scopes }: { scopes: Scope[] }) {
  const byType = new Map<string, number>()
  scopes.forEach(s => {
    const t = s.projectTypeName ?? 'Untyped'
    byType.set(t, (byType.get(t) ?? 0) + 1)
  })
  const sorted = [...byType.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  const max    = sorted[0]?.[1] ?? 1
  if (!sorted.length) return null

  return (
    <div className="bg-panel border border-line rounded-xl p-4 panel-shadow">
      <p className="text-xs font-semibold text-ink-3 uppercase tracking-widest mb-3">By Project Type</p>
      <div className="space-y-2.5">
        {sorted.map(([name, count]) => (
          <div key={name} className="flex items-center gap-2">
            <span className="text-[11px] text-ink-2 truncate flex-1 min-w-0">{name}</span>
            <div className="w-[72px] h-[5px] bg-panel-hover rounded-full overflow-hidden flex-shrink-0">
              <div
                className="h-full rounded-full"
                style={{ width: `${(count / max) * 100}%`, background: '#F97316' }}
              />
            </div>
            <span className="text-[11px] font-mono text-ink-3 w-4 text-right flex-shrink-0 tabular-nums">
              {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Active intake links ──────────────────────────────────────

function ActiveLinksCard({ links }: { links: IntakeLink[] }) {
  const active = links.filter(l => !l.isDeprecated).slice(0, 5)

  return (
    <div className="bg-panel border border-line rounded-xl p-4 panel-shadow">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-ink-3 uppercase tracking-widest">Intake Links</p>
        <Link href="/intake" className="flex items-center gap-1 text-xs text-orange hover:underline">
          Manage <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      {active.length === 0 ? (
        <div className="text-center py-4">
          <Link2 className="w-5 h-5 text-ink-3 mx-auto mb-1.5" />
          <p className="text-xs text-ink-3">No active links</p>
          <Link href="/intake" className="mt-1 inline-block text-xs text-orange hover:underline">
            Create one
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {active.map(link => (
            <div key={link.id} className="flex items-center gap-2">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: link.usedAt ? '#3B82F6' : '#22C55E' }}
              />
              <span className="text-[12px] text-ink truncate flex-1 min-w-0">
                {link.clientName ?? link.projectTypeName ?? 'Unnamed'}
              </span>
              <span className="text-[10px] text-ink-3 flex-shrink-0 font-mono tabular-nums">
                {formatRelativeTime(link.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user }   = useUser()
  const [scopes, setScopes] = useState<Scope[]>([])
  const [links,  setLinks]  = useState<IntakeLink[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    const [sr, lr] = await Promise.all([
      fetch('/api/scopes').then(r => r.json()),
      fetch('/api/links').then(r => r.json()),
    ])
    setScopes(Array.isArray(sr) ? sr : [])
    setLinks(Array.isArray(lr) ? lr : [])
    setIsLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const firstName = user?.firstName ?? user?.fullName?.split(' ')[0] ?? 'there'

  const won   = scopes.filter(s => s.status === 'won').length
  const lost  = scopes.filter(s => s.status === 'lost').length
  const inReview = scopes.filter(s => s.status === 'in_review').length
  const sent  = scopes.filter(s => s.status === 'sent').length

  const winRate = (won + lost)
    ? Math.round((won / (won + lost)) * 100)
    : null

  const pipelineValue = scopes
    .filter(s => s.status === 'in_review' || s.status === 'sent')
    .reduce((sum, s) => sum + (estimate(s) ?? 0), 0)

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-8 py-8 space-y-4">
        <div className="flex justify-between mb-7">
          <div className="space-y-2">
            <div className="h-3 w-32 bg-panel-hover rounded animate-pulse" />
            <div className="h-6 w-24 bg-panel-hover rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-panel border border-line rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-[1fr_320px] gap-4">
          <div className="space-y-4">
            <div className="h-64 bg-panel border border-line rounded-xl animate-pulse" />
            <div className="h-64 bg-panel border border-line rounded-xl animate-pulse" />
          </div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-panel border border-line rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Empty state ──
  if (scopes.length === 0 && links.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="text-center py-28 bg-panel border border-line rounded-2xl panel-shadow">
          <div className="w-12 h-12 bg-orange-dim border border-orange-border rounded-2xl flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-6 h-6 text-orange" />
          </div>
          <p className="text-ink font-medium">Nothing here yet</p>
          <p className="text-sm text-ink-3 mt-1.5 max-w-xs mx-auto leading-relaxed">
            Create an intake link, send it to a client, and their scope will appear here.
          </p>
          <Link
            href="/intake"
            className="mt-5 inline-flex items-center gap-1.5 bg-orange text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-hover transition-colors"
          >
            Go to Intake Links
          </Link>
        </div>
      </div>
    )
  }

  // ── Full dashboard ──
  return (
    <div className="max-w-6xl mx-auto px-8 py-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <p className="text-[13px] text-ink-3">{timeGreeting()}, {firstName}</p>
          <h1 className="text-[20px] font-semibold text-ink mt-0.5">Overview</h1>
          <p className="text-[13px] text-ink-3 mt-0.5">Your pipeline at a glance</p>
        </div>
        <AIEnginePill />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-5">
        <StatCard label="Total Scopes"    value={scopes.length}                     Icon={FileText}    accent="#71717A" />
        <StatCard label="In Review"       value={inReview}                           Icon={Clock}       accent="#F59E0B" />
        <StatCard label="Sent"            value={sent}                               Icon={Send}        accent="#3B82F6" />
        <StatCard label="Won"             value={won}                                Icon={Trophy}      accent="#22C55E" />
        <StatCard label="Win Rate"        value={winRate != null ? `${winRate}%` : '—'} Icon={Target}  accent="#F97316" />
        <StatCard
          label="Pipeline Value"
          value={fmtMoney(pipelineValue)}
          sub="in review + sent"
          Icon={TrendingUp}
          accent="#8B5CF6"
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">

        {/* Left — calendar + pipeline table */}
        <div className="flex flex-col gap-4 min-w-0">
          <MiniCalendar scopes={scopes} />
          <ScopesTable scopes={scopes} />
        </div>

        {/* Right — cards stack */}
        <div className="flex flex-col gap-4">
          <PipelineCard scopes={scopes} />
          <WinRateCard scopes={scopes} />
          <ProjectTypesCard scopes={scopes} />
          <ActiveLinksCard links={links} />
        </div>

      </div>
    </div>
  )
}
