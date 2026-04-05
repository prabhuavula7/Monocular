'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, FileText } from 'lucide-react'
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
  }, [modalOpen]) // refetch after modal closes (new link created → scope incoming)

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Scopes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {scopes.length} scope{scopes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Intake Link
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : scopes.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No scopes yet</p>
          <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
            Create an intake link and send it to a client. When they complete it, their scope will appear here.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-4 text-sm text-orange-500 underline underline-offset-2"
          >
            Create your first intake link
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {scopes.map((scope) => (
            <Link
              key={scope.id}
              href={`/scopes/${scope.id}`}
              className="block bg-white rounded-xl border border-gray-100 px-5 py-4 hover:border-gray-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {scope.clientName ?? 'Anonymous client'}
                  </p>
                  {scope.generatedScope?.executiveSummary ? (
                    <p className="text-xs text-gray-400 mt-0.5 truncate max-w-lg">
                      {scope.generatedScope.executiveSummary}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-0.5">Generating scope...</p>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  <ScopeStatusBadge status={scope.status} />
                  <span className="text-xs text-gray-400">
                    {formatRelativeTime(scope.createdAt)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <CreateLinkModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
