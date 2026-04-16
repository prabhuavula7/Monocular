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

// Map project type name keywords → icon
function getProjectTypeIcon(name: string) {
  const n = name.toLowerCase()
  if (n.includes('web')) return Globe
  if (n.includes('brand')) return Palette
  if (n.includes('e-commerce') || n.includes('ecommerce') || n.includes('commerce')) return ShoppingCart
  if (n.includes('mobile') || n.includes('app')) return Smartphone
  if (n.includes('seo') || n.includes('content')) return TrendingUp
  if (n.includes('social')) return Share2
  if (n.includes('video')) return Video
  if (n.includes('ux') || n.includes('ui') || n.includes('design')) return Layout
  if (n.includes('saas') || n.includes('product') || n.includes('software')) return Layers
  if (n.includes('marketing') || n.includes('campaign')) return Megaphone
  return Briefcase
}

const STATUS_COLORS = [
  'bg-orange-50 text-orange-600 border-orange-200',
  'bg-purple-50 text-purple-600 border-purple-200',
  'bg-blue-50 text-blue-600 border-blue-200',
  'bg-green-50 text-green-600 border-green-200',
  'bg-amber-50 text-amber-600 border-amber-200',
  'bg-rose-50 text-rose-600 border-rose-200',
  'bg-teal-50 text-teal-600 border-teal-200',
  'bg-indigo-50 text-indigo-600 border-indigo-200',
  'bg-pink-50 text-pink-600 border-pink-200',
  'bg-cyan-50 text-cyan-600 border-cyan-200',
]

function getCardColor(index: number) {
  return STATUS_COLORS[index % STATUS_COLORS.length]
}

type Step = 'template' | 'details' | 'done'

export function CreateLinkModal({ open, onClose }: Props) {
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([])
  const [projectTypeId, setProjectTypeId] = useState<string | null>(null) // null = general
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
      .then((data) => setProjectTypes(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [open])

  async function handleCreate() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectTypeId: projectTypeId ?? undefined,
          clientName: clientName || undefined,
          clientEmail: clientEmail || undefined,
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
    setProjectTypeId(null)
    setStep('template')
    onClose()
  }

  if (!open) return null

  const selectedType = projectTypeId
    ? projectTypes.find((pt) => pt.id === projectTypeId)
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            {step === 'details' && (
              <button
                onClick={() => setStep('template')}
                className="text-gray-400 hover:text-gray-600 mr-1"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="text-sm font-semibold text-gray-900">
              {step === 'template' && 'Choose a template'}
              {step === 'details' && (selectedType ? selectedType.name : 'General intake')}
              {step === 'done' && 'Link ready'}
            </h2>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step: Template selection */}
        {step === 'template' && (
          <div className="p-5">
            <p className="text-xs text-gray-400 mb-4">
              Templates tell the AI what questions to ask and how to price the project.
            </p>
            <div className="grid grid-cols-2 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
              {/* General option */}
              <button
                onClick={() => { setProjectTypeId(null); setStep('details') }}
                className="flex items-start gap-3 p-3.5 rounded-xl border border-dashed border-gray-200 hover:border-orange-300 hover:bg-orange-50/50 text-left transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-100">
                  <Briefcase className="w-4 h-4 text-gray-500 group-hover:text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">General</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-snug">No template — open discovery</p>
                </div>
              </button>

              {/* Project type cards */}
              {projectTypes.map((pt, i) => {
                const Icon = getProjectTypeIcon(pt.name)
                const colorClass = getCardColor(i)
                return (
                  <button
                    key={pt.id}
                    onClick={() => { setProjectTypeId(pt.id); setStep('details') }}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all hover:shadow-sm hover:scale-[1.01] ${colorClass} bg-opacity-30`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/70`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{pt.name}</p>
                      {pt.description && (
                        <p className="text-xs opacity-70 mt-0.5 leading-snug line-clamp-2">{pt.description}</p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step: Client details */}
        {step === 'details' && (
          <div className="p-6 space-y-4">
            {selectedType && (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg mb-2">
                {(() => {
                  const Icon = getProjectTypeIcon(selectedType.name)
                  return <Icon className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                })()}
                <span className="text-xs text-gray-500">{selectedType.name} template selected</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Client Name <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Acme Corp"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-shadow"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Client Email <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="contact@acme.com"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-shadow"
              />
            </div>

            <button
              onClick={handleCreate}
              disabled={isLoading}
              className="w-full bg-orange-500 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors mt-2"
            >
              {isLoading ? 'Creating link...' : 'Create Intake Link'}
            </button>
          </div>
        )}

        {/* Step: Done — show link */}
        {step === 'done' && (
          <div className="p-6 space-y-4">
            <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3">
              <p className="text-sm font-medium text-green-800">Link created</p>
              <p className="text-xs text-green-600 mt-0.5">Share this with your client. It expires in 7 days.</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={generatedUrl}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-600 bg-gray-50 focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className="flex-shrink-0 flex items-center gap-1.5 bg-orange-500 text-white rounded-lg px-3 py-2 text-xs font-medium hover:bg-orange-600 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <button
              onClick={handleClose}
              className="w-full border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
