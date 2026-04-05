'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface Agency {
  name: string
  tonePreference: string | null
  rateMin: number | null
  rateMax: number | null
  rateCurrency: string | null
  standardAssumptions: string[]
  customRiskFlags: string[]
}

export default function SettingsPage() {
  const [agency, setAgency] = useState<Agency | null>(null)
  const [tone, setTone] = useState('professional')
  const [rateMin, setRateMin] = useState('')
  const [rateMax, setRateMax] = useState('')
  const [assumptions, setAssumptions] = useState('')
  const [riskFlags, setRiskFlags] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data: Agency) => {
        setAgency(data)
        setTone(data.tonePreference ?? 'professional')
        setRateMin(data.rateMin?.toString() ?? '')
        setRateMax(data.rateMax?.toString() ?? '')
        setAssumptions((data.standardAssumptions ?? []).join('\n'))
        setRiskFlags((data.customRiskFlags ?? []).join('\n'))
      })
      .catch(() => {})
  }, [])

  async function handleSave() {
    setIsSaving(true)
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tonePreference: tone,
          rateMin: rateMin ? parseInt(rateMin) : undefined,
          rateMax: rateMax ? parseInt(rateMax) : undefined,
          standardAssumptions: assumptions.split('\n').map((s) => s.trim()).filter(Boolean),
          customRiskFlags: riskFlags.split('\n').map((s) => s.trim()).filter(Boolean),
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      alert('Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-xl font-semibold text-gray-900 mb-8">Settings</h1>

      {/* Project types link */}
      <Link
        href="/settings/project-types"
        className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-5 py-4 hover:border-gray-200 transition-colors mb-8"
      >
        <div>
          <p className="text-sm font-medium text-gray-900">Project Types</p>
          <p className="text-xs text-gray-400 mt-0.5">Manage intake templates and extraction schemas</p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </Link>

      {/* Agency profile */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <h2 className="text-sm font-semibold text-gray-700">Agency Profile</h2>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Agency Name</label>
          <input
            type="text"
            value={agency?.name ?? ''}
            disabled
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 bg-gray-50"
          />
          <p className="text-xs text-gray-400 mt-1">Synced from your Clerk organization.</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Tone Preference</label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="professional">Professional</option>
            <option value="consultative">Consultative</option>
            <option value="direct">Direct</option>
            <option value="warm">Warm</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Rate Min ($)</label>
            <input
              type="number"
              value={rateMin}
              onChange={(e) => setRateMin(e.target.value)}
              placeholder="e.g. 10000"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Rate Max ($)</label>
            <input
              type="number"
              value={rateMax}
              onChange={(e) => setRateMax(e.target.value)}
              placeholder="e.g. 80000"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Standard Assumptions <span className="text-gray-400">(one per line)</span>
          </label>
          <textarea
            value={assumptions}
            onChange={(e) => setAssumptions(e.target.value)}
            rows={4}
            placeholder="Client provides all content and copy&#10;Hosting is client's responsibility&#10;..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Custom Risk Flags <span className="text-gray-400">(one per line)</span>
          </label>
          <textarea
            value={riskFlags}
            onChange={(e) => setRiskFlags(e.target.value)}
            rows={3}
            placeholder="Always ask if they have an existing CRM contract&#10;..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {isSaving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
