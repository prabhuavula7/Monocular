'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Download, AlertTriangle, CheckCircle } from 'lucide-react'
import { ScopeStatusBadge } from '@/components/dashboard/ScopeStatusBadge'
import { Badge } from '@/components/ui/Badge'
import type { GeneratedScope, Message, RiskFlag } from '@/types'

type Status = 'draft' | 'in_review' | 'sent' | 'won' | 'lost'

interface Scope {
  id: string
  status: Status
  clientName: string | null
  clientEmail: string | null
  transcript: Message[]
  generatedScope: GeneratedScope | null
  agencyNotes: string | null
  pdfUrl: string | null
  createdAt: Date | string | null
}

interface Props {
  scope: Scope
  agencyName: string
}

const CONFIDENCE_CONFIG = {
  high:   { label: 'Complete intake',                    variant: 'green' as const },
  medium: { label: 'Some gaps — review assumptions',     variant: 'amber' as const },
  low:    { label: 'Short intake — significant gaps',    variant: 'red'   as const },
}

function useAutoSave(scopeId: string) {
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback(async (patch: Record<string, unknown>) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setSaveState('saving')

    timerRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/scopes/${scopeId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        })
        setSaveState('saved')
        setTimeout(() => setSaveState('idle'), 2000)
      } catch {
        setSaveState('idle')
      }
    }, 600)
  }, [scopeId])

  return { save, saveState }
}

export default function ScopeEditorClient({ scope, agencyName }: Props) {
  const router = useRouter()
  const { save, saveState } = useAutoSave(scope.id)

  const [status, setStatus] = useState<Status>(scope.status)
  const [generated, setGenerated] = useState<GeneratedScope | null>(scope.generatedScope)
  const [isExporting, setIsExporting] = useState(false)
  const [reviewDismissed, setReviewDismissed] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)

  // Poll for generated scope every 4s until it appears
  useEffect(() => {
    if (generated) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/scopes/${scope.id}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.generatedScope) {
          setGenerated(data.generatedScope as GeneratedScope)
        }
      } catch {}
    }, 4000)
    return () => clearInterval(interval)
  }, [scope.id, generated])

  async function handleRetryGenerate() {
    setIsRetrying(true)
    try {
      const res = await fetch(`/api/scopes/${scope.id}/generate`, { method: 'POST' })
      const data = await res.json()
      if (data.generatedScope) setGenerated(data.generatedScope as GeneratedScope)
    } catch {}
    setIsRetrying(false)
  }

  const showReviewBanner =
    !reviewDismissed &&
    generated?.requiresHumanReview &&
    (generated.reviewFlags?.length ?? 0) > 0

  async function handleStatusChange(newStatus: Status) {
    setStatus(newStatus)
    await save({ status: newStatus })
  }

  async function handleFieldSave(path: string, value: unknown) {
    if (!generated) return
    const updatedScope = { ...generated, [path]: value }
    setGenerated(updatedScope as GeneratedScope)
    await save({ generatedScope: updatedScope })
  }

  async function handleExportPdf() {
    setIsExporting(true)
    try {
      const res = await fetch(`/api/scopes/${scope.id}/export`, { method: 'POST' })
      const data = await res.json()
      if (data.url) window.open(data.url, '_blank')
    } catch {
      alert('PDF export failed. Try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const transcript = scope.transcript as Message[]

  if (!generated) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-ink-2 hover:text-ink mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="bg-panel border border-line rounded-2xl p-12 text-center panel-shadow">
          <div className="w-8 h-8 border-2 border-line border-t-orange rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-ink">Generating scope...</p>
          <p className="text-xs text-ink-3 mt-1.5">Checking automatically every few seconds.</p>
          <button
            onClick={handleRetryGenerate}
            disabled={isRetrying}
            className="mt-5 text-xs text-ink-3 hover:text-orange underline underline-offset-2 transition-colors disabled:opacity-50"
          >
            {isRetrying ? 'Generating...' : 'Taking too long? Click to retry'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">

      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-ink-2 hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center gap-3">
          {saveState === 'saving' && (
            <span className="text-xs text-ink-3">Saving...</span>
          )}
          {saveState === 'saved' && (
            <span className="text-xs text-green-500 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Saved
            </span>
          )}

          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value as Status)}
            className="text-sm border border-line bg-panel text-ink rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange/40 transition-shadow"
          >
            <option value="draft">Draft</option>
            <option value="in_review">In Review</option>
            <option value="sent">Sent</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>

          <ScopeStatusBadge status={status} />

          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="flex items-center gap-1.5 bg-ink text-canvas px-3 py-1.5 rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-40 transition-opacity"
          >
            <Download className="w-3.5 h-3.5" />
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* Review banner */}
      {showReviewBanner && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3 mb-6 flex items-start justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Review required before sending</p>
              <ul className="mt-1 space-y-0.5">
                {generated.reviewFlags.map((flag) => (
                  <li key={flag.id} className="text-xs text-amber-600/80 dark:text-amber-400/80">
                    • {flag.message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <button
            onClick={() => setReviewDismissed(true)}
            className="text-xs text-amber-500 hover:text-amber-400 flex-shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Client header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-ink">
            {scope.clientName ?? 'Anonymous client'}
          </h1>
          {scope.clientEmail && (
            <p className="text-sm text-ink-3">{scope.clientEmail}</p>
          )}
        </div>
        {generated.confidence && (
          <Badge variant={CONFIDENCE_CONFIG[generated.confidence].variant}>
            {CONFIDENCE_CONFIG[generated.confidence].label}
          </Badge>
        )}
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-5 gap-5">

        {/* Left: Scope editor 3/5 */}
        <div className="col-span-3 space-y-4">

          <ScopeSection title="Executive Summary">
            <EditableText
              value={generated.executiveSummary}
              onSave={(v) => handleFieldSave('executiveSummary', v)}
              multiline
            />
          </ScopeSection>

          <ScopeSection title="Deliverables">
            <div className="space-y-2">
              {generated.deliverables.map((d) => (
                <div key={d.id} className="border border-line rounded-lg p-3">
                  <p className="text-sm font-medium text-ink">{d.title}</p>
                  <p className="text-xs text-ink-2 mt-0.5">{d.description}</p>
                  <span className="text-xs text-ink-3 mt-1 inline-block">{d.phase}</span>
                </div>
              ))}
            </div>
          </ScopeSection>

          <ScopeSection title="Milestones">
            <div className="space-y-1">
              {generated.milestones
                .sort((a, b) => a.order - b.order)
                .map((m) => (
                  <div key={m.id} className="flex items-center gap-3 py-2 border-b border-line-faint last:border-0">
                    <span className="text-xs bg-panel-hover text-ink-2 rounded px-2 py-0.5 font-medium flex-shrink-0 border border-line">
                      {m.duration}
                    </span>
                    <span className="text-sm text-ink">{m.name}</span>
                  </div>
                ))}
            </div>
          </ScopeSection>

          {generated.outOfScope.length > 0 && (
            <ScopeSection title="Out of Scope">
              <ul className="space-y-1.5">
                {generated.outOfScope.map((item, i) => (
                  <li key={i} className="text-sm text-ink-2 flex items-start gap-2">
                    <span className="text-ink-3 mt-0.5 flex-shrink-0">—</span>
                    {item}
                  </li>
                ))}
              </ul>
            </ScopeSection>
          )}

          {generated.riskFlags.length > 0 && (
            <ScopeSection title="Risk Flags">
              <div className="space-y-2">
                {generated.riskFlags.map((r: RiskFlag) => (
                  <div key={r.id} className="flex items-start gap-2.5 p-3 rounded-lg border border-line">
                    <Badge variant={r.severity === 'high' ? 'red' : r.severity === 'medium' ? 'amber' : 'gray'}>
                      {r.severity}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium text-ink">{r.title}</p>
                      <p className="text-xs text-ink-2 mt-0.5">{r.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScopeSection>
          )}

          <ScopeSection title="Investment Estimate">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-ink-3 mb-1">Low</p>
                <p className="text-lg font-semibold text-ink">
                  {generated.pricingEstimate.currency}
                  {generated.pricingEstimate.low.toLocaleString()}
                </p>
              </div>
              <span className="text-ink-3">—</span>
              <div>
                <p className="text-xs text-ink-3 mb-1">High</p>
                <p className="text-lg font-semibold text-ink">
                  {generated.pricingEstimate.currency}
                  {generated.pricingEstimate.high.toLocaleString()}
                </p>
              </div>
              {generated.pricingEstimate.clamped && (
                <Badge variant="amber">Adjusted</Badge>
              )}
            </div>
            {generated.pricingEstimate.notes && (
              <p className="text-xs text-ink-2 mt-2">{generated.pricingEstimate.notes}</p>
            )}
            <p className="text-[11px] text-ink-3 mt-3 italic">
              Indicative estimate based on intake responses. Final pricing subject to detailed review.
            </p>
          </ScopeSection>

          {generated.assumptions.length > 0 && (
            <ScopeSection title="Assumptions">
              <ul className="space-y-1.5">
                {generated.assumptions.map((a, i) => (
                  <li key={i} className="text-sm text-ink-2 flex items-start gap-2">
                    <span className="text-orange flex-shrink-0 mt-0.5">•</span>
                    {a}
                  </li>
                ))}
              </ul>
            </ScopeSection>
          )}
        </div>

        {/* Right: Transcript 2/5 */}
        <div className="col-span-2">
          <div className="bg-panel border border-line rounded-2xl p-4 sticky top-6 max-h-[80vh] overflow-y-auto panel-shadow">
            <p className="text-[10px] font-semibold text-ink-3 uppercase tracking-widest mb-4">
              Intake Transcript
            </p>
            <div className="space-y-2.5">
              {transcript.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-ink text-canvas'
                        : 'bg-panel-hover text-ink-2 border border-line'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ScopeSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-panel border border-line rounded-2xl p-5 panel-shadow">
      <h3 className="text-[10px] font-semibold text-ink-3 uppercase tracking-widest mb-4">{title}</h3>
      {children}
    </div>
  )
}

function EditableText({
  value,
  onSave,
  multiline = false,
}: {
  value: string
  onSave: (v: string) => void
  multiline?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  function handleBlur() {
    setEditing(false)
    if (draft !== value) onSave(draft)
  }

  if (editing) {
    return multiline ? (
      <textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        className="w-full text-sm text-ink leading-relaxed bg-canvas border border-line rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange/40 resize-none"
        rows={4}
      />
    ) : (
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        className="w-full text-sm text-ink bg-canvas border border-line rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange/40"
      />
    )
  }

  return (
    <p
      className="text-sm text-ink leading-relaxed cursor-text hover:bg-panel-hover rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors"
      onClick={() => { setDraft(value); setEditing(true) }}
      title="Click to edit"
    >
      {value}
    </p>
  )
}
