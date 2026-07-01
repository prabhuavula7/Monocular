'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime } from '@/lib/utils'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'

interface Run {
  id: string
  agencyId: string
  agencyName: string | null
  scopeId: string | null
  vertical: string
  mode: string
  status: 'running' | 'completed' | 'aborted'
  kind: string | null
  totalInputTokens: number
  totalOutputTokens: number
  totalSteps: number
  error: string | null
  startedAt: string
  completedAt: string | null
}

const STATUS_VARIANT = {
  running: 'blue',
  completed: 'green',
  aborted: 'red',
} as const

type SortField = 'startedAt' | 'totalSteps' | 'totalTokens' | 'agencyName'
type SortDir = 'asc' | 'desc'

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-panel border border-line rounded-xl px-4 py-3">
      <p className="text-xs text-ink-3">{label}</p>
      <p className="text-xl font-semibold text-ink mt-0.5">{value}</p>
      {sub && <p className="text-[11px] text-ink-3 mt-0.5">{sub}</p>}
    </div>
  )
}

function durationMs(run: Run): number | null {
  if (!run.completedAt) return null
  return new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()
}

export default function InternalRunsPage() {
  const [runs, setRuns] = useState<Run[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [verticalFilter, setVerticalFilter] = useState<string>('all')
  const [modeFilter, setModeFilter] = useState<string>('all')
  const [agencySearch, setAgencySearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('startedAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    fetch('/api/internal/runs')
      .then(res => res.json())
      .then(data => setRuns(data))
      .finally(() => setIsLoading(false))
  }, [])

  const verticals = useMemo(() => Array.from(new Set(runs.map(r => r.vertical))), [runs])
  const modes = useMemo(() => Array.from(new Set(runs.map(r => r.mode))), [runs])

  const filtered = useMemo(() => {
    return runs.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (verticalFilter !== 'all' && r.vertical !== verticalFilter) return false
      if (modeFilter !== 'all' && r.mode !== modeFilter) return false
      if (agencySearch && !(r.agencyName ?? '').toLowerCase().includes(agencySearch.toLowerCase())) return false
      return true
    })
  }, [runs, statusFilter, verticalFilter, modeFilter, agencySearch])

  const sorted = useMemo(() => {
    const copy = [...filtered]
    copy.sort((a, b) => {
      let av: number | string
      let bv: number | string
      if (sortField === 'startedAt') {
        av = new Date(a.startedAt).getTime()
        bv = new Date(b.startedAt).getTime()
      } else if (sortField === 'totalSteps') {
        av = a.totalSteps
        bv = b.totalSteps
      } else if (sortField === 'totalTokens') {
        av = a.totalInputTokens + a.totalOutputTokens
        bv = b.totalInputTokens + b.totalOutputTokens
      } else {
        av = a.agencyName ?? ''
        bv = b.agencyName ?? ''
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return copy
  }, [filtered, sortField, sortDir])

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  // KPIs
  const total = filtered.length
  const completed = filtered.filter(r => r.status === 'completed').length
  const aborted = filtered.filter(r => r.status === 'aborted').length
  const running = filtered.filter(r => r.status === 'running').length
  const avgTokens = total > 0
    ? Math.round(filtered.reduce((sum, r) => sum + r.totalInputTokens + r.totalOutputTokens, 0) / total)
    : 0
  const avgSteps = total > 0
    ? (filtered.reduce((sum, r) => sum + r.totalSteps, 0) / total).toFixed(1)
    : '0'
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
  const errorRate = total > 0 ? Math.round((aborted / total) * 100) : 0

  // Runs-per-day trend (last 14 days of data present in the filtered set)
  const trend = useMemo(() => {
    const byDay = new Map<string, number>()
    for (const r of filtered) {
      const day = new Date(r.startedAt).toISOString().slice(0, 10)
      byDay.set(day, (byDay.get(day) ?? 0) + 1)
    }
    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([day, count]) => ({ day: day.slice(5), count }))
  }, [filtered])

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th
      className="py-2 pr-4 font-medium cursor-pointer select-none hover:text-ink"
      onClick={() => toggleSort(field)}
    >
      {label} {sortField === field && (sortDir === 'asc' ? '↑' : '↓')}
    </th>
  )

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Agent Runs</h1>

      {!isLoading && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
            <KpiCard label="Total runs" value={String(total)} />
            <KpiCard label="Completion rate" value={`${completionRate}%`} sub={`${completed} completed`} />
            <KpiCard label="Error rate" value={`${errorRate}%`} sub={`${aborted} aborted`} />
            <KpiCard label="Running now" value={String(running)} />
            <KpiCard label="Avg tokens/run" value={avgTokens.toLocaleString()} />
            <KpiCard label="Avg steps/run" value={avgSteps} />
          </div>

          {/* Trend chart */}
          {trend.length > 1 && (
            <div className="bg-panel border border-line rounded-xl p-4 mb-5" style={{ height: 180 }}>
              <p className="text-xs text-ink-3 mb-2">Runs per day</p>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#F97316" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-xs border border-line rounded-lg px-2 py-1.5 bg-panel"
            >
              <option value="all">All statuses</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="aborted">Aborted</option>
            </select>
            <select
              value={verticalFilter}
              onChange={e => setVerticalFilter(e.target.value)}
              className="text-xs border border-line rounded-lg px-2 py-1.5 bg-panel"
            >
              <option value="all">All verticals</option>
              {verticals.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <select
              value={modeFilter}
              onChange={e => setModeFilter(e.target.value)}
              className="text-xs border border-line rounded-lg px-2 py-1.5 bg-panel"
            >
              <option value="all">All modes</option>
              {modes.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <input
              type="text"
              value={agencySearch}
              onChange={e => setAgencySearch(e.target.value)}
              placeholder="Search agency..."
              className="text-xs border border-line rounded-lg px-2 py-1.5 bg-panel"
            />
            <span className="text-xs text-ink-3 ml-auto">{sorted.length} of {runs.length} runs</span>
          </div>
        </>
      )}

      {isLoading ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-zinc-500">No runs match these filters.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
              <SortHeader field="agencyName" label="Agency" />
              <th className="py-2 pr-4 font-medium">Vertical</th>
              <th className="py-2 pr-4 font-medium">Mode</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <SortHeader field="totalSteps" label="Steps" />
              <SortHeader field="totalTokens" label="Tokens (in/out)" />
              <th className="py-2 pr-4 font-medium">Duration</th>
              <SortHeader field="startedAt" label="Started" />
            </tr>
          </thead>
          <tbody>
            {sorted.map(run => {
              const dur = durationMs(run)
              return (
                <tr
                  key={run.id}
                  className="border-b border-zinc-100 dark:border-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                >
                  <td className="py-2 pr-4">
                    <Link href={`/internal/runs/${run.id}`} className="hover:underline">
                      {run.agencyName ?? run.agencyId}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{run.vertical}</td>
                  <td className="py-2 pr-4">{run.mode}</td>
                  <td className="py-2 pr-4">
                    <Badge variant={STATUS_VARIANT[run.status]}>{run.status}</Badge>
                    {run.error && <span className="ml-2 text-xs text-red-500">{run.error}</span>}
                  </td>
                  <td className="py-2 pr-4">{run.totalSteps}</td>
                  <td className="py-2 pr-4">
                    {run.totalInputTokens.toLocaleString()} / {run.totalOutputTokens.toLocaleString()}
                  </td>
                  <td className="py-2 pr-4 text-zinc-500">
                    {dur !== null ? `${(dur / 1000).toFixed(1)}s` : '—'}
                  </td>
                  <td className="py-2 pr-4 text-zinc-500">{formatRelativeTime(run.startedAt)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
