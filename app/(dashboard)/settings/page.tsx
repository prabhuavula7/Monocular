import Link from 'next/link'
import { ChevronRight, Layers } from 'lucide-react'

export default function SettingsPage() {

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-ink">Settings</h1>
        <p className="text-sm text-ink-3 mt-0.5">Configure templates and project type schemas</p>
      </div>

      <div className="space-y-3">
        <Link
          href="/settings/project-types"
          className="flex items-center justify-between bg-panel border border-line rounded-xl px-5 py-4 hover:bg-panel-hover transition-colors panel-shadow group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-dim border border-orange-border flex items-center justify-center">
              <Layers className="w-4 h-4 text-orange" />
            </div>
            <div>
              <p className="text-sm font-medium text-ink">Project Types</p>
              <p className="text-xs text-ink-3 mt-0.5">Manage intake templates and extraction schemas</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-ink-3 group-hover:text-ink transition-colors" />
        </Link>

        <Link
          href="/account"
          className="flex items-center justify-between bg-panel border border-line rounded-xl px-5 py-4 hover:bg-panel-hover transition-colors panel-shadow group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-panel-hover border border-line flex items-center justify-center">
              <ChevronRight className="w-4 h-4 text-ink-3" />
            </div>
            <div>
              <p className="text-sm font-medium text-ink">Org Profile & AI Preferences</p>
              <p className="text-xs text-ink-3 mt-0.5">Org name, tone, rate range, intake defaults</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-ink-3 group-hover:text-ink transition-colors" />
        </Link>
      </div>
    </div>
  )
}
