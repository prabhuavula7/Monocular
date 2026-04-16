'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  FileText, TrendingUp, CheckCircle2, Clock,
  Send, Link2, ArrowRight,
} from 'lucide-react'
import { ScopeStatusBadge } from '@/components/dashboard/ScopeStatusBadge'
import { formatRelativeTime } from '@/lib/utils'

interface Scope {
  id: string
  clientName: string | null
  status: 'draft' | 'in_review' | 'sent' | 'won' | 'lost'
  createdAt: string
  generatedScope: { executiveSummary?: string } | null
  projectTypeName: string | null
}

interface IntakeLink {
  id: string
  token: string
  clientName: string | null
  projectTypeName: string | null
  usedAt: string | null
  isDeprecated: boolean
  createdAt: string
}

const STATUS_ACCENT: Record<string, string> = {
  draft:     'border-l-zinc-400',
  in_review: 'border-l-amber-400',
  sent:      'border-l-blue-400',
  won:       'border-l-green-500',
  lost:      'border-l-red-400',
}

function StatCard({ label, count, icon: Icon, accent }: {
  label: string; count: number; icon: React.ElementType; accent: string
}) {
  return (
    <div className="bg-panel border border-line rounded-xl px-4 py-3 flex items-center gap-3 panel-shadow">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-base font-semibold text-ink leading-none">{count}</p>
        <p className="text-xs text-ink-3 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [scopes, setScopes] = useState<Scope[]>([])
  const [links, setLinks] = useState<IntakeLink[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    const [scopesRes, linksRes] = await Promise.all([
      fetch('/api/scopes').then(r => r.json()),
      fetch('/api/links').then(r => r.json()),
    ])
    setScopes(Array.isArray(scopesRes) ? scopesRes : [])
    setLinks(Array.isArray(linksRes) ? linksRes : [])
    setIsLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const stats = {
    totalScopes: scopes.length,
    inReview:    scopes.filter(s => s.status === 'in_review').length,
    sent:        scopes.filter(s => s.status === 'sent').length,
    won:         scopes.filter(s => s.status === 'won').length,
    activeLinks: links.filter(l => !l.isDeprecated && !l.usedAt).length,
  }

  const recentScopes  = scopes.slice(0, 5)
  const activeLinks   = links.filter(l => !l.isDeprecated).slice(0, 3)

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink">Overview</h1>
        <p className="text-sm text-ink-3 mt-0.5">Pipeline summary and recent activity</p>
      </div>

      {/* Stats */}
      {!isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <StatCard label="Total Scopes"  count={stats.totalScopes} icon={FileText}     accent="bg-panel-hover text-ink-2"        />
          <StatCard label="In Review"     count={stats.inReview}    icon={Clock}        accent="bg-amber-500/10 text-amber-500"   />
          <StatCard label="Sent"          count={stats.sent}        icon={Send}         accent="bg-blue-500/10 text-blue-500"     />
          <StatCard label="Won"           count={stats.won}         icon={CheckCircle2} accent="bg-green-500/10 text-green-500"   />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-panel border border-line rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-panel-hover rounded w-1/3 mb-2" />
              <div className="h-3 bg-panel-hover rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : scopes.length === 0 && links.length === 0 ? (
        <div className="text-center py-24 bg-panel border border-line rounded-2xl panel-shadow">
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
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recent scopes */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-ink-3 uppercase tracking-widest">Recent Scopes</p>
              <Link href="/scopes" className="flex items-center gap-1 text-xs text-orange hover:underline">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {recentScopes.length === 0 ? (
              <div className="bg-panel border border-dashed border-line rounded-xl px-5 py-8 text-center">
                <p className="text-sm text-ink-3">No scopes yet — scopes appear after a client completes the intake.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentScopes.map(scope => (
                  <Link
                    key={scope.id}
                    href={`/scopes/${scope.id}`}
                    className={`flex items-center justify-between bg-panel border border-l-4 border-line rounded-xl px-4 py-3 hover:bg-panel-hover transition-colors panel-shadow ${STATUS_ACCENT[scope.status]}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink truncate">
                        {scope.clientName ?? 'Anonymous client'}
                        {scope.projectTypeName && (
                          <span className="ml-2 text-[10px] font-normal bg-panel-hover border border-line text-ink-3 px-2 py-0.5 rounded-full">
                            {scope.projectTypeName}
                          </span>
                        )}
                      </p>
                      {scope.generatedScope?.executiveSummary ? (
                        <p className="text-xs text-ink-3 truncate mt-0.5">{scope.generatedScope.executiveSummary}</p>
                      ) : (
                        <p className="text-xs text-ink-3 italic mt-0.5">Generating...</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <ScopeStatusBadge status={scope.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Active intake links */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-ink-3 uppercase tracking-widest">Active Links</p>
              <Link href="/intake" className="flex items-center gap-1 text-xs text-orange hover:underline">
                Manage <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {activeLinks.length === 0 ? (
              <div className="bg-panel border border-dashed border-line rounded-xl px-4 py-8 text-center">
                <Link2 className="w-6 h-6 text-ink-3 mx-auto mb-2" />
                <p className="text-xs text-ink-3">No active intake links.</p>
                <Link href="/intake" className="mt-2 inline-block text-xs text-orange hover:underline">Create one</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {activeLinks.map(link => (
                  <div key={link.id} className="bg-panel border border-dashed border-line rounded-xl px-4 py-3">
                    <p className="text-sm font-medium text-ink truncate">{link.clientName ?? 'No name'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {link.projectTypeName && (
                        <span className="text-[10px] text-ink-3">{link.projectTypeName}</span>
                      )}
                      <span className="text-[10px] text-ink-3">·</span>
                      <span className="text-[10px] text-ink-3">{formatRelativeTime(link.createdAt)}</span>
                      {!link.usedAt && (
                        <span className="text-[10px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded-full">Active</span>
                      )}
                    </div>
                  </div>
                ))}
                {links.filter(l => !l.isDeprecated).length > 3 && (
                  <Link href="/intake" className="block text-center text-xs text-ink-3 hover:text-orange py-1 transition-colors">
                    +{links.filter(l => !l.isDeprecated).length - 3} more
                  </Link>
                )}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
