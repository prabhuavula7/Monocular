'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, ChevronLeft } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

interface ProjectType {
  id: string
  name: string
  milestonePattern: string[]
  isActive: boolean
}

export default function ProjectTypesPage() {
  const [types, setTypes] = useState<ProjectType[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/settings/project-types')
      .then((r) => r.json())
      .then((data) => { setTypes(Array.isArray(data) ? data : []); setIsLoading(false) })
      .catch(() => setIsLoading(false))
  }, [])

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/settings/project-types/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !current }),
    })
    setTypes((prev) => prev.map((t) => t.id === id ? { ...t, isActive: !current } : t))
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this project type?')) return
    await fetch(`/api/settings/project-types/${id}`, { method: 'DELETE' })
    setTypes((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/settings" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Project Types</h1>
      </div>

      <div className="space-y-2 mb-4">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse h-16" />
          ))
        ) : types.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No project types yet.</p>
        ) : (
          types.map((pt) => (
            <div
              key={pt.id}
              className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-5 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{pt.name}</p>
                  {!pt.isActive && <Badge variant="gray">Inactive</Badge>}
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {pt.milestonePattern.map((phase) => (
                    <span key={phase} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                      {phase}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                <button
                  onClick={() => toggleActive(pt.id, pt.isActive)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  {pt.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <Link
                  href={`/settings/project-types/${pt.id}`}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(pt.id)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Link
        href="/settings/project-types/new"
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 border border-dashed border-gray-200 rounded-xl px-5 py-3 hover:border-gray-300 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add project type
      </Link>
    </div>
  )
}
