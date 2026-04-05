'use client'

import { useState, useEffect } from 'react'
import { X, Copy, Check } from 'lucide-react'

interface ProjectType {
  id: string
  name: string
}

interface Props {
  open: boolean
  onClose: () => void
}

export function CreateLinkModal({ open, onClose }: Props) {
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([])
  const [projectTypeId, setProjectTypeId] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [generatedUrl, setGeneratedUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)

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
          projectTypeId: projectTypeId || undefined,
          clientName: clientName || undefined,
          clientEmail: clientEmail || undefined,
        }),
      })
      const data = await res.json()
      setGeneratedUrl(data.url)
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
    setProjectTypeId('')
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Create Intake Link</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!generatedUrl ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Project Type <span className="text-gray-400">(optional)</span>
              </label>
              <select
                value={projectTypeId}
                onChange={(e) => setProjectTypeId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">General (no project type)</option>
                {projectTypes.map((pt) => (
                  <option key={pt.id} value={pt.id}>{pt.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Client Name <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Acme Corp"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Client Email <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="contact@acme.com"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <button
              onClick={handleCreate}
              disabled={isLoading}
              className="w-full bg-orange-500 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Creating...' : 'Create Link'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Share this link with your client. It expires in 7 days.
              </p>
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
