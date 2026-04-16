'use client'

import { useState, useEffect } from 'react'
import {
  X, Copy, Check, Globe, Palette, ShoppingCart, Smartphone,
  TrendingUp, Share2, Video, Layout, Layers, Megaphone, Briefcase, ChevronLeft,
} from 'lucide-react'
import { DEFAULT_PROJECT_TYPES } from '@/lib/defaults'

interface ProjectType {
  id: string        // empty string = fallback (no DB id)
  name: string
  description?: string | null
}

interface Props {
  open: boolean
  onClose: () => void
}

function getProjectTypeIcon(name: string) {
  const n = name.toLowerCase()
  if (n.includes('web'))                                              return Globe
  if (n.includes('brand'))                                           return Palette
  if (n.includes('e-commerce') || n.includes('commerce'))           return ShoppingCart
  if (n.includes('mobile') || n.includes('app'))                    return Smartphone
  if (n.includes('seo') || n.includes('content'))                   return TrendingUp
  if (n.includes('social'))                                          return Share2
  if (n.includes('video'))                                           return Video
  if (n.includes('ux') || n.includes('ui') || n.includes('design')) return Layout
  if (n.includes('saas') || n.includes('product'))                  return Layers
  if (n.includes('marketing') || n.includes('campaign'))            return Megaphone
  return Briefcase
}

// Accent colors for cards — cycling, theme-aware
const CARD_ACCENTS = [
  'border-orange/30   bg-orange/5   text-orange',
  'border-purple-400/30 bg-purple-400/5 text-purple-500',
  'border-blue-400/30   bg-blue-400/5   text-blue-500',
  'border-green-500/30  bg-green-500/5  text-green-500',
  'border-amber-400/30  bg-amber-400/5  text-amber-500',
  'border-rose-400/30   bg-rose-400/5   text-rose-500',
  'border-teal-400/30   bg-teal-400/5   text-teal-500',
  'border-indigo-400/30 bg-indigo-400/5 text-indigo-500',
  'border-pink-400/30   bg-pink-400/5   text-pink-500',
  'border-cyan-400/30   bg-cyan-400/5   text-cyan-500',
]

type Step = 'template' | 'details' | 'done'

export function CreateLinkModal({ open, onClose }: Props) {
  const [dbTypes, setDbTypes] = useState<ProjectType[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [generatedUrl, setGeneratedUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [step, setStep] = useState<Step>('template')

  useEffect(() => {
    if (!open) return
    fetch('/api/settings/project-types')
      .then((r) => r.json())
      .then((data) => setDbTypes(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [open])

  // Use DB types when available, fall back to built-in defaults (id = '')
  const templates: ProjectType[] = dbTypes.length > 0
    ? dbTypes
    : DEFAULT_PROJECT_TYPES.map((t) => ({ id: '', name: t.name, description: t.description }))

  const usingFallback = dbTypes.length === 0

  async function handleCreate() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // only pass a real DB id; fallback templates behave as general
          projectTypeId: (selectedId && selectedId !== '') ? selectedId : undefined,
          clientName:    clientName  || undefined,
          clientEmail:   clientEmail || undefined,
        }),
      })
      const data = await res.json()
      setGeneratedUrl(data.url)
      setStep('done')
    } catch {
      alert('Failed to create link')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(generatedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleClose() {
    setGeneratedUrl('')
    setClientName('')
    setClientEmail('')
    setSelectedId(null)
    setStep('template')
    onClose()
  }

  if (!open) return null

  const selectedType = selectedId !== null
    ? templates.find((t) => t.id === selectedId) ?? templates.find((t) => t.name === selectedId)
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={handleClose} />
      <div className="relative bg-modal border border-line rounded-2xl modal-shadow w-full max-w-lg mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <div className="flex items-center gap-2.5">
            {step === 'details' && (
              <button
                onClick={() => setStep('template')}
                className="text-ink-3 hover:text-ink-2 mr-1 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="text-sm font-semibold text-ink">
              {step === 'template' && 'Choose a template'}
              {step === 'details' && (selectedType ? selectedType.name : 'General intake')}
              {step === 'done'    && 'Link ready'}
            </h2>
          </div>
          <button onClick={handleClose} className="text-ink-3 hover:text-ink transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Step 1: Template grid ── */}
        {step === 'template' && (
          <div className="p-5">
            <p className="text-xs text-ink-3 mb-4">
              Templates tell the AI what questions to ask and how to structure the scope.
            </p>

            {usingFallback && (
              <div className="mb-3 px-3 py-2 bg-orange-dim border border-orange-border rounded-lg">
                <p className="text-xs text-orange">
                  Showing built-in templates — link your database to save custom ones.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-0.5">
              {/* General option */}
              <button
                onClick={() => { setSelectedId(null); setStep('details') }}
                className="flex items-start gap-3 p-3.5 rounded-xl border border-dashed border-line hover:border-orange/50 hover:bg-orange-dim text-left transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-panel-hover flex items-center justify-center flex-shrink-0 group-hover:bg-orange-dim">
                  <Briefcase className="w-4 h-4 text-ink-3 group-hover:text-orange" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink-2 group-hover:text-ink">General</p>
                  <p className="text-xs text-ink-3 mt-0.5 leading-snug">Open discovery, no template</p>
                </div>
              </button>

              {/* Template cards */}
              {templates.map((pt, i) => {
                const Icon   = getProjectTypeIcon(pt.name)
                const accent = CARD_ACCENTS[i % CARD_ACCENTS.length]
                // accent string is e.g. "border-orange/30 bg-orange/5 text-orange"
                // split so we can apply icon color separately
                const [borderCls, bgCls, iconCls] = accent.split(' ')
                return (
                  <button
                    key={pt.id || pt.name}
                    onClick={() => { setSelectedId(pt.id || pt.name); setStep('details') }}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all hover:scale-[1.01] hover:shadow-sm ${borderCls} ${bgCls}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-panel/60 flex items-center justify-center flex-shrink-0">
                      <Icon className={`w-4 h-4 ${iconCls}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{pt.name}</p>
                      {pt.description && (
                        <p className="text-xs text-ink-3 mt-0.5 leading-snug line-clamp-2">{pt.description}</p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Step 2: Client details ── */}
        {step === 'details' && (
          <div className="p-6 space-y-4">
            {selectedType && (
              <div className="flex items-center gap-2 px-3 py-2 bg-panel-hover border border-line rounded-lg">
                {(() => {
                  const Icon = getProjectTypeIcon(selectedType.name)
                  return <Icon className="w-3.5 h-3.5 text-ink-3 flex-shrink-0" />
                })()}
                <span className="text-xs text-ink-2">{selectedType.name} template selected</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">
                Client Name <span className="text-ink-3 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Acme Corp"
                className="w-full rounded-lg border border-line bg-panel px-3 py-2.5 text-sm text-ink placeholder-ink-3 focus:outline-none focus:ring-2 focus:ring-orange/30 focus:border-orange/50 transition-shadow"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">
                Client Email <span className="text-ink-3 font-normal">(optional)</span>
              </label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="contact@acme.com"
                className="w-full rounded-lg border border-line bg-panel px-3 py-2.5 text-sm text-ink placeholder-ink-3 focus:outline-none focus:ring-2 focus:ring-orange/30 focus:border-orange/50 transition-shadow"
              />
            </div>

            <button
              onClick={handleCreate}
              disabled={isLoading}
              className="w-full bg-orange text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-orange-hover disabled:opacity-50 transition-colors mt-1"
            >
              {isLoading ? 'Creating...' : 'Create Intake Link'}
            </button>
          </div>
        )}

        {/* ── Step 3: Link ready ── */}
        {step === 'done' && (
          <div className="p-6 space-y-4">
            <div className="bg-green-500/10 border border-green-500/25 rounded-xl px-4 py-3">
              <p className="text-sm font-medium text-green-600 dark:text-green-400">Link created</p>
              <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-0.5">
                Share this with your client. It expires in 7 days.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={generatedUrl}
                className="flex-1 rounded-lg border border-line bg-canvas px-3 py-2 text-xs text-ink-2 focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className="flex-shrink-0 flex items-center gap-1.5 bg-orange text-white rounded-lg px-3 py-2 text-xs font-medium hover:bg-orange-hover transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <button
              onClick={handleClose}
              className="w-full border border-line text-ink-2 rounded-lg py-2.5 text-sm font-medium hover:bg-panel-hover transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
