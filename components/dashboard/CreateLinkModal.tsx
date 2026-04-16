'use client'

import { useState, useEffect } from 'react'
import {
  X, Copy, Check, Globe, Palette, ShoppingCart, Smartphone,
  TrendingUp, Share2, Video, Layout, Layers, Megaphone, Briefcase, ChevronLeft,
} from 'lucide-react'

interface ProjectType {
  id: string
  name: string
  description?: string | null
}

interface Props {
  open: boolean
  onClose: () => void
}

type Step = 'mode' | 'template' | 'context' | 'done'
type EngagementMode = 'general' | 'template'

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

const CARD_ACCENTS = [
  'border-orange/30   bg-orange/5   text-orange',
  'border-purple-400/30 bg-purple-400/5 text-purple-500',
  'border-blue-400/30   bg-blue-400/5   text-blue-500',
  'border-green-500/30  bg-green-500/5  text-green-500',
  'border-amber-400/30  bg-amber-400/5  text-amber-500',
  'border-rose-400/30   bg-rose-400/5   text-rose-500',
]

function Field({
  label, hint, value, onChange, placeholder, type = 'text', textarea,
}: {
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  textarea?: boolean
}) {
  const cls = 'w-full rounded-lg border border-line bg-panel px-3 py-2.5 text-sm text-ink placeholder-ink-3 focus:outline-none focus:ring-2 focus:ring-orange/30 focus:border-orange/50 transition-shadow'
  return (
    <div>
      <label className="block text-xs font-medium text-ink-2 mb-1">
        {label}
        {hint && <span className="text-ink-3 font-normal ml-1">{hint}</span>}
      </label>
      {textarea ? (
        <textarea
          rows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${cls} resize-none`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cls}
        />
      )}
    </div>
  )
}

export function CreateLinkModal({ open, onClose }: Props) {
  const [step, setStep] = useState<Step>('mode')
  const [mode, setMode] = useState<EngagementMode>('general')
  const [dbTypes, setDbTypes] = useState<ProjectType[]>([])
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null)

  // Client context fields
  const [label, setLabel] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientCompany, setClientCompany] = useState('')
  const [clientWebsite, setClientWebsite] = useState('')
  const [clientIndustry, setClientIndustry] = useState('')
  const [primaryObjective, setPrimaryObjective] = useState('')
  const [budgetContext, setBudgetContext] = useState('')
  const [timelineContext, setTimelineContext] = useState('')
  const [stakeholderContext, setStakeholderContext] = useState('')
  const [technicalContext, setTechnicalContext] = useState('')
  const [mustCapture, setMustCapture] = useState('')
  const [excludedTopics, setExcludedTopics] = useState('')
  const [agencyInstructions, setAgencyInstructions] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [generatedUrl, setGeneratedUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [emailError, setEmailError] = useState('')

  useEffect(() => {
    if (!open) return
    fetch('/api/settings/project-types')
      .then((r) => r.json())
      .then((data) => setDbTypes(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [open])

  const selectedType = dbTypes.find((t) => t.id === selectedTypeId) ?? null

  function handleClose() {
    setStep('mode')
    setMode('general')
    setSelectedTypeId(null)
    setLabel('')
    setClientName('')
    setClientEmail('')
    setClientCompany('')
    setClientWebsite('')
    setClientIndustry('')
    setPrimaryObjective('')
    setBudgetContext('')
    setTimelineContext('')
    setStakeholderContext('')
    setTechnicalContext('')
    setMustCapture('')
    setExcludedTopics('')
    setAgencyInstructions('')
    setShowAdvanced(false)
    setGeneratedUrl('')
    setEmailError('')
    onClose()
  }

  function validateContext(): boolean {
    if (clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
      setEmailError('Enter a valid email address')
      return false
    }
    setEmailError('')
    return true
  }

  async function handleCreate() {
    if (!validateContext()) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engagementType: mode,
          projectTypeId: mode === 'template' && selectedTypeId ? selectedTypeId : undefined,
          label: label || undefined,
          clientName: clientName || undefined,
          clientEmail: clientEmail || undefined,
          clientCompany: clientCompany || undefined,
          clientWebsite: clientWebsite || undefined,
          clientIndustry: clientIndustry || undefined,
          primaryObjective: primaryObjective || undefined,
          budgetContext: budgetContext || undefined,
          timelineContext: timelineContext || undefined,
          stakeholderContext: stakeholderContext || undefined,
          technicalContext: technicalContext || undefined,
          mustCapture: mustCapture || undefined,
          excludedTopics: excludedTopics || undefined,
          agencyInstructions: agencyInstructions || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create link')
      setGeneratedUrl(data.url)
      setStep('done')
    } catch (err) {
      // Inline error — no alert()
      setEmailError(err instanceof Error ? err.message : 'Failed to create link')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(generatedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function getStepTitle() {
    if (step === 'mode') return 'New intake link'
    if (step === 'template') return 'Choose template'
    if (step === 'context') return mode === 'template' && selectedType ? selectedType.name : 'General intake'
    return 'Link ready'
  }

  function canGoBack() {
    return step === 'template' || step === 'context'
  }

  function handleBack() {
    if (step === 'context') {
      setStep(mode === 'template' ? 'template' : 'mode')
    } else if (step === 'template') {
      setStep('mode')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={handleClose} />
      <div className="relative bg-modal border border-line rounded-2xl modal-shadow w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line flex-shrink-0">
          <div className="flex items-center gap-2.5">
            {canGoBack() && (
              <button
                onClick={handleBack}
                className="text-ink-3 hover:text-ink-2 mr-1 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="text-sm font-semibold text-ink">{getStepTitle()}</h2>
          </div>
          <button onClick={handleClose} className="text-ink-3 hover:text-ink transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">

          {/* ── Step 1: Mode selection ── */}
          {step === 'mode' && (
            <div className="p-5 space-y-3">
              <p className="text-xs text-ink-3">
                Choose how to set up this intake link. Both modes use AI — templates focus questions on a specific project type.
              </p>
              <button
                onClick={() => { setMode('general'); setStep('context') }}
                className="w-full flex items-start gap-4 p-4 rounded-xl border border-dashed border-line hover:border-orange/50 hover:bg-orange-dim text-left transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-panel-hover flex items-center justify-center flex-shrink-0 group-hover:bg-orange-dim">
                  <Briefcase className="w-4 h-4 text-ink-3 group-hover:text-orange" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink group-hover:text-ink">General scope</p>
                  <p className="text-xs text-ink-3 mt-0.5 leading-snug">Open discovery — AI adapts to whatever the client describes</p>
                </div>
              </button>
              <button
                onClick={() => { setMode('template'); setStep(dbTypes.length > 0 ? 'template' : 'context') }}
                className="w-full flex items-start gap-4 p-4 rounded-xl border border-line hover:border-orange/30 hover:bg-orange-dim/50 text-left transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-panel-hover flex items-center justify-center flex-shrink-0 group-hover:bg-orange-dim">
                  <Layers className="w-4 h-4 text-ink-3 group-hover:text-orange" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink group-hover:text-ink">Existing template</p>
                  <p className="text-xs text-ink-3 mt-0.5 leading-snug">AI focuses on a specific project type with pre-configured questions</p>
                </div>
              </button>
            </div>
          )}

          {/* ── Step 2: Template selection ── */}
          {step === 'template' && (
            <div className="p-5">
              <p className="text-xs text-ink-3 mb-4">Templates pre-configure the AI's extraction schema and risk checks.</p>
              <div className="grid grid-cols-2 gap-2">
                {dbTypes.map((pt, i) => {
                  const Icon = getProjectTypeIcon(pt.name)
                  const accent = CARD_ACCENTS[i % CARD_ACCENTS.length]
                  const [borderCls, bgCls, iconCls] = accent.split(' ')
                  return (
                    <button
                      key={pt.id}
                      onClick={() => { setSelectedTypeId(pt.id); setStep('context') }}
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

          {/* ── Step 3: Context ── */}
          {step === 'context' && (
            <div className="p-5 space-y-4">
              {mode === 'template' && selectedType && (
                <div className="flex items-center gap-2 px-3 py-2 bg-panel-hover border border-line rounded-lg">
                  {(() => { const Icon = getProjectTypeIcon(selectedType.name); return <Icon className="w-3.5 h-3.5 text-ink-3 flex-shrink-0" /> })()}
                  <span className="text-xs text-ink-2">{selectedType.name} template selected</span>
                </div>
              )}

              {/* Internal label */}
              <Field label="Link label" hint="(internal, optional)" value={label} onChange={setLabel} placeholder="Q1 discovery — Acme Corp" />

              <div className="border-t border-line pt-4">
                <p className="text-xs font-semibold text-ink-3 uppercase tracking-wide mb-3">Client</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Name" hint="(optional)" value={clientName} onChange={setClientName} placeholder="Jane Smith" />
                    <Field label="Company" hint="(optional)" value={clientCompany} onChange={setClientCompany} placeholder="Acme Corp" />
                  </div>
                  <Field label="Email" hint="(optional)" value={clientEmail} onChange={setClientEmail} placeholder="jane@acme.com" type="email" />
                  {emailError && <p className="text-xs text-red-500">{emailError}</p>}
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Website" hint="(optional)" value={clientWebsite} onChange={setClientWebsite} placeholder="acme.com" />
                    <Field label="Industry" hint="(optional)" value={clientIndustry} onChange={setClientIndustry} placeholder="SaaS / Technology" />
                  </div>
                </div>
              </div>

              <div className="border-t border-line pt-4">
                <p className="text-xs font-semibold text-ink-3 uppercase tracking-wide mb-3">Project context</p>
                <p className="text-xs text-ink-3 mb-3">This context is injected into the AI's system prompt — Claude will use it to ask better questions and skip what it already knows.</p>
                <div className="space-y-3">
                  <Field label="Primary objective" hint="(optional)" value={primaryObjective} onChange={setPrimaryObjective} placeholder="Replace legacy customer portal with a modern self-service hub" textarea />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Budget context" hint="(optional)" value={budgetContext} onChange={setBudgetContext} placeholder="$50k–$100k approved" />
                    <Field label="Timeline context" hint="(optional)" value={timelineContext} onChange={setTimelineContext} placeholder="Launch before Q3 2026" />
                  </div>
                  <Field label="Stakeholders" hint="(optional)" value={stakeholderContext} onChange={setStakeholderContext} placeholder="Jane (primary), Tom (CTO — not in this call)" />
                </div>
              </div>

              {/* Advanced — collapsed by default */}
              <div className="border-t border-line pt-3">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-1.5 text-xs text-ink-3 hover:text-ink-2 transition-colors"
                >
                  <span>{showAdvanced ? '▾' : '▸'}</span>
                  Advanced context
                </button>
                {showAdvanced && (
                  <div className="space-y-3 mt-3">
                    <Field label="Technical context" hint="(optional)" value={technicalContext} onChange={setTechnicalContext} placeholder="AWS infrastructure, existing Salesforce CRM, Node.js stack" textarea />
                    <Field label="Must capture" hint="(optional)" value={mustCapture} onChange={setMustCapture} placeholder="Security / compliance requirements (SOC 2)" textarea />
                    <Field label="Excluded topics" hint="(optional)" value={excludedTopics} onChange={setExcludedTopics} placeholder="Mobile app — separate budget and timeline" textarea />
                    <Field label="Agency instructions" hint="(internal only, not shown to client)" value={agencyInstructions} onChange={setAgencyInstructions} placeholder="Push back on tight timelines, they've underscoped before" textarea />
                  </div>
                )}
              </div>

              <button
                onClick={handleCreate}
                disabled={isLoading}
                className="w-full bg-orange text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-orange-hover disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Creating...' : 'Create intake link'}
              </button>
            </div>
          )}

          {/* ── Step 4: Done ── */}
          {step === 'done' && (
            <div className="p-6 space-y-4">
              <div className="bg-green-500/10 border border-green-500/25 rounded-xl px-4 py-3">
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Link created</p>
                <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-0.5">
                  Reusable — stays active until you deprecate or delete it.
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
    </div>
  )
}
