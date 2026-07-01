import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agencies, agentRuns, agentSteps } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { isPlatformAdmin } from '@/lib/auth/platform-admin'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!(await isPlatformAdmin(userId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const [run] = await db
    .select({
      id: agentRuns.id,
      agencyId: agentRuns.agencyId,
      agencyName: agencies.name,
      scopeId: agentRuns.scopeId,
      sessionToken: agentRuns.sessionToken,
      vertical: agentRuns.vertical,
      mode: agentRuns.mode,
      status: agentRuns.status,
      kind: agentRuns.kind,
      totalInputTokens: agentRuns.totalInputTokens,
      totalOutputTokens: agentRuns.totalOutputTokens,
      totalSteps: agentRuns.totalSteps,
      error: agentRuns.error,
      startedAt: agentRuns.startedAt,
      completedAt: agentRuns.completedAt,
    })
    .from(agentRuns)
    .leftJoin(agencies, eq(agentRuns.agencyId, agencies.id))
    .where(eq(agentRuns.id, id))
    .limit(1)

  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 })

  const steps = await db
    .select()
    .from(agentSteps)
    .where(eq(agentSteps.runId, id))
    .orderBy(asc(agentSteps.stepIndex))

  return NextResponse.json({ run, steps })
}
