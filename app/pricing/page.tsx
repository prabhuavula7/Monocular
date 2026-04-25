'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PLANS, type PlanKey } from '@/lib/stripe'
import { Check } from 'lucide-react'

const FEATURES: Record<PlanKey, string[]> = {
  solo: [
    '40 scopes per month',
    'AI-powered intake chat',
    'Scope generation & export',
    'Email scope to clients',
    'Client review links',
  ],
  studio: [
    '150 scopes per month',
    'Everything in Solo',
    'Custom project types',
    'AI extraction schemas',
    'Milestone patterns & risk flags',
  ],
  agency: [
    'Unlimited scopes',
    'Everything in Studio',
    'Priority support',
  ],
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(0)}`
}

export default function PricingPage() {
  const [interval, setInterval] = useState<'monthly' | 'annual'>('monthly')
  const [loading, setLoading] = useState<PlanKey | null>(null)
  const router = useRouter()

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
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight mb-3">Simple, honest pricing</h1>
        <p className="text-muted-foreground text-lg">14-day free trial. No credit card required to start.</p>
      </div>

      <div className="flex items-center gap-2 mb-10 bg-muted rounded-full p-1">
        <button
          onClick={() => setInterval('monthly')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            interval === 'monthly' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setInterval('annual')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            interval === 'annual' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'
          }`}
        >
          Annual <span className="text-orange-500 font-semibold">2 months free</span>
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
              className={`rounded-2xl border p-8 flex flex-col gap-6 ${
                isMiddle
                  ? 'border-orange-500 shadow-lg shadow-orange-500/10 bg-card'
                  : 'border-border bg-card'
              }`}
            >
              {isMiddle && (
                <div className="text-xs font-semibold text-orange-500 uppercase tracking-wide">Most popular</div>
              )}
              <div>
                <h2 className="text-2xl font-bold">{plan.name}</h2>
                <p className="text-muted-foreground text-sm mt-1">{plan.description}</p>
              </div>

              <div>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold">{formatPrice(price)}</span>
                  <span className="text-muted-foreground mb-1">
                    {interval === 'annual' ? '/yr' : '/mo'}
                  </span>
                </div>
                {monthlyEquivalent && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatPrice(monthlyEquivalent)}/mo billed annually
                  </p>
                )}
              </div>

              <button
                onClick={() => handleSelect(key)}
                disabled={loading !== null}
                className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
                  isMiddle
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'border border-border hover:bg-muted text-foreground'
                }`}
              >
                {loading === key ? 'Redirecting...' : 'Get started'}
              </button>

              <ul className="space-y-3">
                {FEATURES[key].map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      <p className="mt-12 text-sm text-muted-foreground">
        Already have an account?{' '}
        <a href="/sign-in" className="text-orange-500 hover:underline">
          Sign in
        </a>
      </p>
    </div>
  )
}
