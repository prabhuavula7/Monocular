'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { CheckCircle, Building2, Sliders, LogOut, User, CreditCard, ExternalLink } from 'lucide-react'
import { useUser, useClerk } from '@clerk/nextjs'
import { PLANS } from '@/lib/stripe'

interface OrgSettings {
  name: string
  tonePreference: string | null
  rateMin: number | null
  rateMax: number | null
  rateCurrency: string | null
  standardAssumptions: string[]
  customRiskFlags: string[]
  plan: string | null
  planStatus: string | null
  trialEndsAt: string | null
  stripeCustomerId: string | null
}

const inputClass = 'w-full rounded-lg border border-line bg-panel px-3 py-2.5 text-sm text-ink placeholder-ink-3 focus:outline-none focus:ring-2 focus:ring-orange/30 focus:border-orange/50 transition-shadow'
const labelClass = 'block text-xs font-medium text-ink-2 mb-1.5'

function Section({ icon: Icon, title, description, children }: {
  icon: React.ElementType
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-panel border border-line rounded-2xl panel-shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-line flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-orange-dim border border-orange-border flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-orange" />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">{title}</p>
          <p className="text-xs text-ink-3">{description}</p>
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

export default function AccountClient({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter()
  const { user } = useUser()
  const { signOut, openUserProfile } = useClerk()
  const [settings, setSettings] = useState<OrgSettings | null>(null)
  const [orgName, setOrgName] = useState('')
  const [tone, setTone] = useState('professional')
  const [rateMin, setRateMin] = useState('')
  const [rateMax, setRateMax] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [assumptions, setAssumptions] = useState('')
  const [riskFlags, setRiskFlags] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((data: OrgSettings) => {
        setSettings(data)
        setOrgName(data.name ?? '')
        setTone(data.tonePreference ?? 'professional')
        setRateMin(data.rateMin?.toString() ?? '')
        setRateMax(data.rateMax?.toString() ?? '')
        setCurrency(data.rateCurrency ?? 'USD')
        setAssumptions((data.standardAssumptions ?? []).join('\n'))
        setRiskFlags((data.customRiskFlags ?? []).join('\n'))
      })
      .catch(() => {})
  }, [])

  async function save(section: string, patch: Record<string, unknown>) {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setSettings(updated)
      setSaved(section)
      setTimeout(() => setSaved(null), 2500)
      // Re-run server components so sidebar name and any other server-rendered
      // values pick up the new data without a full page reload.
      router.refresh()
    } catch {
      alert('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function openBillingPortal() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setPortalLoading(false)
    }
  }

  function SaveButton({ section }: { section: string }) {
    const isSaved = saved === section
    return (
      <button
        onClick={() => {
          if (section === 'org') save('org', { name: orgName })
          if (section === 'ai') save('ai', {
            tonePreference: tone,
            rateMin:    rateMin  ? parseInt(rateMin)  : undefined,
            rateMax:    rateMax  ? parseInt(rateMax)  : undefined,
            rateCurrency: currency,
          })
          if (section === 'intake') save('intake', {
            standardAssumptions: assumptions.split('\n').map(s => s.trim()).filter(Boolean),
            customRiskFlags:     riskFlags.split('\n').map(s => s.trim()).filter(Boolean),
          })
        }}
        disabled={saving}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${
          isSaved
            ? 'bg-green-500/10 text-green-600 border border-green-500/20'
            : 'bg-orange text-white hover:bg-orange-hover'
        }`}
      >
        {isSaved
          ? <><CheckCircle className="w-3.5 h-3.5" /> Saved</>
          : saving ? 'Saving...' : 'Save'}
      </button>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

      <div className="mb-2">
        <h1 className="text-xl font-semibold text-ink">Account</h1>
        <p className="text-sm text-ink-3 mt-0.5">
          {isAdmin ? 'Manage your profile, org settings, and AI preferences' : 'Your profile and sign-out'}
        </p>
      </div>

      {/* Personal profile */}
      <div className="bg-panel border border-line rounded-2xl panel-shadow overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {user?.imageUrl ? (
              <Image
                src={user.imageUrl}
                alt={user.fullName ?? 'User'}
                width={52}
                height={52}
                className="w-13 h-13 rounded-full ring-2 ring-line flex-shrink-0"
              />
            ) : (
              <div className="w-13 h-13 rounded-full bg-orange-dim border border-orange-border flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-orange" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-ink">
                {user?.fullName ?? user?.firstName ?? '—'}
              </p>
              <p className="text-xs text-ink-3 mt-0.5">
                {user?.primaryEmailAddress?.emailAddress ?? ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => openUserProfile()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line text-xs font-medium text-ink-2 hover:bg-panel-hover transition-colors"
            >
              Edit profile
            </button>
            <button
              onClick={() => signOut({ redirectUrl: '/sign-in' })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line text-xs font-medium text-ink-3 hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Admin-only sections */}
      {isAdmin && (
        <>
          {/* Org identity */}
          <Section icon={Building2} title="Organisation" description="Your org name and identity">
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Org Name</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  placeholder="Acme Studio"
                  className={inputClass}
                />
                <p className="text-xs text-ink-3 mt-1.5">
                  Shown in the intake chat and scope documents. Also syncs to your Clerk organisation.
                </p>
              </div>
              <div className="flex justify-end">
                <SaveButton section="org" />
              </div>
            </div>
          </Section>

          {/* Billing */}
          <Section icon={CreditCard} title="Billing" description="Your plan and subscription">
            {(() => {
              const plan = settings?.plan ?? 'trial'
              const status = settings?.planStatus ?? 'trialing'
              const trialEnd = settings?.trialEndsAt ? new Date(settings.trialEndsAt) : null
              const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000)) : null
              const planName = plan === 'trial' ? 'Free Trial' : (PLANS[plan as keyof typeof PLANS]?.name ?? plan)

              const statusLabel: Record<string, { label: string; color: string }> = {
                trialing: { label: 'Trialing', color: 'text-orange-500 bg-orange-500/10' },
                active:   { label: 'Active',   color: 'text-green-600 bg-green-500/10' },
                past_due: { label: 'Past due', color: 'text-red-500 bg-red-500/10' },
                canceled: { label: 'Canceled', color: 'text-ink-3 bg-muted' },
              }
              const badge = statusLabel[status] ?? { label: status, color: 'text-ink-3 bg-muted' }

              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-ink">{planName}</p>
                      {daysLeft !== null && status === 'trialing' && (
                        <p className="text-xs text-ink-3 mt-0.5">{daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining in trial</p>
                      )}
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {settings?.stripeCustomerId ? (
                      <button
                        onClick={openBillingPortal}
                        disabled={portalLoading}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line text-xs font-medium text-ink-2 hover:bg-panel-hover transition-colors disabled:opacity-50"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {portalLoading ? 'Opening...' : 'Manage billing'}
                      </button>
                    ) : null}
                    {(plan === 'trial' || status === 'canceled') && (
                      <a
                        href="/pricing"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 transition-colors"
                      >
                        Upgrade plan
                      </a>
                    )}
                  </div>
                </div>
              )
            })()}
          </Section>

          {/* AI preferences */}
          <Section icon={Sliders} title="AI Preferences" description="How the intake AI behaves and estimates">
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Tone</label>
                <select value={tone} onChange={e => setTone(e.target.value)} className={inputClass}>
                  <option value="professional">Professional</option>
                  <option value="consultative">Consultative</option>
                  <option value="direct">Direct</option>
                  <option value="warm">Warm</option>
                </select>
                <p className="text-xs text-ink-3 mt-1.5">Sets the conversational style of the intake AI.</p>
              </div>

              <div>
                <label className={labelClass}>Typical Project Range</label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <select value={currency} onChange={e => setCurrency(e.target.value)} className={inputClass}>
                      <option value="USD">USD $</option>
                      <option value="GBP">GBP £</option>
                      <option value="EUR">EUR €</option>
                      <option value="AUD">AUD $</option>
                      <option value="CAD">CAD $</option>
                    </select>
                  </div>
                  <div>
                    <input
                      type="number"
                      value={rateMin}
                      onChange={e => setRateMin(e.target.value)}
                      placeholder="Min"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      value={rateMax}
                      onChange={e => setRateMax(e.target.value)}
                      placeholder="Max"
                      className={inputClass}
                    />
                  </div>
                </div>
                <p className="text-xs text-ink-3 mt-1.5">Used to sanity-check AI pricing estimates. Leave blank to skip guardrails.</p>
              </div>

              <div className="flex justify-end">
                <SaveButton section="ai" />
              </div>
            </div>
          </Section>

          {/* Intake defaults */}
          <Section icon={Sliders} title="Intake Defaults" description="Standard text injected into every intake conversation">
            <div className="space-y-4">
              <div>
                <label className={labelClass}>
                  Standard Assumptions <span className="font-normal text-ink-3">(one per line)</span>
                </label>
                <textarea
                  value={assumptions}
                  onChange={e => setAssumptions(e.target.value)}
                  rows={4}
                  placeholder={"Client provides all content and copy\nHosting is client's responsibility"}
                  className={`${inputClass} resize-none`}
                />
                <p className="text-xs text-ink-3 mt-1.5">These are added to every generated scope as baseline assumptions.</p>
              </div>

              <div>
                <label className={labelClass}>
                  Custom Risk Flags <span className="font-normal text-ink-3">(one per line)</span>
                </label>
                <textarea
                  value={riskFlags}
                  onChange={e => setRiskFlags(e.target.value)}
                  rows={3}
                  placeholder={"Always ask if they have an existing CRM\nProbe for third-party data migrations"}
                  className={`${inputClass} resize-none`}
                />
                <p className="text-xs text-ink-3 mt-1.5">The AI will probe for these specifically in every intake session.</p>
              </div>

              <div className="flex justify-end">
                <SaveButton section="intake" />
              </div>
            </div>
          </Section>
        </>
      )}

    </div>
  )
}
