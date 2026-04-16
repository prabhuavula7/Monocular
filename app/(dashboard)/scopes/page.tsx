'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { FileText, TrendingUp, CheckCircle2, Clock, Send, Search } from 'lucide-react'
import { ScopeStatusBadge } from '@/components/dashboard/ScopeStatusBadge'
import { formatRelativeTime } from '@/lib/utils'

interface Scope {
  id: string
  name: string | null
  clientName: string | null
  clientEmail: string | null
  status: 'draft' | 'in_review' | 'sent' | 'won' | 'lost'
  createdAt: string
  generatedScope: { executiveSummary?: string } | null
  projectTypeName: string | null
  intakeLinkId: string | null
}

interface ScopeGroup {
  key: string
  latest: Scope
  history: Scope[]  // older versions, asc by date
}

const STATUS_ACCENT: Record<string, string> = {
  draft:     'border-l-zinc-400',
  in_review: 'border-l-amber-400',
  sent:      'border-l-blue-400',
  won:       'border-l-green-500',
  lost:      'border-l-red-400',
}

const STATUS_FILTERS = [
  { key: 'all',       label: 'All'       },
  { key: 'draft',     label: 'Draft'     },
  { key: 'in_review', label: 'In Review' },
  { key: 'sent',      label: 'Sent'      },
  { key: 'won',       label: 'Won'       },
  { key: 'lost',      label: 'Lost'      },
] as const

function groupScopes(scopes: Scope[]): ScopeGroup[] {
  const map = new Map<string, Scope[]>()

  for (const scope of scopes) {
    // Scopes without a link are their own group
    const key = scope.intakeLinkId ?? `solo:${scope.id}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(scope)
  }

  const groups: ScopeGroup[] = []
  for (const [key, members] of map.entries()) {
    const sorted = [...members].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    groups.push({
      key,
      latest: sorted[sorted.length - 1],
      history: sorted.slice(0, -1),
    })
  }

  // Sort groups by their latest scope's createdAt descending
  return groups.sort(
    (a, b) => new Date(b.latest.createdAt).getTime() - new Date(a.latest.createdAt).getTime()
  )
}

export default function ScopesPage() {
  const [scopes, setScopes] = useState<Scope[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const fetchScopes = useCallback(async () => {
    const res = await fetch('/api/scopes')
    const data = await res.json()
    setScopes(Array.isArray(data) ? data : [])
    setIsLoading(false)
  }, [])

  useEffect(() => { fetchScopes() }, [fetchScopes])

  // Poll while any scope is still generating
  useEffect(() => {
    const hasGenerating = scopes.some(s => !s.generatedScope?.executiveSummary)
    if (!hasGenerating) return
    const interval = setInterval(fetchScopes, 5000)
    return () => clearInterval(interval)
  }, [scopes, fetchScopes])

  const stats = {
    total:    scopes.length,
    inReview: scopes.filter(s => s.status === 'in_review').length,
    sent:     scopes.filter(s => s.status === 'sent').length,
    won:      scopes.filter(s => s.status === 'won').length,
  }

  const matchesSearch = (s: Scope) =>
    !search ||
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.clientName?.toLowerCase().includes(search.toLowerCase()) ||
    s.clientEmail?.toLowerCase().includes(search.toLowerCase()) ||
    s.projectTypeName?.toLowerCase().includes(search.toLowerCase())

  // Filter individual scopes first, then group
  const filtered = scopes.filter(s => {
    const matchStatus = statusFilter === 'all' || s.status === statusFilter
    return matchStatus && matchesSearch(s)
  })

  const groups = groupScopes(filtered)

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-ink">Scopes</h1>
          <p className="text-sm text-ink-3 mt-0.5">AI-generated project scopes from client intake sessions</p>
        </div>
      </div>

      {/* Stats */}
      {!isLoading && scopes.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total',     count: stats.total,    icon: FileText,     accent: 'bg-panel-hover text-ink-2'        },
            { label: 'In Review', count: stats.inReview, icon: Clock,        accent: 'bg-amber-500/10 text-amber-500'   },
            { label: 'Sent',      count: stats.sent,     icon: Send,         accent: 'bg-blue-500/10 text-blue-500'     },
            { label: 'Won',       count: stats.won,      icon: CheckCircle2, accent: 'bg-green-500/10 text-green-500'   },
          ].map(({ label, count, icon: Icon, accent }) => (
            <div key={label} className="bg-panel border border-line rounded-xl px-4 py-3 flex items-center gap-3 panel-shadow">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-base font-semibold text-ink leading-none">{count}</p>
                <p className="text-xs text-ink-3 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters + search */}
      {!isLoading && scopes.length > 0 && (
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-1 bg-panel border border-line rounded-lg p-1">
            {STATUS_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  statusFilter === key
                    ? 'bg-orange text-white shadow-sm'
                    : 'text-ink-3 hover:text-ink hover:bg-panel-hover'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-[180px] bg-panel border border-line rounded-lg px-3 py-2">
            <Search className="w-3.5 h-3.5 text-ink-3 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by client or type..."
              className="flex-1 text-xs bg-transparent text-ink placeholder-ink-3 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Scopes list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-panel border border-line rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-panel-hover rounded w-1/3 mb-2" />
              <div className="h-3 bg-panel-hover rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : groups.length === 0 && scopes.length === 0 ? (
        <div className="text-center py-24 bg-panel border border-line rounded-2xl panel-shadow">
          <div className="w-12 h-12 bg-orange-dim border border-orange-border rounded-2xl flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-6 h-6 text-orange" />
          </div>
          <p className="text-ink font-medium">No scopes yet</p>
          <p className="text-sm text-ink-3 mt-1.5 max-w-xs mx-auto leading-relaxed">
            Scopes appear here once a client completes the intake conversation.
          </p>
          <Link
            href="/intake"
            className="mt-5 inline-flex items-center gap-1.5 bg-orange text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-hover transition-colors"
          >
            Go to Intake Links
          </Link>
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 bg-panel border border-line rounded-2xl">
          <p className="text-sm text-ink-3">No scopes match this filter.</p>
          <button
            onClick={() => { setStatusFilter('all'); setSearch('') }}
            className="mt-2 text-xs text-orange hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map(({ key, latest, history }) => (
            <div key={key} className={`bg-panel border border-l-4 border-line rounded-xl panel-shadow overflow-hidden ${STATUS_ACCENT[latest.status]}`}>

              {/* Latest version — main row */}
              <Link
                href={`/scopes/${latest.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-panel-hover transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink truncate">
                    {latest.name ?? latest.clientName ?? 'Untitled scope'}
                  </p>
                  {latest.generatedScope?.executiveSummary ? (
                    <p className="text-xs text-ink-3 truncate max-w-lg mt-0.5">
                      {latest.generatedScope.executiveSummary}
                    </p>
                  ) : (
                    <p className="text-xs text-ink-3 italic mt-0.5">Generating scope…</p>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  <ScopeStatusBadge status={latest.status} />
                  <span className="text-xs text-ink-3 hidden sm:block">{formatRelativeTime(latest.createdAt)}</span>
                </div>
              </Link>

              {/* Previous versions strip */}
              {history.length > 0 && (
                <div className="flex items-center gap-2 px-5 py-2 border-t border-line bg-canvas">
                  <span className="text-[10px] text-ink-3 uppercase tracking-wide flex-shrink-0">Earlier</span>
                  {history.map((v, i) => (
                    <Link
                      key={v.id}
                      href={`/scopes/${v.id}`}
                      className="flex items-center gap-1.5 text-[11px] text-ink-3 hover:text-ink transition-colors"
                    >
                      <span className="font-medium">v{i + 1}</span>
                      <ScopeStatusBadge status={v.status} />
                      <span className="text-ink-3">{formatRelativeTime(v.createdAt)}</span>
                      {i < history.length - 1 && <span className="text-line ml-1">·</span>}
                    </Link>
                  ))}
                </div>
              )}

            </div>
          ))}
        </div>
      )}
    </div>
  )
}
