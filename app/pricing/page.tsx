'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PLANS, type PlanKey } from '@/lib/stripe'
import { Check, X, Clock } from 'lucide-react'

type Feature = { text: string; included: boolean }

const FEATURES: Record<PlanKey, Feature[]> = {
  solo: [
    { text: '20 scopes per month',            included: true  },
    { text: 'AI-powered intake chat',          included: true  },
    { text: 'Scope editor & PDF export',       included: true  },
    { text: 'Custom project types',            included: true  },
    { text: 'Client review links',             included: false },
    { text: 'Email scope to client',           included: false },
    { text: 'Intake link customization',       included: false },
    { text: 'Priority support',                included: false },
  ],
  studio: [
    { text: '75 scopes per month',             included: true  },
    { text: 'Everything in Solo',              included: true  },
    { text: 'Up to 3 seats',                   included: true  },
    { text: 'Client review links',             included: true  },
    { text: 'Email scope to client',           included: true  },
    { text: 'Intake link customization',       included: true  },
    { text: 'Priority support',                included: false },
  ],
  agency: [
    { text: 'Unlimited scopes',                included: true  },
    { text: 'Everything in Studio',            included: true  },
    { text: 'Unlimited seats',                 included: true  },
    { text: 'Priority support',                included: true  },
  ],
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(0)}`
}

export default function PricingPage() {
  const [interval, setInterval] = useState<'monthly' | 'annual'>('monthly')
  const [loading, setLoading] = useState<PlanKey | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const trialExpired = searchParams.get('expired') === '1'

  async function handleSelect(plan: PlanKey) {
    setLoading(plan)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, interval }),
      })

      if (res.status === 401) {
        router.push(`/sign-in?redirect_url=/pricing`)
        return
      }

      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setLoading(null)
    }
  }

  const planKeys = Object.keys(PLANS) as PlanKey[]

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center px-4 py-16">

      {/* Expired trial banner */}
      {trialExpired && (
        <div
          className="w-full max-w-5xl mb-8 rounded-xl px-5 py-4 flex items-start gap-3"
          style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)' }}
        >
          <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#F97316' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: '#F97316' }}>Your trial has ended</p>
            <p className="text-sm text-ink-2 mt-0.5">
              Choose a plan to continue. Your data — scopes, intake links, and settings — is retained for
              <span className="font-medium text-ink"> 60 days</span>. After that, it will be permanently deleted.
            </p>
          </div>
        </div>
      )}

      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight mb-3">Simple, honest pricing</h1>
        <p className="text-ink-2 text-lg">7-day free trial. No credit card required to start.</p>
      </div>

      <div className="flex items-center gap-2 mb-10 bg-panel border border-line rounded-full p-1">
        <button
          onClick={() => setInterval('monthly')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            interval === 'monthly' ? 'bg-canvas shadow text-ink' : 'text-ink-2'
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setInterval('annual')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            interval === 'annual' ? 'bg-canvas shadow text-ink' : 'text-ink-2'
          }`}
        >
          Annual <span className="text-orange font-semibold">2 months free</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        {planKeys.map((key, i) => {
          const plan = PLANS[key]
          const isMiddle = i === 1
          const price = interval === 'annual' ? plan.annualAmount : plan.monthlyAmount
          const monthlyEquivalent = interval === 'annual' ? Math.round(plan.annualAmount / 12) : null

          return (
            <div
              key={key}
              className={`rounded-2xl border p-8 flex flex-col gap-6 bg-panel ${
                isMiddle ? 'border-orange shadow-lg shadow-orange/10' : 'border-line'
              }`}
            >
              {isMiddle && (
                <div className="text-xs font-semibold text-orange uppercase tracking-wide">Most popular</div>
              )}
              <div>
                <h2 className="text-2xl font-bold text-ink">{plan.name}</h2>
                <p className="text-ink-2 text-sm mt-1">{plan.description}</p>
              </div>

              <div>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold text-ink">{formatPrice(price)}</span>
                  <span className="text-ink-2 mb-1">
                    {interval === 'annual' ? '/yr' : '/mo'}
                  </span>
                </div>
                {monthlyEquivalent && (
                  <p className="text-sm text-ink-2 mt-1">
                    {formatPrice(monthlyEquivalent)}/mo billed annually
                  </p>
                )}
              </div>

              <button
                onClick={() => handleSelect(key)}
                disabled={loading !== null}
                className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
                  isMiddle
                    ? 'bg-orange hover:bg-orange-hover text-white'
                    : 'border border-line hover:bg-panel-hover text-ink'
                }`}
              >
                {loading === key ? 'Redirecting...' : 'Get started'}
              </button>

              <ul className="space-y-3">
                {FEATURES[key].map((feature) => (
                  <li key={feature.text} className="flex items-start gap-2 text-sm">
                    {feature.included ? (
                      <Check className="w-4 h-4 text-orange mt-0.5 shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-ink-3 mt-0.5 shrink-0" />
                    )}
                    <span className={feature.included ? 'text-ink' : 'text-ink-3'}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      <p className="mt-12 text-sm text-ink-2">
        Already have an account?{' '}
        <a href="/sign-in" className="text-orange hover:underline">
          Sign in
        </a>
      </p>
    </div>
  )
}
