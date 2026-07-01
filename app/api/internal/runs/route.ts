import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agencies, agentRuns } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { isPlatformAdmin } from '@/lib/auth/platform-admin'

export async function GET() {
  const { userId } = await auth()
  if (!(await isPlatformAdmin(userId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const runs = await db
    .select({
      id: agentRuns.id,
      agencyId: agentRuns.agencyId,
      agencyName: agencies.name,
      scopeId: agentRuns.scopeId,
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
    .orderBy(desc(agentRuns.startedAt))
    .limit(200)

  return NextResponse.json(runs)
}
