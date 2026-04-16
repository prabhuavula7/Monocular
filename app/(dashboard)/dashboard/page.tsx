'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, FileText, TrendingUp, CheckCircle2, Clock, Send, XCircle } from 'lucide-react'
import { ScopeStatusBadge } from '@/components/dashboard/ScopeStatusBadge'
import { CreateLinkModal } from '@/components/dashboard/CreateLinkModal'
import { formatRelativeTime } from '@/lib/utils'

interface Scope {
  id: string
  clientName: string | null
  clientEmail: string | null
  status: 'draft' | 'in_review' | 'sent' | 'won' | 'lost'
  createdAt: string
  generatedScope: { executiveSummary?: string } | null
  projectTypeName: string | null
}

const STATUS_LEFT_BORDER: Record<string, string> = {
  draft: 'border-l-gray-300',
  in_review: 'border-l-amber-400',
  sent: 'border-l-blue-400',
  won: 'border-l-green-500',
  lost: 'border-l-red-300',
}

function StatCard({
  label,
  count,
  icon: Icon,
  color,
}: {
  label: string
  count: number
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-lg font-semibold text-gray-900 leading-none">{count}</p>
        <p className="text-xs text-gray-400 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [scopes, setScopes] = useState<Scope[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    fetch('/api/scopes')
      .then((r) => r.json())
      .then((data) => {
        setScopes(Array.isArray(data) ? data : [])
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [modalOpen])

  const stats = {
    total: scopes.length,
    inReview: scopes.filter((s) => s.status === 'in_review').length,
    sent: scopes.filter((s) => s.status === 'sent').length,
    won: scopes.filter((s) => s.status === 'won').length,
    lost: scopes.filter((s) => s.status === 'lost').length,
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Scopes</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Intake links, AI-generated project scopes, and pipeline status
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Intake Link
        </button>
      </div>

      {/* Stats strip */}
      {!isLoading && scopes.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total" count={stats.total} icon={FileText} color="bg-gray-100 text-gray-600" />
          <StatCard label="In Review" count={stats.inReview} icon={Clock} color="bg-amber-50 text-amber-600" />
          <StatCard label="Sent" count={stats.sent} icon={Send} color="bg-blue-50 text-blue-600" />
          <StatCard label="Won" count={stats.won} icon={CheckCircle2} color="bg-green-50 text-green-600" />
        </div>
      )}

      {/* Scope list */}
      {isLoading ? (
        <div className="space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : scopes.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-2xl border border-gray-100">
          <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-6 h-6 text-orange-500" />
          </div>
          <p className="text-gray-800 font-medium">No scopes yet</p>
          <p className="text-sm text-gray-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
            Create an intake link, send it to a client, and their project scope will appear here automatically.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-5 inline-flex items-center gap-1.5 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create first intake link
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {scopes.map((scope) => (
            <Link
              key={scope.id}
              href={`/scopes/${scope.id}`}
              className={`flex items-center justify-between bg-white rounded-xl border border-l-4 border-gray-100 px-5 py-4 hover:shadow-sm transition-all ${STATUS_LEFT_BORDER[scope.status]}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {scope.clientName ?? 'Anonymous client'}
                  </p>
                  {scope.projectTypeName && (
                    <span className="flex-shrink-0 text-[10px] font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {scope.projectTypeName}
                    </span>
                  )}
                </div>
                {scope.generatedScope?.executiveSummary ? (
                  <p className="text-xs text-gray-400 truncate max-w-lg">
                    {scope.generatedScope.executiveSummary}
                  </p>
                ) : (
                  <p className="text-xs text-gray-300 italic">Generating scope...</p>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                <ScopeStatusBadge status={scope.status} />
                <span className="text-xs text-gray-400 hidden sm:block">
                  {formatRelativeTime(scope.createdAt)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <CreateLinkModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
