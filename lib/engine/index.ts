import { createRun } from './runs'
import { runOrchestrator } from './orchestrator'

export interface EngineInput {
  mode: 'intake' | 'generate'
  agencyId: string
  vertical: string
  scopeId?: string
  sessionToken?: string
  context: Record<string, unknown>
}

export interface EngineResult {
  kind: 'followup' | 'scope_generated' | 'aborted'
  runId: string
  followupQuestion?: string
  readyToComplete?: boolean
  scopeId?: string
  steps: number
  tokensUsed: number
}

export async function runEngine(input: EngineInput): Promise<EngineResult> {
  const runId = await createRun({
    agencyId: input.agencyId,
    scopeId: input.scopeId,
    sessionToken: input.sessionToken,
    vertical: input.vertical,
    mode: input.mode,
  })

  try {
    const result = await runOrchestrator(input, runId)
    return { ...result, runId }
  } catch (err) {
    const { updateRun } = await import('./runs')
    await updateRun(runId, {
      status: 'aborted',
      error: err instanceof Error ? err.message : String(err),
    })
    throw err
  }
}
