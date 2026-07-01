'use client'

import { useState } from 'react'
import { X, Zap } from 'lucide-react'
import { PLANS, type PlanKey } from '@/lib/stripe'

interface Props {
  open: boolean
  onClose: () => void
  currentPlan?: string
  message?: string
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(0)}`
}

// Suggests the next tier up from the current plan — trial/solo -> studio, studio -> agency.
function getSuggestedPlan(currentPlan?: string): PlanKey {
  if (currentPlan === 'studio') return 'agency'
  if (currentPlan === 'agency') return 'agency'
  return 'studio'
}

export function UpgradeModal({ open, onClose, currentPlan, message }: Props) {
  const [loading, setLoading] = useState<PlanKey | null>(null)
  if (!open) return null

  const suggested = getSuggestedPlan(currentPlan)
  const planKeys = (Object.keys(PLANS) as PlanKey[]).filter(k => k !== currentPlan)

  async function handleUpgrade(plan: PlanKey) {
    setLoading(plan)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, interval: 'monthly' }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-modal border border-line rounded-2xl modal-shadow w-full max-w-md mx-4 p-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-ink-3 hover:text-ink transition-colors">
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-orange" />
          <h2 className="text-sm font-semibold text-ink">Upgrade your plan</h2>
        </div>
        <p className="text-xs text-ink-3 mb-5">
          {message ?? "You've reached your plan's scope limit for this period."}
        </p>

        <div className="space-y-2">
          {planKeys.map(key => {
            const plan = PLANS[key]
            const isSuggested = key === suggested
            return (
              <button
                key={key}
                onClick={() => handleUpgrade(key)}
                disabled={loading !== null}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all disabled:opacity-50 ${
                  isSuggested ? 'border-orange bg-orange/5' : 'border-line hover:border-orange/40'
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-ink">{plan.name}</p>
                  <p className="text-xs text-ink-3 mt-0.5">
                    {plan.scopeLimit === Infinity ? 'Unlimited scopes' : `${plan.scopeLimit} scopes/mo`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-ink">{formatPrice(plan.monthlyAmount)}/mo</p>
                  {loading === key && <p className="text-xs text-ink-3">Redirecting...</p>}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
