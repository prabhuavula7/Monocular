import { db } from '@/lib/db'
import { agentRuns, agentSteps } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function createRun(opts: {
  agencyId: string
  scopeId?: string
  sessionToken?: string
  vertical: string
  mode: string
}): Promise<string> {
  const [run] = await db
    .insert(agentRuns)
    .values({
      agencyId: opts.agencyId,
      scopeId: opts.scopeId ?? null,
      sessionToken: opts.sessionToken ?? null,
      vertical: opts.vertical,
      mode: opts.mode,
      status: 'running',
    })
    .returning({ id: agentRuns.id })

  return run.id
}

export async function updateRun(
  runId: string,
  patch: {
    status?: 'running' | 'completed' | 'aborted'
    kind?: string
    totalInputTokens?: number
    totalOutputTokens?: number
    totalSteps?: number
    error?: string
  }
) {
  await db
    .update(agentRuns)
    .set({
      ...patch,
      ...(patch.status !== 'running' ? { completedAt: new Date() } : {}),
    })
    .where(eq(agentRuns.id, runId))
}

export async function recordStep(opts: {
  runId: string
  stepIndex: number
  type: 'model_call' | 'tool_call'
  toolName?: string
  input?: unknown
  output?: unknown
  inputTokens?: number
  outputTokens?: number
  latencyMs?: number
}) {
  await db.insert(agentSteps).values({
    runId: opts.runId,
    stepIndex: opts.stepIndex,
    type: opts.type,
    toolName: opts.toolName ?? null,
    input: (opts.input ?? null) as Parameters<typeof db.insert>[0] extends never ? never : unknown,
    output: (opts.output ?? null) as Parameters<typeof db.insert>[0] extends never ? never : unknown,
    inputTokens: opts.inputTokens ?? 0,
    outputTokens: opts.outputTokens ?? 0,
    latencyMs: opts.latencyMs ?? null,
  })
}
