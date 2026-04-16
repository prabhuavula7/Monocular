'use client'

import { useState } from 'react'
import { CheckCircle, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'
import type { GeneratedScope } from '@/types'

interface Props {
  token: string
  scope: {
    id: string
    name: string | null
    clientName: string | null
    generatedScope: GeneratedScope
    createdAt: string | Date | null
  }
  agencyName: string
  intakeLinkToken: string | null
}

type Stage = 'idle' | 'requesting_changes' | 'approved' | 'changes_requested'

const RISK_COLORS: Record<string, string> = {
  high:   'text-red-600 bg-red-500/8 border-red-500/20',
  medium: 'text-amber-600 bg-amber-500/8 border-amber-500/20',
  low:    'text-zinc-500 bg-zinc-500/8 border-zinc-500/20',
}

export default function ReviewClient({ token, scope, agencyName, intakeLinkToken }: Props) {
  const g = scope.generatedScope
  const [stage, setStage] = useState<Stage>('idle')
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [milestonesOpen, setMilestonesOpen] = useState(false)

  const date = scope.createdAt
    ? new Date(scope.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  const sortedMilestones = [...g.milestones].sort((a, b) => a.order - b.order)

  async function handleApprove() {
    setLoading(true)
    await fetch(`/api/review/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    })
    setLoading(false)
    setStage('approved')
  }

  async function handleRequestChanges() {
    setLoading(true)
    const res = await fetch(`/api/review/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'request_changes', feedback }),
    })
    const data = await res.json()
    setLoading(false)
    setStage('changes_requested')
    if (data.intakeLinkToken) {
      setTimeout(() => {
        window.location.href = `/intake/${data.intakeLinkToken}`
      }, 2000)
    }
  }

  if (stage === 'approved') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-7 h-7 text-green-500" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Scope approved</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Thank you — {agencyName} has been notified and will be in touch shortly.
          </p>
        </div>
      </div>
    )
  }

  if (stage === 'changes_requested') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-5">
            <RotateCcw className="w-7 h-7 text-orange-500" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Feedback received</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            {intakeLinkToken
              ? 'Taking you back to the intake to discuss your changes…'
              : `${agencyName} has been notified and will follow up with you.`}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <header className="border-b border-gray-100 px-6 py-4">
        <p className="text-xs font-semibold tracking-widest uppercase text-orange-500">{agencyName}</p>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">

        {/* Title */}
        <div className="mb-10">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Project Scope</p>
          <h1 className="text-2xl font-semibold text-gray-900 leading-tight">
            {scope.name ?? scope.clientName ?? 'Your project scope'}
          </h1>
          {date && <p className="text-sm text-gray-400 mt-1.5">{date}</p>}
        </div>

        {/* Executive Summary */}
        <section className="mb-8">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-orange-500 mb-3">Executive Summary</p>
          <p className="text-sm text-gray-700 leading-relaxed">{g.executiveSummary}</p>
        </section>

        {/* Deliverables */}
        <section className="mb-8">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-orange-500 mb-3">Deliverables</p>
          <div className="space-y-4">
            {g.deliverables.map(d => (
              <div key={d.id} className="border-l-2 border-orange-100 pl-4">
                <p className="text-sm font-medium text-gray-900">{d.title}</p>
                {d.description && <p className="text-sm text-gray-500 mt-0.5">{d.description}</p>}
                {d.phase && <p className="text-xs text-gray-400 mt-1">{d.phase}</p>}
              </div>
            ))}
          </div>
        </section>

        {/* Milestones — collapsible */}
        <section className="mb-8">
          <button
            onClick={() => setMilestonesOpen(o => !o)}
            className="flex items-center justify-between w-full text-left"
          >
            <p className="text-[10px] font-semibold tracking-widest uppercase text-orange-500">Timeline</p>
            {milestonesOpen
              ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
              : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
          </button>
          {milestonesOpen && (
            <div className="mt-3 space-y-2">
              {sortedMilestones.map(m => (
                <div key={m.id} className="flex items-baseline gap-4">
                  <span className="text-xs text-gray-400 w-20 flex-shrink-0">{m.duration}</span>
                  <span className="text-sm text-gray-700">{m.name}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Investment */}
        <section className="mb-8">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-orange-500 mb-3">Investment Estimate</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-gray-900">
              {g.pricingEstimate.currency} {g.pricingEstimate.low.toLocaleString()}
            </span>
            <span className="text-gray-400">—</span>
            <span className="text-2xl font-semibold text-gray-900">
              {g.pricingEstimate.currency} {g.pricingEstimate.high.toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-2">Indicative estimate. Final pricing subject to detailed review.</p>
        </section>

        {/* Risk Flags */}
        {g.riskFlags.length > 0 && (
          <section className="mb-8">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-orange-500 mb-3">Risk Flags</p>
            <div className="space-y-2">
              {g.riskFlags.map(r => (
                <div key={r.id} className="flex items-start gap-3">
                  <span className={`text-[10px] font-semibold uppercase tracking-wide rounded-full border px-2 py-0.5 flex-shrink-0 mt-0.5 ${RISK_COLORS[r.severity]}`}>
                    {r.severity}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{r.title}</p>
                    {r.description && <p className="text-sm text-gray-500 mt-0.5">{r.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Out of scope */}
        {g.outOfScope.length > 0 && (
          <section className="mb-8">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-orange-500 mb-3">Out of Scope</p>
            <ul className="space-y-1">
              {g.outOfScope.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-500">
                  <span className="flex-shrink-0 mt-0.5">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Assumptions */}
        {g.assumptions.length > 0 && (
          <section className="mb-12">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-orange-500 mb-3">Assumptions</p>
            <ul className="space-y-1">
              {g.assumptions.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-500">
                  <span className="text-orange-400 flex-shrink-0 mt-0.5">•</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Action zone */}
        <div className="border-t border-gray-100 pt-10">
          {stage === 'idle' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900 mb-1">Ready to move forward?</h2>
                <p className="text-sm text-gray-500">Approve this scope or request changes before we get started.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="flex-1 bg-orange-500 text-white text-sm font-semibold py-3 px-6 rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  Approve scope
                </button>
                <button
                  onClick={() => setStage('requesting_changes')}
                  disabled={loading}
                  className="flex-1 border border-gray-200 text-gray-700 text-sm font-medium py-3 px-6 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Request changes
                </button>
              </div>
            </div>
          )}

          {stage === 'requesting_changes' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900 mb-1">What would you like to change?</h2>
                <p className="text-sm text-gray-500">
                  {intakeLinkToken
                    ? "You'll be taken back to the intake chat to discuss your changes in detail."
                    : `Leave your feedback and ${agencyName} will follow up with you.`}
                </p>
              </div>
              <textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="Describe what you'd like to adjust…"
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 resize-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleRequestChanges}
                  disabled={loading}
                  className="flex-1 bg-orange-500 text-white text-sm font-semibold py-3 px-6 rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Sending…' : intakeLinkToken ? 'Continue to intake' : 'Send feedback'}
                </button>
                <button
                  onClick={() => setStage('idle')}
                  disabled={loading}
                  className="border border-gray-200 text-gray-600 text-sm font-medium py-3 px-5 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
