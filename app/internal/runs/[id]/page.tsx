'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime } from '@/lib/utils'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts'

interface Step {
  id: string
  stepIndex: number
  type: 'model_call' | 'tool_call'
  toolName: string | null
  input: unknown
  output: unknown
  inputTokens: number
  outputTokens: number
  latencyMs: number | null
  createdAt: string
}

interface RunDetail {
  id: string
  agencyName: string | null
  scopeId: string | null
  vertical: string
  mode: string
  status: string
  kind: string | null
  totalInputTokens: number
  totalOutputTokens: number
  totalSteps: number
  error: string | null
  startedAt: string
  completedAt: string | null
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panel border border-line rounded-xl px-4 py-3">
      <p className="text-xs text-ink-3">{label}</p>
      <p className="text-lg font-semibold text-ink mt-0.5">{value}</p>
    </div>
  )
}

export default function InternalRunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [run, setRun] = useState<RunDetail | null>(null)
  const [steps, setSteps] = useState<Step[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/internal/runs/${id}`)
      .then(res => res.json())
      .then(data => {
        setRun(data.run)
        setSteps(data.steps)
      })
      .finally(() => setIsLoading(false))
  }, [id])

  if (isLoading) return <p className="text-sm text-zinc-500">Loading...</p>
  if (!run) return <p className="text-sm text-red-500">Run not found.</p>

  const duration = run.completedAt
    ? new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()
    : null

  const tokenChartData = steps.map(s => ({
    step: `#${s.stepIndex}${s.toolName ? ` ${s.toolName}` : ''}`,
    input: s.inputTokens,
    output: s.outputTokens,
  }))

  const latencyChartData = steps.map(s => ({
    step: `#${s.stepIndex}`,
    latencyMs: s.latencyMs ?? 0,
  }))

  return (
    <div>
      <Link href="/internal/runs" className="inline-flex items-center gap-1 text-xs text-ink-3 hover:text-ink mb-3">
        <ChevronLeft className="w-3.5 h-3.5" /> Back to runs
      </Link>

      <h1 className="text-xl font-semibold mb-1">{run.agencyName}</h1>
      <p className="text-sm text-zinc-500 mb-4">
        {run.vertical} · {run.mode} · <Badge>{run.status}</Badge> ·{' '}
        started {formatRelativeTime(run.startedAt)}
      </p>
      {run.error && (
        <p className="text-sm text-red-500 mb-4">Error: {run.error}</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Status" value={run.status} />
        <KpiCard label="Duration" value={duration !== null ? `${(duration / 1000).toFixed(1)}s` : '—'} />
        <KpiCard label="Tokens (in/out)" value={`${run.totalInputTokens.toLocaleString()} / ${run.totalOutputTokens.toLocaleString()}`} />
        <KpiCard label="Steps" value={String(run.totalSteps)} />
      </div>

      {steps.length > 1 && (
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-panel border border-line rounded-xl p-4" style={{ height: 220 }}>
            <p className="text-xs text-ink-3 mb-2">Tokens per step</p>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tokenChartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="step" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} width={32} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="input" stackId="tokens" fill="#F97316" name="input" />
                <Bar dataKey="output" stackId="tokens" fill="#FDBA74" name="output" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-panel border border-line rounded-xl p-4" style={{ height: 220 }}>
            <p className="text-xs text-ink-3 mb-2">Latency per step (ms)</p>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={latencyChartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="step" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} width={40} />
                <Tooltip />
                <Bar dataKey="latencyMs" fill="#3B82F6" name="latency" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {steps.map(step => (
          <div
            key={step.id}
            className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                #{step.stepIndex} {step.type}
                {step.toolName && ` · ${step.toolName}`}
              </span>
              <span className="text-xs text-zinc-500">
                {step.inputTokens}/{step.outputTokens} tok · {step.latencyMs ?? '?'}ms
              </span>
            </div>
            <details className="text-xs">
              <summary className="cursor-pointer text-zinc-500">input</summary>
              <pre className="whitespace-pre-wrap break-words bg-zinc-50 dark:bg-zinc-900 p-2 rounded mt-1">
                {JSON.stringify(step.input, null, 2)}
              </pre>
            </details>
            <details className="text-xs mt-1">
              <summary className="cursor-pointer text-zinc-500">output</summary>
              <pre className="whitespace-pre-wrap break-words bg-zinc-50 dark:bg-zinc-900 p-2 rounded mt-1">
                {JSON.stringify(step.output, null, 2)}
              </pre>
            </details>
          </div>
        ))}
      </div>
    </div>
  )
}
