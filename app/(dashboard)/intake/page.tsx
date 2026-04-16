'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Copy, Check, Pencil, Trash2, X, Link2,
  CheckCircle2, Clock, Ban, RotateCcw, RefreshCw,
} from 'lucide-react'
import { CreateLinkModal } from '@/components/dashboard/CreateLinkModal'
import { formatRelativeTime } from '@/lib/utils'

interface IntakeLink {
  id: string
  token: string
  label: string | null
  clientName: string | null
  clientEmail: string | null
  clientCompany: string | null
  projectTypeName: string | null
  engagementType: string | null
  usedAt: string | null
  expiresAt: string | null
  isDeprecated: boolean
  iterationCount: number | null
  latestScopeId: string | null
  createdAt: string
}

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  async function copy(e: React.MouseEvent) {
    e.preventDefault()
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      title="Copy intake link"
      className="flex items-center gap-1 text-xs text-ink-3 hover:text-orange transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function EditModal({ link, onSave, onClose }: {
  link: IntakeLink
  onSave: (id: string, data: Record<string, unknown>) => Promise<void>
  onClose: () => void
}) {
  const [label, setLabel] = useState(link.label ?? '')
  const [clientName, setClientName] = useState(link.clientName ?? '')
  const [clientEmail, setClientEmail] = useState(link.clientEmail ?? '')
  const [clientCompany, setClientCompany] = useState(link.clientCompany ?? '')
  const [saving, setSaving] = useState(false)
  const [emailError, setEmailError] = useState('')

  function validate() {
    if (clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
      setEmailError('Enter a valid email address')
      return false
    }
    setEmailError('')
    return true
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    await onSave(link.id, {
      label: label || null,
      clientName: clientName || null,
      clientEmail: clientEmail || null,
      clientCompany: clientCompany || null,
    })
    setSaving(false)
    onClose()
  }

  const inputCls = 'w-full rounded-lg border border-line bg-panel px-3 py-2.5 text-sm text-ink placeholder-ink-3 focus:outline-none focus:ring-2 focus:ring-orange/30 focus:border-orange/50'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-modal border border-line rounded-2xl modal-shadow w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-ink">Edit Intake Link</h2>
          <button onClick={onClose} className="text-ink-3 hover:text-ink transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-2 mb-1.5">
              Label <span className="text-ink-3 font-normal">(internal)</span>
            </label>
            <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="Q1 discovery — Acme Corp" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">Client Name</label>
              <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Jane Smith" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">Company</label>
              <input type="text" value={clientCompany} onChange={e => setClientCompany(e.target.value)} placeholder="Acme Corp" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-2 mb-1.5">Client Email</label>
            <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="jane@acme.com" className={inputCls} />
            {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
          </div>
          <button onClick={handleSave} disabled={saving}
            className="w-full bg-orange text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-orange-hover disabled:opacity-50 transition-colors">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function displayName(link: IntakeLink): string {
  return link.label || link.clientName || link.clientCompany || 'Untitled link'
}

export default function IntakePage() {
  const [links, setLinks] = useState<IntakeLink[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingLink, setEditingLink] = useState<IntakeLink | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'used' | 'deprecated'>('all')

  const fetchLinks = useCallback(async () => {
    const res = await fetch('/api/links')
    const data = await res.json()
    setLinks(Array.isArray(data) ? data : [])
    setIsLoading(false)
  }, [])

  useEffect(() => { fetchLinks() }, [fetchLinks])
  useEffect(() => { if (!modalOpen) fetchLinks() }, [modalOpen, fetchLinks])

  async function handleEdit(id: string, data: Record<string, unknown>) {
    const res = await fetch(`/api/links/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const updated = await res.json()
    setLinks(prev => prev.map(l => l.id === id ? { ...l, ...updated } as IntakeLink : l))
  }

  async function handleToggleDeprecate(link: IntakeLink) {
    const next = !link.isDeprecated
    await fetch(`/api/links/${link.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDeprecated: next }),
    })
    setLinks(prev => prev.map(l => l.id === link.id ? { ...l, isDeprecated: next } : l))
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault()
    if (!confirm('Delete this intake link? This cannot be undone.')) return
    await fetch(`/api/links/${id}`, { method: 'DELETE' })
    setLinks(prev => prev.filter(l => l.id !== id))
  }

  const filtered = links.filter(l => {
    if (filter === 'active')     return !l.isDeprecated && !l.usedAt
    if (filter === 'used')       return !l.isDeprecated && !!l.usedAt
    if (filter === 'deprecated') return l.isDeprecated
    return true
  })

  const stats = {
    total:      links.length,
    active:     links.filter(l => !l.isDeprecated && !l.usedAt).length,
    used:       links.filter(l => !l.isDeprecated && !!l.usedAt).length,
    deprecated: links.filter(l => l.isDeprecated).length,
  }

  const FILTERS = [
    { key: 'all',        label: 'All',        count: stats.total      },
    { key: 'active',     label: 'Active',     count: stats.active     },
    { key: 'used',       label: 'Used',       count: stats.used       },
    { key: 'deprecated', label: 'Deprecated', count: stats.deprecated },
  ] as const

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-ink">Intake Links</h1>
          <p className="text-sm text-ink-3 mt-0.5">Send links to clients to start the intake conversation</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-orange text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Intake Link
        </button>
      </div>

      {/* Stats */}
      {!isLoading && links.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total',      count: stats.total,      icon: Link2,        accent: 'bg-panel-hover text-ink-2'        },
            { label: 'Active',     count: stats.active,     icon: CheckCircle2, accent: 'bg-green-500/10 text-green-500'   },
            { label: 'Used',       count: stats.used,       icon: Clock,        accent: 'bg-blue-500/10 text-blue-500'     },
            { label: 'Deprecated', count: stats.deprecated, icon: Ban,          accent: 'bg-red-500/10 text-red-500'       },
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

      {/* Filter tabs */}
      {!isLoading && links.length > 0 && (
        <div className="flex items-center gap-1 mb-4 bg-panel border border-line rounded-lg p-1 w-fit">
          {FILTERS.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                filter === key
                  ? 'bg-orange text-white shadow-sm'
                  : 'text-ink-3 hover:text-ink hover:bg-panel-hover'
              }`}
            >
              {label} {count > 0 && <span className="ml-1 opacity-70">{count}</span>}
            </button>
          ))}
        </div>
      )}

      {/* Links list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-panel border border-line rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-panel-hover rounded w-1/3 mb-2" />
              <div className="h-3 bg-panel-hover rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-panel border border-dashed border-line rounded-2xl">
          <Link2 className="w-8 h-8 text-ink-3 mx-auto mb-3" />
          <p className="text-sm font-medium text-ink">
            {filter === 'all' ? 'No intake links yet' : `No ${filter} links`}
          </p>
          {filter === 'all' && (
            <button
              onClick={() => setModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 bg-orange text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-hover transition-colors"
            >
              <Plus className="w-4 h-4" /> Create first link
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(link => {
            const intakeUrl = `${window.location.origin}/intake/${link.token}`
            const isExpired = link.expiresAt ? new Date(link.expiresAt) < new Date() : false
            const iterCount = link.iterationCount ?? 0
            return (
              <div
                key={link.id}
                className={`flex items-center justify-between bg-panel border rounded-xl px-5 py-3.5 group transition-colors ${
                  link.isDeprecated ? 'border-line opacity-60' : 'border-line hover:border-orange/20'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-medium truncate ${link.isDeprecated ? 'text-ink-3 line-through' : 'text-ink'}`}>
                      {displayName(link)}
                    </p>
                    {link.projectTypeName && (
                      <span className="text-[10px] bg-panel-hover border border-line text-ink-3 px-2 py-0.5 rounded-full">
                        {link.projectTypeName}
                      </span>
                    )}
                    {iterCount > 0 && (
                      <span className="text-[10px] bg-panel-hover border border-line text-ink-3 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <RefreshCw className="w-2.5 h-2.5" />
                        {iterCount} {iterCount === 1 ? 'round' : 'rounds'}
                      </span>
                    )}
                    {link.isDeprecated && (
                      <span className="text-[10px] bg-red-500/10 border border-red-500/20 text-red-500 px-2 py-0.5 rounded-full">Deprecated</span>
                    )}
                    {!link.isDeprecated && isExpired && (
                      <span className="text-[10px] bg-red-500/10 border border-red-500/20 text-red-500 px-2 py-0.5 rounded-full">Expired</span>
                    )}
                    {!link.isDeprecated && !isExpired && link.usedAt && (
                      <span className="text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-500 px-2 py-0.5 rounded-full">Used</span>
                    )}
                    {!link.isDeprecated && !isExpired && !link.usedAt && (
                      <span className="text-[10px] bg-green-500/10 border border-green-500/20 text-green-500 px-2 py-0.5 rounded-full">Active</span>
                    )}
                  </div>
                  <p className="text-xs text-ink-3 mt-0.5">
                    {[link.clientEmail, link.clientCompany].filter(Boolean).join(' · ') || 'No contact info'}
                    {' · '}Created {formatRelativeTime(link.createdAt)}
                    {link.usedAt && ` · Last used ${formatRelativeTime(link.usedAt)}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  {!link.isDeprecated && <CopyButton url={intakeUrl} />}
                  <button onClick={() => setEditingLink(link)} className="text-ink-3 hover:text-ink transition-colors" title="Edit">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleToggleDeprecate(link)}
                    className={`transition-colors ${link.isDeprecated ? 'text-ink-3 hover:text-green-500' : 'text-ink-3 hover:text-amber-500'}`}
                    title={link.isDeprecated ? 'Reactivate link' : 'Deprecate link'}
                  >
                    {link.isDeprecated ? <RotateCcw className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={e => handleDelete(e, link.id)} className="text-ink-3 hover:text-red-500 transition-colors" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <CreateLinkModal open={modalOpen} onClose={() => setModalOpen(false)} />
      {editingLink && (
        <EditModal link={editingLink} onSave={handleEdit} onClose={() => setEditingLink(null)} />
      )}
    </div>
  )
}
