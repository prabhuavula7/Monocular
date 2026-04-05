'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Plus, X } from 'lucide-react'
import Link from 'next/link'

interface SchemaField {
  key: string
  label: string
  type: string
  required: boolean
  probeHint?: string
}

interface ProjectTypeForm {
  name: string
  description: string
  milestonePattern: string[]
  extractionSchema: SchemaField[]
  riskFlags: string[]
  pricingContext: string
}

const EMPTY_FORM: ProjectTypeForm = {
  name: '',
  description: '',
  milestonePattern: [],
  extractionSchema: [],
  riskFlags: [],
  pricingContext: '',
}

export default function ProjectTypeEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const isNew = id === 'new'

  const [form, setForm] = useState<ProjectTypeForm>(EMPTY_FORM)
  const [milestoneInput, setMilestoneInput] = useState('')
  const [riskInput, setRiskInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isNew) return
    fetch(`/api/settings/project-types`)
      .then((r) => r.json())
      .then((data: Array<{ id: string } & ProjectTypeForm>) => {
        const pt = data.find((p) => p.id === id)
        if (pt) {
          setForm({
            name: pt.name,
            description: pt.description ?? '',
            milestonePattern: pt.milestonePattern ?? [],
            extractionSchema: pt.extractionSchema ?? [],
            riskFlags: pt.riskFlags ?? [],
            pricingContext: pt.pricingContext ?? '',
          })
        }
      })
      .catch(() => {})
  }, [id, isNew])

  async function handleSave() {
    setIsSaving(true)
    try {
      if (isNew) {
        await fetch('/api/settings/project-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      } else {
        await fetch(`/api/settings/project-types/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      }
      router.push('/dashboard/settings/project-types')
    } catch {
      alert('Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  function addMilestone() {
    const val = milestoneInput.trim()
    if (!val) return
    setForm((f) => ({ ...f, milestonePattern: [...f.milestonePattern, val] }))
    setMilestoneInput('')
  }

  function removeMilestone(i: number) {
    setForm((f) => ({ ...f, milestonePattern: f.milestonePattern.filter((_, idx) => idx !== i) }))
  }

  function addRiskFlag() {
    const val = riskInput.trim()
    if (!val) return
    setForm((f) => ({ ...f, riskFlags: [...f.riskFlags, val] }))
    setRiskInput('')
  }

  function addSchemaField() {
    setForm((f) => ({
      ...f,
      extractionSchema: [
        ...f.extractionSchema,
        { key: `field_${Date.now()}`, label: '', type: 'string', required: true },
      ],
    }))
  }

  function updateSchemaField(index: number, patch: Partial<SchemaField>) {
    setForm((f) => ({
      ...f,
      extractionSchema: f.extractionSchema.map((field, i) =>
        i === index ? { ...field, ...patch } : field
      ),
    }))
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/settings/project-types" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">
          {isNew ? 'New Project Type' : 'Edit Project Type'}
        </h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Web Development"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Short description for this project type"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        {/* Milestones */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Milestone Phases</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {form.milestonePattern.map((phase, i) => (
              <span key={i} className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                {phase}
                <button onClick={() => removeMilestone(i)} className="hover:text-gray-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={milestoneInput}
              onChange={(e) => setMilestoneInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addMilestone()}
              placeholder="Add phase (e.g. Discovery)"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <button onClick={addMilestone} className="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">
              Add
            </button>
          </div>
        </div>

        {/* Risk Flags */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Risk Flags</label>
          <div className="space-y-1 mb-2">
            {form.riskFlags.map((flag, i) => (
              <div key={i} className="flex items-center justify-between text-sm text-gray-700">
                <span>• {flag}</span>
                <button
                  onClick={() => setForm((f) => ({ ...f, riskFlags: f.riskFlags.filter((_, idx) => idx !== i) }))}
                  className="text-gray-400 hover:text-red-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={riskInput}
              onChange={(e) => setRiskInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addRiskFlag()}
              placeholder="Add a risk flag"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <button onClick={addRiskFlag} className="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">
              Add
            </button>
          </div>
        </div>

        {/* Extraction Schema */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Extraction Fields</label>
          <div className="space-y-3">
            {form.extractionSchema.map((field, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => updateSchemaField(i, { label: e.target.value })}
                    placeholder="Field label"
                    className="flex-1 text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  />
                  <select
                    value={field.type}
                    onChange={(e) => updateSchemaField(i, { type: e.target.value })}
                    className="text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none"
                  >
                    <option value="string">Text</option>
                    <option value="string[]">List</option>
                    <option value="boolean">Yes/No</option>
                    <option value="number">Number</option>
                  </select>
                  <label className="flex items-center gap-1 text-xs text-gray-600 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => updateSchemaField(i, { required: e.target.checked })}
                    />
                    Required
                  </label>
                  <button
                    onClick={() => setForm((f) => ({ ...f, extractionSchema: f.extractionSchema.filter((_, idx) => idx !== i) }))}
                    className="text-gray-300 hover:text-red-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="text"
                  value={field.probeHint ?? ''}
                  onChange={(e) => updateSchemaField(i, { probeHint: e.target.value })}
                  placeholder="Probe hint for Claude (optional)"
                  className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none text-gray-500"
                />
              </div>
            ))}
          </div>
          <button
            onClick={addSchemaField}
            className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
          >
            <Plus className="w-3.5 h-3.5" /> Add field
          </button>
        </div>

        {/* Pricing context */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Pricing Context</label>
          <textarea
            value={form.pricingContext}
            onChange={(e) => setForm((f) => ({ ...f, pricingContext: e.target.value }))}
            rows={2}
            placeholder="e.g. Projects typically range $10,000–$50,000..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || !form.name}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save Project Type'}
        </button>
      </div>
    </div>
  )
}
